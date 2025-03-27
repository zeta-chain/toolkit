import { Wallet } from "@coral-xyz/anchor";
import { Keypair } from "@solana/web3.js";
import { bech32 } from "bech32";
import { ethers } from "ethers";
import { task } from "hardhat/config";
import { z } from "zod";

import {
  numberArraySchema,
  stringArraySchema,
  validJsonStringSchema,
} from "../../../types/shared.schema";
import { handleError, parseJson, validateTaskArgs } from "../../../utils";
import { parseAbiValues } from "../../../utils/parseAbiValues";
import { ZetaChainClient } from "../../client/src";

const solanaDepositAndCallArgsSchema = z.object({
  amount: z.string(),
  idPath: z.string(),
  recipient: z.string(),
  solanaNetwork: z.string(),
  types: validJsonStringSchema,
  values: z.array(z.string()).min(1, "At least one value is required"),
});

type SolanaDepositAndCallArgs = z.infer<typeof solanaDepositAndCallArgsSchema>;

export const solanaDepositAndCall = async (args: SolanaDepositAndCallArgs) => {
  const parsedArgs = validateTaskArgs(args, solanaDepositAndCallArgsSchema);

  const values = parseAbiValues(parsedArgs.types, parsedArgs.values);

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

  const paramTypes = parseJson(parsedArgs.types, stringArraySchema);

  const res = await client.solanaDepositAndCall({
    amount: Number(parsedArgs.amount),
    recipient,
    types: paramTypes,
    values,
  });

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
  let fileContents;
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
    const errorMessage = handleError({
      context: `Invalid secret key file at '${filepath}'!`,
      error,
    });

    if (!errorMessage.includes("Unexpected token")) {
      throw new Error(errorMessage);
    }

    throw new Error(`Invalid secret key file at '${filepath}'!`);
  }

  return Keypair.fromSecretKey(parsedFileContents);
};

task("solana-deposit-and-call", "Solana deposit and call", solanaDepositAndCall)
  .addParam("amount", "Amount of SOL to deposit")
  .addParam("recipient", "Universal contract address")
  .addOptionalParam("solanaNetwork", "Solana Network", "devnet")
  .addOptionalParam("idPath", "Path to id.json", "~/.config/solana/id.json")
  .addParam("types", "The types of the parameters (example: ['string'])")
  .addVariadicPositionalParam("values", "The values of the parameters");
