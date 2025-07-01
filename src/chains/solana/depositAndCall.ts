import * as anchor from "@coral-xyz/anchor";
import {
  ASSOCIATED_TOKEN_PROGRAM_ID,
  TOKEN_PROGRAM_ID,
} from "@solana/spl-token";
import { PublicKey } from "@solana/web3.js";
import { ethers } from "ethers";

import { RevertOptions } from "../../../types/contracts.types";
import { ParseAbiValuesReturnType } from "../../../types/parseAbiValues.types";
import {
  createRevertOptions,
  createSolanaGatewayProgram,
  getSPLToken,
  isSOLBalanceSufficient,
} from "../../../utils/solana.commands.helpers";

type solanaDepositAndCallParams = {
  amount: string;
  receiver: string;
  revertOptions: RevertOptions;
  token?: string;
  types: string[];
  values: ParseAbiValuesReturnType;
};

type solanaOptions = {
  chainId: string;
  signer: anchor.web3.Keypair;
};

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
  const { gatewayProgram, provider } = createSolanaGatewayProgram(
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
      .depositSplTokenAndCall(
        new anchor.BN(ethers.parseUnits(params.amount, decimals).toString()),
        receiverBytes,
        message,
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
      .depositAndCall(
        new anchor.BN(ethers.parseUnits(params.amount, 9).toString()),
        receiverBytes,
        message,
        revertOptions
      )
      .accounts({})
      .rpc();
    return tx;
  }
};
