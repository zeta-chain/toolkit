import * as anchor from "@coral-xyz/anchor";
import {
  ASSOCIATED_TOKEN_PROGRAM_ID,
  TOKEN_PROGRAM_ID,
} from "@solana/spl-token";
import { PublicKey } from "@solana/web3.js";
import { ethers } from "ethers";

import { RevertOptions } from "../../../types/contracts.types";
import {
  createRevertOptions,
  createSolanaGatewayProgram,
  getSPLToken,
  isSOLBalanceSufficient,
} from "../../../utils/solana.commands.helpers";

type solanaDepositParams = {
  amount: string;
  receiver: string;
  revertOptions: RevertOptions;
  token?: string;
};

type solanaOptions = {
  chainId: string;
  signer: anchor.web3.Keypair;
};

export const solanaDeposit = async (
  params: solanaDepositParams,
  options: solanaOptions
) => {
  const { gatewayProgram, provider } = createSolanaGatewayProgram(
    options.chainId,
    options.signer
  );

  const receiverBytes = ethers.getBytes(params.receiver);

  const revertOptions = createRevertOptions(
    params.revertOptions,
    options.signer.publicKey
  );

  if (params.token) {
    const { from, decimals } = await getSPLToken(
      provider,
      params.token,
      params.amount
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
        new PublicKey(params.token).toBuffer(),
      ],
      ASSOCIATED_TOKEN_PROGRAM_ID
    );

    const to = tssAta[0].toBase58();

    const tx = await gatewayProgram.methods
      .depositSplToken(
        new anchor.BN(ethers.parseUnits(params.amount, decimals).toString()),
        receiverBytes,
        revertOptions
      )
      .accounts({
        from,
        mintAccount: params.token,
        signer: options.signer.publicKey,
        systemProgram: anchor.web3.SystemProgram.programId,
        to,
        tokenProgram: TOKEN_PROGRAM_ID,
      })
      .rpc();
    return tx;
  } else {
    // Check SOL balance
    await isSOLBalanceSufficient(provider, params.amount);

    const tx = await gatewayProgram.methods
      .deposit(
        new anchor.BN(ethers.parseUnits(params.amount, 9).toString()),
        receiverBytes,
        revertOptions
      )
      .accounts({})
      .rpc();
    return tx;
  }
};
