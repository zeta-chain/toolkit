import { RevertOptions, TxOptions } from "../../../types/contracts.types";
import { ParseAbiValuesReturnType } from "../../../types/parseAbiValues.types";
import {
  broadcastGatewayTx,
  generateEvmCallData,
} from "../../../utils/gatewayEvm";
import { validateSigner } from "../../../utils/validateSigner";
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
  const signer = validateSigner(this.signer);
  const gatewayEvmAddress = args.gatewayEvm || (await this.getGatewayAddress());

  const callData = generateEvmCallData({
    receiver: args.receiver,
    revertOptions: args.revertOptions,
    types: args.types,
    values: args.values,
  });

  const tx = await broadcastGatewayTx({
    signer,
    txData: {
      data: callData.data,
      to: gatewayEvmAddress,
    },
    txOptions: args.txOptions,
  });

  return tx;
};
