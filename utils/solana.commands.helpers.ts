import * as anchor from "@coral-xyz/anchor";
import * as bip39 from "bip39";
import bs58 from "bs58";
import { Command, Option } from "commander";
import { z } from "zod";

import {
  DEFAULT_ACCOUNT_NAME,
  SOLANA_NETWORKS,
  SOLANA_TOKEN_PROGRAM,
} from "../types/shared.constants";
import { hexStringSchema } from "../types/shared.schema";
import { trim0x } from "./trim0x";

export const solanaDepositOptionsSchema = z.object({
  amount: z.string(),
  mint: z.string().optional(),
  mnemonic: z.string().optional(),
  name: z.string().optional(),
  network: z.string(),
  privateKey: z.string().optional(),
  recipient: z.string(),
  tokenProgram: z.string().default(SOLANA_TOKEN_PROGRAM),
});

export const keypairFromMnemonic = async (
  mnemonic: string
): Promise<anchor.web3.Keypair> => {
  if (!bip39.validateMnemonic(mnemonic)) {
    throw new Error("Invalid mnemonic phrase");
  }
  const seed = await bip39.mnemonicToSeed(mnemonic);
  const seedSlice = new Uint8Array(seed).slice(0, 32);
  return anchor.web3.Keypair.fromSeed(seedSlice);
};

export const keypairFromPrivateKey = (
  privateKey: string
): anchor.web3.Keypair => {
  try {
    // First try base58 decoding (original format)
    const decodedKey = bs58.decode(privateKey);
    return anchor.web3.Keypair.fromSecretKey(decodedKey);
  } catch (error) {
    // If base58 fails, validate and try hex format
    const hexValidation = hexStringSchema.safeParse(privateKey);
    if (!hexValidation.success) {
      throw new Error(
        "Invalid private key format. Must be either base58 or valid hex (with optional 0x prefix)."
      );
    }

    try {
      const cleanKey = trim0x(privateKey);
      return anchor.web3.Keypair.fromSecretKey(Buffer.from(cleanKey, "hex"));
    } catch (hexError) {
      throw new Error(
        `Invalid hex private key: ${
          hexError instanceof Error ? hexError.message : "Unknown error"
        }`
      );
    }
  }
};

export const createSolanaCommandWithCommonOptions = (name: string): Command => {
  return new Command(name)
    .requiredOption(
      "--recipient <recipient>",
      "EOA or contract address on ZetaChain"
    )
    .addOption(
      new Option("--mnemonic <mnemonic>", "Mnemonic").conflicts([
        "private-key",
        "name",
      ])
    )
    .addOption(
      new Option("--name <name>", "Name of the wallet")
        .conflicts(["private-key", "mnemonic"])
        .default(DEFAULT_ACCOUNT_NAME)
    )
    .addOption(
      new Option(
        "--private-key <privateKey>",
        "Private key in base58 or hex format (with optional 0x prefix)"
      ).conflicts(["mnemonic", "name"])
    )
    .addOption(
      new Option("--network <network>", "Solana network").choices(
        SOLANA_NETWORKS
      )
    );
};
