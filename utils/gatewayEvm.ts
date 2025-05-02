import { AbiCoder, ethers } from "ethers";

import { RevertOptions, TxOptions } from "../types/contracts.types";
import { ParseAbiValuesReturnType } from "../types/parseAbiValues.types";
import { toHexString } from "./toHexString";

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

/**
 * Gateway ABI fragments for common functions
 */
const GATEWAY_FRAGMENTS = {
  call: "function call(address receiver, bytes data, tuple(address revertAddress, bool callOnRevert, address abortAddress, bytes revertMessage, uint256 onRevertGasLimit) revertOptions)",
  deposit:
    "function deposit(address receiver, tuple(address revertAddress, bool callOnRevert, address abortAddress, bytes revertMessage, uint256 onRevertGasLimit) revertOptions)",
  depositAndCall:
    "function depositAndCall(address receiver, bytes data, tuple(address revertAddress, bool callOnRevert, address abortAddress, bytes revertMessage, uint256 onRevertGasLimit) revertOptions)",
  depositAndCallERC20:
    "function depositAndCall(address receiver, uint256 amount, address asset, bytes data, tuple(address revertAddress, bool callOnRevert, address abortAddress, bytes revertMessage, uint256 onRevertGasLimit) revertOptions)",
  depositERC20:
    "function deposit(address receiver, uint256 amount, address asset, tuple(address revertAddress, bool callOnRevert, address abortAddress, bytes revertMessage, uint256 onRevertGasLimit) revertOptions)",
};

/**
 * Generates calldata for a specific gateway method
 */
export const generateGatewayCallData = (
  methodName: keyof typeof GATEWAY_FRAGMENTS,
  args: unknown[]
): string => {
  const fragment = GATEWAY_FRAGMENTS[methodName];
  const iface = new ethers.Interface([fragment]);

  // The method name from the fragment (before the opening parenthesis)
  // Extract the function name from the ABI fragment by parsing the string
  // Example: from "function deposit(address receiver, ...)" we extract "deposit"
  const [, functionSignature] = fragment.split(" ");
  const [functionName] = functionSignature.split("(");

  try {
    return iface.encodeFunctionData(functionName, args);
  } catch (error) {
    console.error(`Error encoding calldata for ${methodName}:`, error);
    throw error;
  }
};

/**
 * Prepares a gateway transaction for broadcasting
 */
export const prepareGatewayTx = (
  gatewayAddress: string,
  methodName: keyof typeof GATEWAY_FRAGMENTS,
  args: unknown[],
  value?: string
): {
  data: string;
  to: string;
  value?: string;
} => {
  const data = generateGatewayCallData(methodName, args);

  return {
    data,
    to: gatewayAddress,
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
  to: string;
  value?: string;
} => {
  const abiCoder = AbiCoder.defaultAbiCoder();
  const encodedParameters = abiCoder.encode(args.types, args.values);
  const revertData = createRevertData(args.revertOptions);

  return prepareGatewayTx(args.gatewayEvm, "call", [
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
  to: string;
  value?: string;
} => {
  const revertData = createRevertData(args.revertOptions);

  if (args.erc20) {
    const decimals = args.decimals || 18; // Default to 18 if not specified
    const value = ethers.parseUnits(args.amount, decimals);

    return prepareGatewayTx(args.gatewayEvm, "depositERC20", [
      args.receiver,
      value,
      args.erc20,
      revertData,
    ]);
  } else {
    const value = ethers.parseEther(args.amount);

    return prepareGatewayTx(
      args.gatewayEvm,
      "deposit",
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
  to: string;
  value?: string;
} => {
  const abiCoder = AbiCoder.defaultAbiCoder();
  const encodedParameters = abiCoder.encode(args.types, args.values);
  const revertData = createRevertData(args.revertOptions);

  const decimals = args.decimals || 18; // Default to 18 if not specified

  if (args.erc20) {
    const value = ethers.parseUnits(args.amount, decimals);

    return prepareGatewayTx(args.gatewayEvm, "depositAndCallERC20", [
      args.receiver,
      value,
      args.erc20,
      encodedParameters,
      revertData,
    ]);
  } else {
    const value = ethers.parseEther(args.amount);

    return prepareGatewayTx(
      args.gatewayEvm,
      "depositAndCall",
      [args.receiver, encodedParameters, revertData],
      value.toString()
    );
  }
};

/**
 * Broadcasts a gateway transaction
 */
export const broadcastGatewayTx = async (
  signer: ethers.Signer,
  txData: {
    data: string;
    to: string;
    value?: string;
  },
  txOptions: TxOptions
): Promise<ethers.ContractTransactionResponse> => {
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
