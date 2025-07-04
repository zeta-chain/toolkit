import * as anchor from "@coral-xyz/anchor";
import {
  ASSOCIATED_TOKEN_PROGRAM_ID,
  TOKEN_PROGRAM_ID,
} from "@solana/spl-token";
import { PublicKey } from "@solana/web3.js";
import { ethers } from "ethers";
import { z } from "zod";

import {
  createRevertOptions,
  createSolanaGatewayProgram,
  getSPLToken,
  isSOLBalanceSufficient,
} from "../../../utils/solana.commands.helpers";
import { validateAndParseSchema } from "../../../utils/validateAndParseSchema";
import {
  solanaDepositAndCallParamsSchema,
  solanaOptionsSchema,
} from "../../schemas/solana";

type solanaDepositAndCallParams = z.infer<
  typeof solanaDepositAndCallParamsSchema
>;
type solanaOptions = z.infer<typeof solanaOptionsSchema>;

/**
 * Deposits tokens and makes a cross-chain call from Solana to a universal contract on ZetaChain.
 *
 * This function combines token deposit with a contract call in a single transaction.
 * It allows you to transfer tokens from Solana to ZetaChain and immediately
 * execute a function call on the universal contract. Supports both native SOL
 * and SPL tokens.
 *
 * @param params - The deposit and call parameters including amount, receiver, token mint address, function types/values, and revert options
 * @param options - Configuration options including chain ID and signer keypair
 * @returns Promise that resolves to the transaction signature
 */
export const solanaDepositAndCall = async (
  params: solanaDepositAndCallParams,
  options: solanaOptions
) => {
  const validatedParams = validateAndParseSchema(
    params,
    solanaDepositAndCallParamsSchema
  );
  const validatedOptions = validateAndParseSchema(options, solanaOptionsSchema);

  const { gatewayProgram, provider } = createSolanaGatewayProgram(
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

  if (validatedParams.token) {
    const { from, decimals } = await getSPLToken(
      provider,
      validatedParams.token,
      validatedParams.amount
    );

    // Find the TSS PDA (meta)
    const [tssPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("meta", "utf-8")],
      gatewayProgram.programId
    );

    // Find the TSS's ATA for the mint
    const tssAta = await PublicKey.findProgramAddress(
      [
        tssPda.toBuffer(),
        TOKEN_PROGRAM_ID.toBuffer(),
        new PublicKey(validatedParams.token).toBuffer(),
      ],
      ASSOCIATED_TOKEN_PROGRAM_ID
    );

    const to = tssAta[0].toBase58();

    const tx = await gatewayProgram.methods
      .depositSplTokenAndCall(
        new anchor.BN(
          ethers.parseUnits(validatedParams.amount, decimals).toString()
        ),
        receiverBytes,
        message,
        revertOptions
      )
      .accounts({
        from,
        mintAccount: validatedParams.token,
        signer: validatedOptions.signer.publicKey,
        systemProgram: anchor.web3.SystemProgram.programId,
        to,
        tokenProgram: TOKEN_PROGRAM_ID,
      })
      .rpc();
    return tx;
  } else {
    // Check SOL balance
    await isSOLBalanceSufficient(provider, validatedParams.amount);

    const tx = await gatewayProgram.methods
      .depositAndCall(
        new anchor.BN(ethers.parseUnits(validatedParams.amount, 9).toString()),
        receiverBytes,
        message,
        revertOptions
      )
      .accounts({})
      .rpc();
    return tx;
  }
};
