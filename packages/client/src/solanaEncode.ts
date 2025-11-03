import * as anchor from "@coral-xyz/anchor";
import { getAssociatedTokenAddress } from "@solana/spl-token";
import { ethers } from "ethers";

import { safeAwait } from "../../../utils/safeAwait";
import { parseSolanaAccounts } from "../../../utils/solanaAccounts";

export interface EncodeOptions {
  accounts?: string[];
  connected: string;
  data: string;
  gateway: string;
  mint?: string;
}

export const solanaEncode = async ({
  gateway,
  connected,
  data,
  mint,
  accounts = [],
}: EncodeOptions) => {
  const connectedProgramId = new anchor.web3.PublicKey(connected);
  const [connectedPdaAccount] = anchor.web3.PublicKey.findProgramAddressSync(
    [Buffer.from("connected", "utf-8")],
    connectedProgramId
  );
  const [pdaAccount] = anchor.web3.PublicKey.findProgramAddressSync(
    [Buffer.from("meta", "utf-8")],
    new anchor.web3.PublicKey(gateway)
  );

  const pda = {
    isWritable: true,
    publicKey: ethers.hexlify(connectedPdaAccount.toBytes()),
  };

  const gatewayPda = {
    isWritable: false,
    publicKey: ethers.hexlify(pdaAccount.toBytes()),
  };

  const systemProgram = {
    isWritable: false,
    publicKey: ethers.hexlify(anchor.web3.SystemProgram.programId.toBytes()),
  };

  const instructionSysvar = {
    isWritable: false,
    publicKey: ethers.hexlify(anchor.web3.SYSVAR_INSTRUCTIONS_PUBKEY.toBytes()),
  };

  let baseAccounts;
  if (mint) {
    const mintPubkey = new anchor.web3.PublicKey(mint);

    const connectedPdaATA = await safeAwait(
      () => getAssociatedTokenAddress(mintPubkey, connectedPdaAccount, true),
      { errorContext: "Error getting associated token address" }
    );

    const pdaAta = {
      isWritable: true,
      publicKey: ethers.hexlify(connectedPdaATA.toBytes()),
    };

    const mintAccount = {
      isWritable: false,
      publicKey: ethers.hexlify(mintPubkey.toBytes()),
    };

    const tokenProgram = {
      isWritable: false,
      publicKey: ethers.hexlify(anchor.utils.token.TOKEN_PROGRAM_ID.toBytes()),
    };

    baseAccounts = [
      pda,
      pdaAta,
      mintAccount,
      gatewayPda,
      tokenProgram,
      systemProgram,
      instructionSysvar,
    ];
  } else {
    baseAccounts = [pda, gatewayPda, systemProgram, instructionSysvar];
  }

  // Parse additional accounts using our utility function
  const additionalAccounts = parseSolanaAccounts(accounts);

  const allAccounts = [...baseAccounts, ...additionalAccounts];

  const encodedData = ethers.hexlify(ethers.toUtf8Bytes(data));

  const encoded = ethers.AbiCoder.defaultAbiCoder().encode(
    ["tuple(tuple(bytes32 publicKey, bool isWritable)[] accounts, bytes data)"],
    [[allAccounts, encodedData]]
  );

  return encoded;
};
