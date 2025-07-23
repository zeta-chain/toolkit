import { ethers } from "ethers";
import { z } from "zod";

import {
  createRevertOptions,
  createSolanaGatewayProgram,
} from "../../../utils/solana.commands.helpers";
import { validateAndParseSchema } from "../../../utils/validateAndParseSchema";
import {
  solanaCallParamsSchema,
  solanaOptionsSchema,
} from "../../schemas/solana";

type solanaCallParams = z.infer<typeof solanaCallParamsSchema>;
type solanaOptions = z.infer<typeof solanaOptionsSchema>;

/**
 * Makes a cross-chain call from Solana to a universal contract on ZetaChain.
 *
 * This function allows you to call a contract function on a universal contract
 * from Solana without transferring any tokens. It's useful for executing
 * contract logic across different chains.
 *
 * @param params - The call parameters including receiver address, function types/values, and revert options
 * @param options - Configuration options including chain ID and signer keypair
 * @returns Promise that resolves to the transaction signature
 */
export const solanaCall = async (
  params: solanaCallParams,
  options: solanaOptions
) => {
  const validatedParams = validateAndParseSchema(
    params,
    solanaCallParamsSchema
  );
  const validatedOptions = validateAndParseSchema(options, solanaOptionsSchema);

  const { gatewayProgram } = createSolanaGatewayProgram(
    validatedOptions.chainId,
    validatedOptions.signer
  );

  const receiverBytes = ethers.getBytes(validatedParams.receiver);
  const abiCoder = ethers.AbiCoder.defaultAbiCoder();
  const encodedParameters = abiCoder.encode(
    validatedParams.types,
    validatedParams.values
  );
  const message = Buffer.from(encodedParameters.slice(2), "hex");

  const revertOptions = createRevertOptions(
    validatedParams.revertOptions,
    validatedOptions.signer.publicKey
  );

  const tx = await gatewayProgram.methods
    .call(receiverBytes, message, revertOptions)
    .accounts({})
    .rpc();
  return tx;
};
