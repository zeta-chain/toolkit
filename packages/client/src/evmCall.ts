import GatewayABI from "@zetachain/protocol-contracts/abi/GatewayEVM.sol/GatewayEVM.json";
import { ethers } from "ethers";

import { ZetaChainClient } from "./client";
import type { revertOptions, txOptions } from "./types";

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
    revertOptions: revertOptions;
    txOptions: txOptions;
    types: string[];
    values: any[];
  }
) {
  const signer = this.signer;
  const { utils } = ethers;
  const gatewayEvmAddress = args.gatewayEvm || (await this.getGatewayAddress());
  const gateway = new ethers.Contract(
    gatewayEvmAddress,
    GatewayABI.abi,
    signer
  );

  const valuesArray = args.values.map((value, index) => {
    const type = args.types[index];

    if (type === "bool") {
      try {
        return JSON.parse(value.toLowerCase());
      } catch (e) {
        throw new Error(`Invalid boolean value: ${value}`);
      }
    } else if (type.startsWith("uint") || type.startsWith("int")) {
      return ethers.BigNumber.from(value);
    } else {
      return value;
    }
  });

  const encodedParameters = utils.defaultAbiCoder.encode(
    args.types,
    valuesArray
  );

  const tx = await gateway[
    "call(address,bytes,(address,bool,address,bytes,uint256))"
  ](
    args.receiver,
    encodedParameters,
    {
      abortAddress: "0x0000000000000000000000000000000000000000", // not used
      callOnRevert: args.revertOptions.callOnRevert,
      onRevertGasLimit: args.revertOptions.onRevertGasLimit,
      revertAddress: args.revertOptions.revertAddress,
      revertMessage: utils.hexlify(
        utils.toUtf8Bytes(args.revertOptions.revertMessage)
      ),
    },
    {
      gasLimit: args.txOptions.gasLimit,
      gasPrice: args.txOptions.gasPrice,
    }
  );

  return tx;
};
