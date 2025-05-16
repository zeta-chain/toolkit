import confirm from "@inquirer/confirm";
import { Command, Option } from "commander";
import { ethers, ZeroAddress } from "ethers";
import { z } from "zod";

import { ZetaChainClient } from "../packages/client/src/client";
import { EVMAccountData } from "../types/accounts.types";
import { DEFAULT_ACCOUNT_NAME } from "../types/shared.constants";
import {
  evmAddressSchema,
  evmPrivateKeySchema,
  numericStringSchema,
  validAmountSchema,
} from "../types/shared.schema";
import { getAccountData } from "./accounts";
import { hasSufficientBalanceEvm } from "./balances";
import { getNetworkTypeByChainId, getRpcUrl } from "./chains";
import { printEvmTransactionDetails } from "./formatting";
import { handleError } from "./handleError";

export const baseEvmDepositOptionsSchema = z.object({
  abortAddress: evmAddressSchema,
  amount: validAmountSchema,
  callOnRevert: z.boolean().default(false),
  chainId: numericStringSchema,
  erc20: evmAddressSchema.optional(),
  gasLimit: numericStringSchema.optional(),
  gasPrice: numericStringSchema.optional(),
  gateway: evmAddressSchema.optional(),
  name: z.string().default(DEFAULT_ACCOUNT_NAME),
  onRevertGasLimit: numericStringSchema.default("200000"),
  privateKey: evmPrivateKeySchema.optional(),
  receiver: evmAddressSchema,
  revertAddress: evmAddressSchema.optional(),
  revertMessage: z.string().default(""),
  rpc: z.string().url().optional(),
  yes: z.boolean().default(false),
});

type EvmDepositOptions = z.infer<typeof baseEvmDepositOptionsSchema>;

// Common setup function for both deposit commands
export const setupTransaction = async (options: EvmDepositOptions) => {
  const chainId = parseInt(options.chainId);
  const networkType = getNetworkTypeByChainId(chainId);
  const rpcUrl = options.rpc || getRpcUrl(chainId);

  if (!rpcUrl) {
    handleError({
      context: "Failed to retrieve RPC URL",
      error: new Error("RPC URL not found"),
      shouldThrow: true,
    });
  }

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

  let signer: ethers.Wallet;

  try {
    signer = new ethers.Wallet(privateKey, provider);
  } catch (error) {
    const errorMessage = handleError({
      context: "Failed to create signer from private key",
      error,
      shouldThrow: false,
    });

    throw new Error(errorMessage);
  }

  const client = new ZetaChainClient({ network: networkType, signer });

  const { hasEnoughBalance, balance, decimals } = await hasSufficientBalanceEvm(
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

  return { client, provider, signer };
};

// Common confirmation prompt for transactions
export const confirmTransaction = async (options: EvmDepositOptions) => {
  if (options.yes) {
    console.log("Proceeding with transaction (--yes flag set)");
    return true;
  }

  let confirmed;
  try {
    confirmed = await confirm({
      default: true,
      message: "Proceed with the transaction?",
    });
  } catch (error) {
    handleError({
      context: "Transaction cancelled",
      error,
      shouldThrow: true,
    });
  }

  if (!confirmed) {
    handleError({
      context: "Transaction cancelled",
      error: new Error("Transaction cancelled"),
      shouldThrow: true,
    });
  }

  return confirmed;
};

// Common revert options preparation
export const prepareRevertOptions = (
  options: EvmDepositOptions,
  signer: ethers.Wallet
) => {
  return {
    abortAddress: options.abortAddress,
    callOnRevert: options.callOnRevert,
    onRevertGasLimit: options.onRevertGasLimit,
    revertAddress: options.revertAddress || signer.address,
    revertMessage: options.revertMessage,
  };
};

// Common transaction options preparation
export const prepareTxOptions = (options: EvmDepositOptions) => {
  return {
    gasLimit: options.gasLimit,
    gasPrice: options.gasPrice,
  };
};

// Common command options setup
export const addCommonEvmDepositCommandOptions = (command: Command) => {
  return command
    .requiredOption("--amount <amount>", "Amount of tokens to deposit")
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
    .option("--yes", "Skip confirmation prompt", false);
};
