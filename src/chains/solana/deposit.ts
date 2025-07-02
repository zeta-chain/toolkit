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
  solanaDepositParamsSchema,
  solanaOptionsSchema,
} from "../../schemas/solana";

type solanaDepositParams = z.infer<typeof solanaDepositParamsSchema>;
type solanaOptions = z.infer<typeof solanaOptionsSchema>;

/**
 * Deposits tokens from Solana to ZetaChain.
 *
 * This function allows you to transfer tokens from Solana to ZetaChain.
 * It supports both native SOL and SPL tokens. For SPL tokens, it automatically
 * handles token account creation and token transfer.
 *
 * @param params - The deposit parameters including amount, receiver, token mint address, and revert options
 * @param options - Configuration options including chain ID and signer keypair
 * @returns Promise that resolves to the transaction signature
 */
export const solanaDeposit = async (
  params: solanaDepositParams,
  options: solanaOptions
) => {
  const validatedParams = validateAndParseSchema(
    params,
    solanaDepositParamsSchema
  );
  const validatedOptions = validateAndParseSchema(options, solanaOptionsSchema);

  const { gatewayProgram, provider } = createSolanaGatewayProgram(
    validatedOptions.chainId,
    validatedOptions.signer
  );

  const receiverBytes = ethers.getBytes(validatedParams.receiver);

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
      .depositSplToken(
        new anchor.BN(
          ethers.parseUnits(validatedParams.amount, decimals).toString()
        ),
        receiverBytes,
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
      .deposit(
        new anchor.BN(ethers.parseUnits(validatedParams.amount, 9).toString()),
        receiverBytes,
        revertOptions
      )
      .accounts({})
      .rpc();
    return tx;
  }
};
