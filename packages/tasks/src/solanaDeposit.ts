import { Wallet } from "@coral-xyz/anchor";
import { Keypair } from "@solana/web3.js";
import { bech32 } from "bech32";
import { ethers } from "ethers";
import { task } from "hardhat/config";
import { z } from "zod";

import { numberArraySchema } from "../../../types/shared.schema";
import { parseJson } from "../../../utils";
import { ZetaChainClient } from "../../client/src";

const solanaDepositArgsSchema = z.object({
  amount: z.string(),
  idPath: z.string(),
  recipient: z.string(),
  solanaNetwork: z.string(),
});

type SolanaDepositArgs = z.infer<typeof solanaDepositArgsSchema>;

export const solanaDeposit = async (args: SolanaDepositArgs) => {
  const {
    success,
    error,
    data: parsedArgs,
  } = solanaDepositArgsSchema.safeParse(args);

  if (!success) {
    throw new Error(`Invalid arguments: ${error?.message}`);
  }

  const keypair = await getKeypairFromFile(parsedArgs.idPath);
  const wallet = new Wallet(keypair);

  const client = new ZetaChainClient({
    network: parsedArgs.solanaNetwork,
    solanaWallet: wallet,
  });
  let recipient: string;
  try {
    if (bech32.decode(parsedArgs.recipient)) {
      recipient = ethers.solidityPacked(
        ["bytes"],
        [ethers.toUtf8Bytes(parsedArgs.recipient)]
      );
    } else {
      recipient = parsedArgs.recipient;
    }
  } catch {
    recipient = parsedArgs.recipient;
  }
  const { amount } = args;
  const res = await client.solanaDeposit({ amount: Number(amount), recipient });
  console.log(`Transaction hash: ${res}`);
};

export const getKeypairFromFile = async (filepath: string) => {
  const path = await import("path");
  if (filepath[0] === "~") {
    const home = process.env.HOME || null;
    if (home) {
      filepath = path.join(home, filepath.slice(1));
    }
  }
  // Get contents of file
  let fileContents: string;
  try {
    const { readFile } = await import("fs/promises");
    const fileContentsBuffer = await readFile(filepath);
    fileContents = fileContentsBuffer.toString();
  } catch {
    throw new Error(`Could not read keypair from file at '${filepath}'`);
  }
  // Parse contents of file
  let parsedFileContents;
  try {
    const parsedFileContentsResult = parseJson(fileContents, numberArraySchema);
    parsedFileContents = Uint8Array.from(parsedFileContentsResult);
  } catch (error: unknown) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";

    if (!errorMessage.includes("Unexpected token")) {
      throw new Error(errorMessage);
    }

    throw new Error(`Invalid secret key file at '${filepath}'!`);
  }

  return Keypair.fromSecretKey(parsedFileContents);
};

task("solana-deposit", "Solana deposit", solanaDeposit)
  .addParam("amount", "Amount of SOL to deposit")
  .addParam("recipient", "Universal contract address")
  .addOptionalParam("solanaNetwork", "Solana Network", "devnet")
  .addOptionalParam("idPath", "Path to id.json", "~/.config/solana/id.json");
