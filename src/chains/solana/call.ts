import * as anchor from "@coral-xyz/anchor";
import { ethers } from "ethers";

import { RevertOptions } from "../../../types/contracts.types";
import { ParseAbiValuesReturnType } from "../../../types/parseAbiValues.types";
import {
  createRevertOptions,
  createSolanaGatewayProgram,
} from "../../../utils/solana.commands.helpers";

type solanaCallParams = {
  receiver: string;
  revertOptions: RevertOptions;
  types: string[];
  values: ParseAbiValuesReturnType;
};

type solanaOptions = {
  chainId: string;
  signer: anchor.web3.Keypair;
};

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
  const { gatewayProgram } = createSolanaGatewayProgram(
    options.chainId,
    options.signer
  );

  const receiverBytes = ethers.getBytes(params.receiver);
  const abiCoder = ethers.AbiCoder.defaultAbiCoder();
  const encodedParameters = abiCoder.encode(params.types, params.values);
  const message = Buffer.from(encodedParameters.slice(2), "hex");

  const revertOptions = createRevertOptions(
    params.revertOptions,
    options.signer.publicKey
  );

  const tx = await gatewayProgram.methods
    .call(receiverBytes, message, revertOptions)
    .accounts({})
    .rpc();
  return tx;
};
