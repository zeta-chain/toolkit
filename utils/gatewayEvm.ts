import GatewayEvmAbi from "@zetachain/protocol-contracts/abi/GatewayEVM.sol/GatewayEVM.json";
import { AbiCoder, ethers, InterfaceAbi } from "ethers";

import { RevertOptions, TxOptions } from "../types/contracts.types";
import { ParseAbiValuesReturnType } from "../types/parseAbiValues.types";
import { toHexString } from "./toHexString";

/**
 * Available gateway method names
 */
type GatewayMethodName =
  | "call"
  | "depositNative"
  | "depositAndCallNative"
  | "depositErc20"
  | "depositAndCallErc20";

/**
 * Creates a revert data object from revert options
 */
export const createRevertData = (
  revertOptions: RevertOptions
): RevertOptions => {
  return {
    ...revertOptions,
    revertMessage: toHexString(revertOptions.revertMessage),
  };
};

// Interface for gateway contract using the imported ABI
const gatewayInterface = new ethers.Interface(
  GatewayEvmAbi.abi as InterfaceAbi
);

/**
 * Retrieves a function fragment from the gateway interface by its name and optional input parameter name.
 *
 * @param {string} methodName - The name of the function to find in the gateway interface
 * @returns {ethers.FunctionFragment[]} The function fragments from the gateway interface
 * @throws {Error} Throws an error if the function is not found in the gateway interface
 */
export const getGatewayFunctionsByName = (
  methodName: string
): ethers.FunctionFragment[] => {
  const gatewayInterfaceFragments =
    gatewayInterface.fragments as ethers.FunctionFragment[];

  const matchingFunctions = gatewayInterfaceFragments.filter(
    (fragment) => fragment.type === "function" && fragment.name === methodName
  );

  return matchingFunctions;
};

/**
 * Retrieves function signatures from the gateway interface
 * @returns The requested function signature
 */
export const getGatewayFunctionSignatureByName = (
  methodName: GatewayMethodName
): ethers.FunctionFragment | undefined => {
  // Get functions by type
  const callFunctions = getGatewayFunctionsByName("call");
  const depositFunctions = getGatewayFunctionsByName("deposit");
  const depositAndCallFunctions = getGatewayFunctionsByName("depositAndCall");

  // Map of function signatures
  // Native token functions (without asset parameter)
  // ERC20 token functions (with asset parameter)
  const signatures = {
    call: callFunctions[0],

    depositAndCallErc20: depositAndCallFunctions.find((f) =>
      f.inputs.some((i) => i.name === "asset")
    ),

    depositAndCallNative: depositAndCallFunctions.find((f) =>
      f.inputs.every((i) => i.name !== "asset")
    ),

    depositErc20: depositFunctions.find((f) =>
      f.inputs.some((i) => i.name === "asset")
    ),
    depositNative: depositFunctions.find((f) =>
      f.inputs.every((i) => i.name !== "asset")
    ),
  };

  return signatures[methodName];
};

/**
 * Generates calldata for a specific gateway method
 */
export const generateGatewayCallData = (
  methodName: GatewayMethodName,
  args: unknown[]
): string => {
  try {
    const signature = getGatewayFunctionSignatureByName(methodName);

    if (!signature) {
      throw new Error(`Invalid method name: ${methodName}`);
    }

    const encodedData = gatewayInterface.encodeFunctionData(signature, args);

    return encodedData;
  } catch (error) {
    console.error(`Error encoding calldata for ${methodName}:`, error);
    throw error;
  }
};

/**
 * Prepares a gateway transaction for broadcasting
 */
export const prepareGatewayTx = (
  methodName: GatewayMethodName,
  args: unknown[],
  value?: string
): {
  data: string;
  value?: string;
} => {
  const gatewayCallData = generateGatewayCallData(methodName, args);

  return {
    data: gatewayCallData,
    ...(value ? { value } : {}),
  };
};

/**
 * Generates calldata for EVM call without broadcasting the transaction
 */
export const generateEvmCallData = (args: {
  gatewayEvm: string;
  receiver: string;
  revertOptions: RevertOptions;
  types: string[];
  values: ParseAbiValuesReturnType;
}): {
  data: string;
  value?: string;
} => {
  const abiCoder = AbiCoder.defaultAbiCoder();
  const encodedParameters = abiCoder.encode(args.types, args.values);
  const revertData = createRevertData(args.revertOptions);

  return prepareGatewayTx("call", [
    args.receiver,
    encodedParameters,
    revertData,
  ]);
};

/**
 * Generates calldata for EVM deposit without broadcasting the transaction
 */
export const generateEvmDepositData = (args: {
  amount: string;
  decimals?: number;
  erc20?: string;
  gatewayEvm: string;
  receiver: string;
  revertOptions: RevertOptions;
}): {
  data: string;
  value?: string;
} => {
  const revertData = createRevertData(args.revertOptions);

  if (args.erc20) {
    const decimals = args.decimals || 18; // Default to 18 if not specified
    const value = ethers.parseUnits(args.amount, decimals);

    return prepareGatewayTx("depositErc20", [
      args.receiver,
      value,
      args.erc20,
      revertData,
    ]);
  } else {
    const value = ethers.parseEther(args.amount);

    return prepareGatewayTx(
      "depositNative",
      [args.receiver, revertData],
      value.toString()
    );
  }
};

/**
 * Generates calldata for EVM deposit and call without broadcasting the transaction
 */
export const generateEvmDepositAndCallData = (args: {
  amount: string;
  decimals?: number;
  erc20?: string;
  gatewayEvm: string;
  receiver: string;
  revertOptions: RevertOptions;
  types: string[];
  values: ParseAbiValuesReturnType;
}): {
  data: string;
  value?: string;
} => {
  const abiCoder = AbiCoder.defaultAbiCoder();
  const encodedParameters = abiCoder.encode(args.types, args.values);
  const revertData = createRevertData(args.revertOptions);

  const decimals = args.decimals || 18; // Default to 18 if not specified

  if (args.erc20) {
    const value = ethers.parseUnits(args.amount, decimals);

    return prepareGatewayTx("depositAndCallErc20", [
      args.receiver,
      value,
      args.erc20,
      encodedParameters,
      revertData,
    ]);
  } else {
    const value = ethers.parseEther(args.amount);

    return prepareGatewayTx(
      "depositAndCallNative",
      [args.receiver, encodedParameters, revertData],
      value.toString()
    );
  }
};

interface BroadcastGatewayTxArgs {
  signer: ethers.Signer;
  txData: {
    data: string;
    to: string;
    value?: string;
  };
  txOptions: TxOptions;
}

/**
 * Broadcasts a gateway transaction
 */
export const broadcastGatewayTx = async ({
  signer,
  txData,
  txOptions,
}: BroadcastGatewayTxArgs): Promise<ethers.ContractTransactionResponse> => {
  const options = {
    data: txData.data,
    gasLimit: txOptions.gasLimit,
    gasPrice: txOptions.gasPrice,
    to: txData.to,
    ...(txData.value ? { value: txData.value } : {}),
  };

  // Send the raw transaction
  return signer.sendTransaction(
    options
  ) as Promise<ethers.ContractTransactionResponse>;
};
