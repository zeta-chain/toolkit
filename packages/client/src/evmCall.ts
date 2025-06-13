import { z } from "zod";

import { RevertOptions } from "../../../types/contracts.types";
import {
  bigNumberStringSchema,
  evmAddressSchema,
  stringArraySchema,
} from "../../../types/shared.schema";
import { validateAndParseSchema } from "../../../utils";
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
const evmCallClientArgsSchema = z.object({
  gatewayEvm: evmAddressSchema.optional(),
  receiver: evmAddressSchema,
  revertOptions: z.object({
    abortAddress: evmAddressSchema,
    callOnRevert: z.boolean().optional(),
    onRevertGasLimit: bigNumberStringSchema,
    revertAddress: evmAddressSchema,
    revertMessage: z.string(),
  }),
  txOptions: z.object({
    gasLimit: bigNumberStringSchema,
    gasPrice: bigNumberStringSchema,
  }),
  types: stringArraySchema, // e.g. ["string", "uint256"]
  values: z.array(z.string()).min(1, "At least one value is required"),
});

type EvmCallClientArgs = z.infer<typeof evmCallClientArgsSchema>;

export const evmCall = async function (this: ZetaChainClient, args: unknown) {
  const parsedArgs: EvmCallClientArgs = validateAndParseSchema(
    args,
    evmCallClientArgsSchema
  );

  const signer = validateSigner(this.signer);
  const gatewayEvmAddress =
    parsedArgs.gatewayEvm || (await this.getGatewayAddress());

  const callData = generateEvmCallData({
    receiver: parsedArgs.receiver,
    revertOptions: parsedArgs.revertOptions as RevertOptions,
    types: parsedArgs.types,
    values: parsedArgs.values,
  });

  const tx = await broadcastGatewayTx({
    signer,
    txData: {
      data: callData.data,
      to: gatewayEvmAddress,
    },
    txOptions: parsedArgs.txOptions,
  });

  return tx;
};
