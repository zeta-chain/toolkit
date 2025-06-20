import * as anchor from "@coral-xyz/anchor";
import { Wallet } from "@coral-xyz/anchor";
import {
  ASSOCIATED_TOKEN_PROGRAM_ID,
  TOKEN_PROGRAM_ID,
} from "@solana/spl-token";
import { PublicKey } from "@solana/web3.js";
import GATEWAY_DEV_IDL from "@zetachain/protocol-contracts-solana/dev/idl/gateway.json";
import GATEWAY_PROD_IDL from "@zetachain/protocol-contracts-solana/prod/idl/gateway.json";
import { ethers } from "ethers";

import { RevertOptions } from "../../../types/contracts.types";
import {
  getAPIbyChainId,
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
  // Mainnet and devnet use the same IDL
  const gatewayIDL =
    options.chainId === "0901" ? GATEWAY_DEV_IDL : GATEWAY_PROD_IDL;

  const API = getAPIbyChainId(options.chainId);

  const connection = new anchor.web3.Connection(API);
  const provider = new anchor.AnchorProvider(
    connection,
    new Wallet(options.signer)
  );
  const gatewayProgram = new anchor.Program(gatewayIDL as anchor.Idl, provider);

  const receiverBytes = ethers.getBytes(params.receiver);

  const revertOptions = {
    abortAddress: ethers.getBytes(params.revertOptions.abortAddress!),
    callOnRevert: params.revertOptions.callOnRevert,
    onRevertGasLimit: new anchor.BN(params.revertOptions.onRevertGasLimit ?? 0),
    revertAddress: params.revertOptions.revertAddress
      ? new PublicKey(params.revertOptions.revertAddress)
      : provider.wallet.publicKey,
    revertMessage: Buffer.from(params.revertOptions.revertMessage, "utf8"),
  };

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
    console.log("Transaction hash:", tx);
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
    console.log("Transaction hash:", tx);
  }
};
