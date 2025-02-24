import { Wallet } from "@coral-xyz/anchor";
import { Keypair } from "@solana/web3.js";
import bech32 from "bech32";
import { utils } from "ethers";
import { task } from "hardhat/config";
import type { HardhatRuntimeEnvironment } from "hardhat/types";

import { ZetaChainClient } from "../../client/src";

export const solanaDepositAndCall = async (
  args: any,
  hre: HardhatRuntimeEnvironment
) => {
  const keypair = await getKeypairFromFile(args.idPath);
  const wallet = new Wallet(keypair);

  const client = new ZetaChainClient({
    network: args.solanaNetwork,
    solanaWallet: wallet,
  });
  let recipient;
  try {
    if ((bech32 as any).decode(args.recipient)) {
      recipient = utils.solidityPack(
        ["bytes"],
        [utils.toUtf8Bytes(args.recipient)]
      );
    }
  } catch (e) {
    recipient = args.recipient;
  }
  const { amount, idPath } = args;
  let paramTypes;
  try {
    paramTypes = JSON.parse(args.types);
  } catch (error: any) {
    throw new Error(`Invalid JSON in 'types' parameter: ${error.message}`);
  }
  const params = [paramTypes, args.values];
  const res = await client.solanaDepositAndCall({ amount, params, recipient });
  console.log(res);
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

task("solana-deposit-and-call", "Solana deposit and call", solanaDepositAndCall)
  .addParam("amount", "Amount of SOL to deposit")
  .addParam("recipient", "Universal contract address")
  .addOptionalParam("solanaNetwork", "Solana Network", "devnet")
  .addOptionalParam("idPath", "Path to id.json", "~/.config/solana/id.json")
  .addParam("types", "The types of the parameters (example: ['string'])")
  .addVariadicPositionalParam("values", "The values of the parameters");
