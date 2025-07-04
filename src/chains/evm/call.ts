import { z } from "zod";

import {
  broadcastGatewayTx,
  generateEvmCallData,
} from "../../../utils/gatewayEvm";
import { getGatewayAddressFromSigner } from "../../../utils/getAddress";
import { validateAndParseSchema } from "../../../utils/validateAndParseSchema";
import { evmCallParamsSchema, evmOptionsSchema } from "../../schemas/evm";

type evmCallParams = z.infer<typeof evmCallParamsSchema>;
type evmOptions = z.infer<typeof evmOptionsSchema>;

/**
 * Makes a cross-chain call from an EVM chain to a universal contract on ZetaChain.
 *
 * This function allows you to call a contract function on a destination EVM chain
 * without transferring any tokens. It's useful for executing contract logic
 * across different chains.
 *
 * @param params - The call parameters including receiver address, function types/values, and revert options
 * @param options - Configuration options including signer and optional gateway address
 * @returns Promise that resolves to the transaction receipt
 */
export const evmCall = async (params: evmCallParams, options: evmOptions) => {
  const validatedParams = validateAndParseSchema(params, evmCallParamsSchema);
  const validatedOptions = validateAndParseSchema(options, evmOptionsSchema);

  const gatewayAddress =
    validatedOptions.gateway ||
    (await getGatewayAddressFromSigner(validatedOptions.signer));

  const callData = generateEvmCallData({
    receiver: validatedParams.receiver,
    revertOptions: validatedParams.revertOptions,
    types: validatedParams.types,
    values: validatedParams.values,
  });

  const tx = await broadcastGatewayTx({
    signer: validatedOptions.signer,
    txData: {
      data: callData.data,
      to: gatewayAddress,
    },
    txOptions: validatedOptions.txOptions || {},
  });

  return tx;
};
