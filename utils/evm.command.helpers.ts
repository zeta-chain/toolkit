import confirm from "@inquirer/confirm";
import { Command, Option } from "commander";
import { ethers, ZeroAddress } from "ethers";
import { z } from "zod";

import { EVMAccountData } from "../types/accounts.types";
import { DEFAULT_ACCOUNT_NAME } from "../types/shared.constants";
import {
  evmAddressSchema,
  evmPrivateKeySchema,
  numericStringSchema,
} from "../types/shared.schema";
import { getAccountData } from "./getAccountData";
import { hasSufficientBalanceEvm } from "./balances";
import { getRpcUrl } from "./chains";
import { handleError } from "./handleError";

export const baseEvmOptionsSchema = z.object({
  abortAddress: evmAddressSchema,
  callOnRevert: z.boolean().default(false),
  chainId: numericStringSchema.optional(),
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

type BaseEvmOptions = z.infer<typeof baseEvmOptionsSchema>;

// Common setup function for both deposit commands
export const setupEvmTransaction = (options: BaseEvmOptions) => {
  let rpcUrl: string;
  if (options.rpc) {
    rpcUrl = options.rpc;
  } else if (options.chainId) {
    rpcUrl = getRpcUrl(parseInt(options.chainId));
  } else {
    handleError({
      context: "Failed to retrieve RPC URL",
      error: new Error("RPC URL or chain ID is required"),
      shouldThrow: true,
    });
    process.exit(1);
  }

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

  return { provider, signer };
};

export const checkSufficientEvmBalance = async (
  provider: ethers.JsonRpcProvider,
  signer: ethers.Wallet,
  amount: string,
  erc20?: string
) => {
  const { hasEnoughBalance, balance, decimals } = await hasSufficientBalanceEvm(
    provider,
    signer,
    amount,
    erc20
  );

  if (!hasEnoughBalance) {
    handleError({
      context: "Insufficient balance",
      error: new Error(
        `Required: ${amount}, Available: ${ethers.formatUnits(
          balance,
          decimals
        )}`
      ),
      shouldThrow: true,
    });
  }
};

export const confirmEvmTransaction = async (options: BaseEvmOptions) => {
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
      context: "Failed to confirm transaction",
      error,
      shouldThrow: false,
    });

    return false; // treat as “not confirmed”
  }

  if (!confirmed) {
    handleError({
      error: new Error("Transaction cancelled"),
      shouldThrow: false,
    });

    return false; // treat as “not confirmed”
  }

  return confirmed;
};

// Common revert options preparation
export const prepareRevertOptions = (
  options: BaseEvmOptions,
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
export const prepareTxOptions = (options: BaseEvmOptions) => {
  return {
    gasLimit: options.gasLimit,
    gasPrice: options.gasPrice,
  };
};

export const addCommonEvmCommandOptions = (command: Command) => {
  return command
    .option("--chain-id <chainId>", "Chain ID of the network")
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
    .option("--gateway <address>", "EVM Gateway address")
    .option(
      "--revert-address <address>",
      "Address to revert to in case of failure (default: signer address)"
    )
    .option(
      "--abort-address <address>",
      `Address to receive funds if aborted`,
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
