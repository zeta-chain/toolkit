import confirm from "@inquirer/confirm";
import ZRC20ABI from "@zetachain/protocol-contracts/abi/ZRC20.sol/ZRC20.json";
import { Command, Option } from "commander";
import { ethers, ZeroAddress } from "ethers";
import { ZRC20Contract } from "types/contracts.types";
import { z } from "zod";

import { EVMAccountData } from "../types/accounts.types";
import { DEFAULT_ACCOUNT_NAME } from "../types/shared.constants";
import {
  evmAddressSchema,
  evmPrivateKeySchema,
  hexStringSchema,
  numericStringSchema,
  rpcOrChainIdRefineRule,
} from "../types/shared.schema";
import { getAccountData } from "./accounts";
import { getRpcUrl } from "./chains";
import { handleError } from "./handleError";
import { toHexString } from "./toHexString";

export const baseZetachainOptionsSchema = z.object({
  abortAddress: evmAddressSchema,
  callOnRevert: z.boolean().default(false),
  callOptionsGasLimit: numericStringSchema.default("7000000"),
  callOptionsIsArbitraryCall: z.boolean().default(false),
  chainId: z.string().optional(),
  gateway: evmAddressSchema.optional(),
  name: z.string().default(DEFAULT_ACCOUNT_NAME),
  onRevertGasLimit: numericStringSchema.default("7000000"),
  privateKey: evmPrivateKeySchema.optional(),
  receiver: z.string().transform((val) => {
    // If it's already a valid hex string, return it as is
    if (hexStringSchema.safeParse(val).success) {
      return val;
    }
    // Otherwise, convert it to a hex representation of its UTF-8 bytes
    return toHexString(val);
  }),
  revertAddress: evmAddressSchema,
  revertMessage: z.string().default("0x"),
  rpc: z.string().optional(),
  txOptionsGasLimit: numericStringSchema.default("7000000"),
  txOptionsGasPrice: numericStringSchema.default("10000000000"),
  yes: z.boolean().default(false),
  zrc20: evmAddressSchema,
});

export const baseZetachainOptionsRefined = baseZetachainOptionsSchema.refine(
  rpcOrChainIdRefineRule.rule,
  {
    message: rpcOrChainIdRefineRule.message,
  }
);

type BaseZetachainOptions = z.infer<typeof baseZetachainOptionsRefined>;

export const setupZetachainTransaction = (options: BaseZetachainOptions) => {
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

  const rpc = options.rpc || getRpcUrl(parseInt(options.chainId!));

  const provider = new ethers.JsonRpcProvider(rpc);

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

  return { signer };
};

export const confirmZetachainTransaction = async (
  options: BaseZetachainOptions
) => {
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

    return false; // treat as "not confirmed"
  }

  if (!confirmed) {
    handleError({
      error: new Error("Transaction cancelled"),
      shouldThrow: false,
    });

    return false; // treat as "not confirmed"
  }

  return confirmed;
};

// Common revert options preparation
export const prepareRevertOptions = (options: BaseZetachainOptions) => {
  return {
    abortAddress: options.abortAddress,
    callOnRevert: options.callOnRevert,
    onRevertGasLimit: options.onRevertGasLimit,
    revertAddress: options.revertAddress,
    revertMessage: options.revertMessage,
  };
};

// Common transaction options preparation
export const prepareTxOptions = (options: BaseZetachainOptions) => {
  return {
    gasLimit: options.txOptionsGasLimit,
    gasPrice: options.txOptionsGasPrice,
  };
};

// Common call options preparation
export const prepareCallOptions = (options: BaseZetachainOptions) => {
  return {
    gasLimit: options.callOptionsGasLimit,
    isArbitraryCall: options.callOptionsIsArbitraryCall,
  };
};

export const getZRC20WithdrawFee = async (
  provider: ethers.ContractRunner,
  zrc20: string,
  gasLimit?: string
): Promise<{
  gasFee: string;
  gasSymbol: string;
  gasZRC20: string;
  zrc20Symbol: string;
}> => {
  const contract = new ethers.Contract(
    zrc20,
    ZRC20ABI.abi,
    provider
  ) as ZRC20Contract;
  let gasZRC20: string;
  let gasFee: bigint;
  const zrc20Symbol = await contract.symbol();
  if (gasLimit) {
    [gasZRC20, gasFee] = await contract.withdrawGasFeeWithGasLimit(gasLimit);
  } else {
    [gasZRC20, gasFee] = await contract.withdrawGasFee();
  }
  const gasContract = new ethers.Contract(
    gasZRC20,
    ZRC20ABI.abi,
    provider
  ) as ZRC20Contract;
  const decimals = await gasContract.decimals();
  const gasSymbol = await gasContract.symbol();
  const gasFeeFormatted = ethers.formatUnits(gasFee, decimals);
  return { gasFee: gasFeeFormatted, gasSymbol, gasZRC20, zrc20Symbol };
};

export const addCommonZetachainCommandOptions = (command: Command) => {
  return command
    .requiredOption(
      "--zrc20 <address>",
      "ZRC-20 token address to pay cross-chain fees"
    )
    .requiredOption(
      "--receiver <address>",
      "Receiver contract address on the connected chain (non-hex strings will be encoded)"
    )
    .addOption(
      new Option("--name <name>", "Account name")
        .default(DEFAULT_ACCOUNT_NAME)
        .conflicts(["private-key"])
    )
    .addOption(
      new Option("--chain-id <chainId>", "Chain ID of the destination network")
    )
    .addOption(
      new Option(
        "--private-key <key>",
        "Private key for signing transactions"
      ).conflicts(["name"])
    )
    .addOption(new Option("--rpc <url>", "ZetaChain RPC URL"))
    .option("--gateway <address>", "Gateway contract address on ZetaChain")
    .option(
      "--revert-address <address>",
      "Address to receive tokens if the transaction reverts",
      ZeroAddress
    )
    .option(
      "--abort-address <address>",
      "Address to receive tokens if transaction isaborted",
      ZeroAddress
    )
    .option(
      "--call-on-revert",
      "Call onRevert handler if the transaction fails",
      false
    )
    .option(
      "--on-revert-gas-limit <limit>",
      "Gas limit for the revert transaction",
      "1000000"
    )
    .option(
      "--revert-message <message>",
      "Message to include in the revert call ",
      "0x"
    )
    .option(
      "--tx-options-gas-limit <limit>",
      "Gas limit for the transaction",
      "1000000"
    )
    .option(
      "--tx-options-gas-price <price>",
      "Gas price for the transaction",
      "10000000000"
    )
    .option(
      "--call-options-gas-limit <limit>",
      "Gas limit for the contract call on the connected chain",
      "1000000"
    )
    .option(
      "--call-options-is-arbitrary-call",
      "Call any function (--function is required)",
      false
    )
    .option("--yes", "Skip confirmation prompt", false);
};
