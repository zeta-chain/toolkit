import confirm from "@inquirer/confirm";
import { getAddress } from "@zetachain/protocol-contracts";
import ZRC20ABI from "@zetachain/protocol-contracts/abi/ZRC20.sol/ZRC20.json";
import { Command, Option } from "commander";
import { ethers, ZeroAddress } from "ethers";
import { ZRC20Contract } from "types/contracts.types";
import { z } from "zod";

import { ZetaChainClient } from "../packages/client/src/client";
import { EVMAccountData } from "../types/accounts.types";
import { DEFAULT_ACCOUNT_NAME } from "../types/shared.constants";
import {
  evmAddressSchema,
  evmPrivateKeySchema,
  hexStringSchema,
  numericStringSchema,
} from "../types/shared.schema";
import { getAccountData } from "./accounts";
import { getRpcUrl } from "./chains";
import { handleError } from "./handleError";
import { toHexString } from "./toHexString";
import { validateAndParseSchema } from "./validateAndParseSchema";

export const baseZetachainOptionsSchema = z.object({
  abortAddress: evmAddressSchema,
  callOnRevert: z.boolean().default(false),
  callOptionsGasLimit: numericStringSchema.default("7000000"),
  callOptionsIsArbitraryCall: z.boolean().default(false),
  gatewayZetachain: evmAddressSchema.optional(),
  name: z.string().default(DEFAULT_ACCOUNT_NAME),
  network: z.enum(["mainnet", "testnet"]).default("testnet"),
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
  txOptionsGasLimit: numericStringSchema.default("7000000"),
  txOptionsGasPrice: numericStringSchema.default("10000000000"),
  yes: z.boolean().default(false),
  zrc20: evmAddressSchema,
});

type BaseZetachainOptions = z.infer<typeof baseZetachainOptionsSchema>;

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

  const rpc = getRpcUrl(options.network === "mainnet" ? 7000 : 7001);

  if (!rpc) {
    handleError({
      context: "Failed to retrieve RPC URL",
      error: new Error("RPC URL not found"),
      shouldThrow: true,
    });
  }

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

  const client = new ZetaChainClient({
    network: options.network,
    signer,
  });

  return { client };
};

/**
 * @description This function is used to get the ZetaChain Gateway address.
 * @param network - The network to use
 * @param gatewayZetachain - The gateway ZetaChain address to use
 * @returns The ZetaChain Gateway address
 */
export const getZevmGatewayAddress = (
  network: "mainnet" | "testnet",
  gatewayZetachain?: string
): string => {
  if (gatewayZetachain) {
    const validatedProvidedAddress = validateAndParseSchema(
      gatewayZetachain,
      evmAddressSchema
    );
    return validatedProvidedAddress;
  }

  const defaultZetaChainGatewayAddress = getAddress(
    "gateway",
    network === "mainnet" ? "zeta_mainnet" : "zeta_testnet"
  );

  const validatedDefaultAddress = validateAndParseSchema(
    defaultZetaChainGatewayAddress,
    evmAddressSchema
  );

  return validatedDefaultAddress;
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
  zrc20: string
) => {
  const contract = new ethers.Contract(
    zrc20,
    ZRC20ABI.abi,
    provider
  ) as ZRC20Contract;
  const zrc20Symbol = await contract.symbol();
  const [gasZRC20, gasFee] = await contract.withdrawGasFee();
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
    .requiredOption("--zrc20 <address>", "The address of ZRC-20 to pay fees")
    .requiredOption(
      "--receiver <address>",
      "The address of the receiver contract on a connected chain. Non-hex strings will be automatically encoded to hex."
    )
    .addOption(
      new Option("--name <name>", "Account name")
        .default(DEFAULT_ACCOUNT_NAME)
        .conflicts(["private-key"])
    )
    .addOption(
      new Option("--network <network>", "Network to use")
        .choices(["mainnet", "testnet"])
        .default("testnet")
    )
    .addOption(
      new Option(
        "--private-key <key>",
        "Private key for signing transactions"
      ).conflicts(["name"])
    )
    .option(
      "--gateway-zetachain <address>",
      "Gateway contract address on ZetaChain"
    )
    .option("--revert-address <address>", "Revert address", ZeroAddress)
    .option("--abort-address <address>", "Abort address", ZeroAddress)
    .option("--call-on-revert", "Whether to call on revert", false)
    .option(
      "--on-revert-gas-limit <limit>",
      "Gas limit for the revert transaction",
      "7000000"
    )
    .option("--revert-message <message>", "Revert message", "0x")
    .option(
      "--tx-options-gas-limit <limit>",
      "Gas limit for the transaction",
      "7000000"
    )
    .option(
      "--tx-options-gas-price <price>",
      "Gas price for the transaction",
      "10000000000"
    )
    .option(
      "--call-options-gas-limit <limit>",
      "Gas limit for the call",
      "7000000"
    )
    .option("--call-options-is-arbitrary-call", "Call any function", false)
    .option("--yes", "Skip confirmation prompt", false);
};
