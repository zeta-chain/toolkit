import * as anchor from "@coral-xyz/anchor";
import Gateway_IDL from "./idl/gateway.json";
import { ZetaChainClient } from "./client";
import { Keypair } from "@solana/web3.js";

const SEED = "meta";

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

export const solanaDeposit = async function (
  this: ZetaChainClient,
  args: {
    amount: number;
    memo: string;
    api: string;
    idPath: string;
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
  const memo = Buffer.from(args.memo);

  try {
    const tx = await gatewayProgram.methods
      .deposit(depositAmount, memo)
      .accounts({
        signer: wallet.publicKey,
        pda: pdaAccount,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .rpc();

    console.log("Deposit transaction signature:", tx);

    const pdaBalance = await connection.getBalance(pdaAccount);
    console.log(
      "PDA account SOL balance:",
      pdaBalance / anchor.web3.LAMPORTS_PER_SOL,
      "SOL"
    );
  } catch (error) {
    console.error("Transaction failed:", error);
  }
};
