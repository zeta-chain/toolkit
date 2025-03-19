import GatewayABI from "@zetachain/protocol-contracts/abi/GatewayEVM.sol/GatewayEVM.json";
import { AbiCoder, ethers } from "ethers";

import {
  GatewayContract,
  RevertOptions,
  TxOptions,
} from "../../../types/contracts.types";
import { ParseAbiValuesReturnType } from "../../../types/parseAbiValues.types";
import { toHexString } from "../../../utils";
import { ZetaChainClient } from "./client";

/**
 * @function evmCall
 * @description Calls a universal app contract on ZetaChain.
 *
 * @param {ZetaChainClient} this - The instance of the ZetaChain client that contains the signer information.
 * @param {object} args - The function arguments.
 * @param {string} args.gatewayEvm - The address of the EVM gateway contract.
 * @param {string} args.receiver - The address of the target contract or account to call on the EVM chain.
 * @param {string} args.types - JSON string representing the types of the function parameters (e.g., ["uint256", "address"]).
 * @param {Array} args.values - The values to be passed to the function (should match the types).
 * @param {txOptions} args.txOptions - Transaction options such as gasLimit, gasPrice, etc.
 * @param {revertOptions} args.revertOptions - Options to handle call reversion, including revert address, message, and gas limit for the revert scenario.
 *
 * @returns {object} - Returns the transaction object.
 * @property {object} tx - The transaction object that represents the function call.
 */

export const evmCall = async function (
  this: ZetaChainClient,
  args: {
    gatewayEvm?: string;
    receiver: string;
    revertOptions: RevertOptions;
    txOptions: TxOptions;
    types: string[];
    values: ParseAbiValuesReturnType;
  }
) {
  const signer = this.signer;
  const gatewayEvmAddress = args.gatewayEvm || (await this.getGatewayAddress());
  const gateway = new ethers.Contract(
    gatewayEvmAddress,
    GatewayABI.abi,
    signer
  ) as GatewayContract;

  const abiCoder = AbiCoder.defaultAbiCoder();
  const encodedParameters = abiCoder.encode(args.types, args.values);

  const callAbiSignature =
    "call(address,bytes,(address,bool,address,bytes,uint256))";
  const gatewayCallFunction = gateway[
    callAbiSignature
  ] as GatewayContract["call"];

  const tx = await gatewayCallFunction(
    args.receiver,
    encodedParameters,
    {
      abortAddress: "0x0000000000000000000000000000000000000000", // not used
      callOnRevert: args.revertOptions.callOnRevert,
      onRevertGasLimit: args.revertOptions.onRevertGasLimit,
      revertAddress: args.revertOptions.revertAddress,
      revertMessage: toHexString(args.revertOptions.revertMessage),
    },
    {
      gasLimit: args.txOptions.gasLimit,
      gasPrice: args.txOptions.gasPrice,
    }
  );

  return tx;
};
