import confirm from "@inquirer/confirm";
import { Command, Option } from "commander";
import { ethers, ZeroAddress } from "ethers";
import { z } from "zod";

import { EVMAccountData } from "../../../../types/accounts.types";
import { DEFAULT_ACCOUNT_NAME } from "../../../../types/shared.constants";
import {
  evmAddressSchema,
  evmPrivateKeySchema,
  numericStringSchema,
  validAmountSchema,
} from "../../../../types/shared.schema";
import { handleError, printEvmTransactionDetails } from "../../../../utils";
import { getAccountData } from "../../../../utils/accounts";
import { hasSufficientBalanceEvm } from "../../../../utils/balances";
import { getRpcUrl } from "../../../../utils/chains";
import { ZetaChainClient } from "../../../client/src/client";

const depositOptionsSchema = z
  .object({
    abortAddress: evmAddressSchema,
    amount: validAmountSchema,
    callOnRevert: z.boolean().default(false),
    chainId: numericStringSchema,
    erc20: evmAddressSchema.optional(),
    gasLimit: numericStringSchema.optional(),
    gasPrice: numericStringSchema.optional(),
    gateway: evmAddressSchema.optional(),
    name: z.string().default(DEFAULT_ACCOUNT_NAME),
    network: z.enum(["mainnet", "testnet"]).default("testnet"),
    onRevertGasLimit: numericStringSchema.default("200000"),
    privateKey: evmPrivateKeySchema.optional(),
    receiver: evmAddressSchema,
    revertAddress: evmAddressSchema.optional(),
    revertMessage: z.string().default(""),
    rpc: z.string().url().optional(),
    yes: z.boolean().default(false),
  })
  .refine((data) => !(data.privateKey && data.name !== DEFAULT_ACCOUNT_NAME), {
    message: "Only one of --name or --private-key should be provided",
    path: ["name", "privateKey"],
  });

type DepositOptions = z.infer<typeof depositOptionsSchema>;

const main = async (options: DepositOptions) => {
  try {
    const chainId = parseInt(options.chainId);
    const networkType = options.network;
    const rpcUrl = options.rpc || getRpcUrl(chainId);
    const provider = new ethers.JsonRpcProvider(rpcUrl);

    const privateKey =
      options.privateKey ||
      getAccountData<EVMAccountData>("evm", options.name)?.privateKey;

    if (!privateKey) {
      const errorMessage = handleError({
        context: "Failed to retrieve private key",
        error: new Error("Private key not found"),
        shouldThrow: false,
      });

      throw new Error(errorMessage);
    }

    const { success: isPrivateKeyValid, data: parsedPrivateKey } =
      evmPrivateKeySchema.safeParse(privateKey);

    if (!isPrivateKeyValid) {
      const errorMessage = handleError({
        context: "Invalid private key",
        error: new Error("Private key is invalid"),
        shouldThrow: false,
      });

      throw new Error(errorMessage);
    }

    let signer: ethers.Wallet;
    try {
      signer = new ethers.Wallet(parsedPrivateKey, provider);
    } catch (error) {
      const errorMessage = handleError({
        context: "Failed to create signer from private key",
        error,
        shouldThrow: false,
      });

      throw new Error(errorMessage);
    }

    const client = new ZetaChainClient({ network: networkType, signer });

    const { hasEnoughBalance, balance, decimals } =
      await hasSufficientBalanceEvm(
        provider,
        signer,
        options.amount,
        options.erc20
      );

    if (!hasEnoughBalance) {
      handleError({
        context: "Insufficient balance",
        error: new Error(
          `Required: ${options.amount}, Available: ${ethers.formatUnits(
            balance,
            decimals
          )}`
        ),
        shouldThrow: true,
      });
    }

    await printEvmTransactionDetails(signer, chainId, {
      amount: options.amount,
      callOnRevert: options.callOnRevert,
      erc20: options.erc20,
      onRevertGasLimit: options.onRevertGasLimit,
      receiver: options.receiver,
      revertMessage: options.revertMessage,
    });

    if (options.yes) {
      console.log("Proceeding with transaction (--yes flag set)");
    } else {
      let confirmed;
      try {
        confirmed = await confirm({
          default: true,
          message: "Proceed with the transaction?",
        });
      } catch (error) {
        console.log("\nTransaction cancelled");
        process.exit(0);
      }

      if (!confirmed) {
        console.log("\nTransaction cancelled");
        process.exit(0);
      }
    }

    const tx = await client.evmDeposit({
      amount: options.amount,
      erc20: options.erc20,
      receiver: options.receiver,
      revertOptions: {
        callOnRevert: options.callOnRevert,
        onRevertGasLimit: options.onRevertGasLimit,
        revertAddress: options.revertAddress || signer.address,
        revertMessage: options.revertMessage,
      },
      txOptions: {
        gasLimit: options.gasLimit,
        gasPrice: options.gasPrice,
      },
    });
    console.log("Transaction hash:", tx.hash);
  } catch (error) {
    handleError({
      context: "Error depositing to EVM",
      error,
      shouldThrow: false,
    });
    process.exit(1);
  }
};

export const depositCommand = new Command("deposit")
  .description("Deposit tokens to ZetaChain from an EVM-compatible chain")
  .requiredOption("--amount <amount>", "Amount of tokens to deposit")
  .addOption(
    new Option("--network <network>", "Network to use")
      .choices(["mainnet", "testnet"])
      .default("testnet")
  )
  .requiredOption("--chain-id <chainId>", "Chain ID of the network")
  .requiredOption("--receiver <address>", "Receiver address on ZetaChain")
  .addOption(
    new Option("--name <name>", "Account name")
      .default(DEFAULT_ACCOUNT_NAME)
      .conflicts(["private-key"])
  )
  .addOption(
    new Option(
      "--private-key <key>",
      "Private key for signing transactions"
    ).conflicts(["name"])
  )
  .option("--rpc <url>", "RPC URL for the source chain")
  .option(
    "--erc20 <address>",
    "ERC20 token address (optional for native token deposits)"
  )
  .option("--gateway <address>", "EVM Gateway address")
  .option(
    "--revert-address <address>",
    "Address to revert to in case of failure (default: signer address)"
  )
  .option(
    "--abort-address <address>",
    `Address to receive funds if aborted (default: ${ZeroAddress})`,
    ZeroAddress
  )
  .option(
    "--call-on-revert",
    "Whether to call revert address on failure",
    false
  )
  .option(
    "--on-revert-gas-limit <limit>",
    "Gas limit for revert operation",
    "200000"
  )
  .option("--revert-message <message>", "Message to include in revert", "")
  .option("--gas-limit <limit>", "Gas limit for the transaction")
  .option("--gas-price <price>", "Gas price for the transaction")
  .option("--yes", "Skip confirmation prompt", false)
  .action(async (options) => {
    const validatedOptions = depositOptionsSchema.parse(options);
    await main(validatedOptions);
  });
