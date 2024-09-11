import * as anchor from "@coral-xyz/anchor";
import { Keypair } from "@solana/web3.js";
import { ethers } from "ethers";

import { ZetaChainClient } from "./client";
import Gateway_IDL from "./idl/gateway.json";

const SEED = "meta";

export const solanaDeposit = async function (
  this: ZetaChainClient,
  args: {
    amount: number;
    api: string;
    idPath: string;
    params: any[];
    recipient: string;
  }
) {
  const keypair = await getKeypairFromFile(args.idPath);
  const wallet = new anchor.Wallet(keypair);

  const connection = new anchor.web3.Connection(args.api);
  const provider = new anchor.AnchorProvider(
    connection,
    wallet,
    anchor.AnchorProvider.defaultOptions()
  );
  anchor.setProvider(provider);

  const programId = new anchor.web3.PublicKey(Gateway_IDL.address);
  const gatewayProgram = new anchor.Program(
    Gateway_IDL as anchor.Idl,
    provider
  );

  const seeds = [Buffer.from(SEED, "utf-8")];
  const [pdaAccount] = anchor.web3.PublicKey.findProgramAddressSync(
    seeds,
    programId
  );

  const depositAmount = new anchor.BN(
    anchor.web3.LAMPORTS_PER_SOL * args.amount
  );

  try {
    const tx = new anchor.web3.Transaction();
    const m = Buffer.from(
      ethers.utils.arrayify(
        args.recipient +
          ethers.utils.defaultAbiCoder
            .encode(args.params[0], args.params[1])
            .slice(2)
      )
    );
    const depositInstruction = await gatewayProgram.methods
      .deposit(depositAmount, m)
      .accounts({
        pda: pdaAccount,
        signer: wallet.publicKey,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .instruction();

    tx.add(depositInstruction);

    // Send the transaction
    const txSignature = await anchor.web3.sendAndConfirmTransaction(
      connection,
      tx,
      [keypair]
    );

    console.log("Transaction signature:", txSignature);
  } catch (error) {
    console.error("Transaction failed:", error);
  }
};

const getKeypairFromFile = async (filepath: string) => {
  const path = await import("path");
  if (filepath[0] === "~") {
    const home = process.env.HOME || null;
    if (home) {
      filepath = path.join(home, filepath.slice(1));
    }
  }
  // Get contents of file
  let fileContents;
  try {
    const { readFile } = await import("fs/promises");
    const fileContentsBuffer = await readFile(filepath);
    fileContents = fileContentsBuffer.toString();
  } catch (error) {
    throw new Error(`Could not read keypair from file at '${filepath}'`);
  }
  // Parse contents of file
  let parsedFileContents;
  try {
    parsedFileContents = Uint8Array.from(JSON.parse(fileContents));
  } catch (thrownObject) {
    const error: any = thrownObject;
    if (!error.message.includes("Unexpected token")) {
      throw error;
    }
    throw new Error(`Invalid secret key file at '${filepath}'!`);
  }
  return Keypair.fromSecretKey(parsedFileContents);
};
