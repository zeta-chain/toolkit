import { Keypair } from "@solana/web3.js";
import * as bip39 from "bip39";
import bs58 from "bs58";

import { SolanaAccountData } from "../types/accounts.types";
import { hexStringSchema } from "../types/shared.schema";
import { getAccountData } from "./getAccountData";
import { handleError } from "./handleError";
import { trim0x } from "./trim0x";

/**
 * Create a Keypair from a mnemonic phrase
 * Uses bip39 for mnemonic validation and seed generation (WASM dependency)
 */
const keypairFromMnemonic = async (mnemonic: string): Promise<Keypair> => {
  if (!bip39.validateMnemonic(mnemonic)) {
    throw new Error("Invalid mnemonic phrase");
  }
  const seed = await bip39.mnemonicToSeed(mnemonic);
  const seedSlice = new Uint8Array(seed).slice(0, 32);
  return Keypair.fromSeed(seedSlice);
};

/**
 * Create a Keypair from a private key string
 * Supports both base58 and hex formats (uses bs58 for base58 decoding)
 */
const keypairFromPrivateKey = (privateKey: string): Keypair => {
  try {
    // Try base58 format first (uses bs58 - potential WASM dependency)
    const decodedKey = bs58.decode(privateKey);
    return Keypair.fromSecretKey(decodedKey);
  } catch (error) {
    // Fallback to hex format
    const hexValidation = hexStringSchema.safeParse(privateKey);
    if (!hexValidation.success) {
      throw new Error(
        "Invalid private key format. Must be either base58 or valid hex (with optional 0x prefix)."
      );
    }
    try {
      const cleanKey = trim0x(privateKey);
      return Keypair.fromSecretKey(Buffer.from(cleanKey, "hex"));
    } catch (hexError) {
      throw new Error(
        `Invalid hex private key: ${
          hexError instanceof Error ? hexError.message : "Unknown error"
        }`
      );
    }
  }
};

/**
 * Browser-safe version of getKeypair that returns @solana/web3.js Keypair
 * Contains WASM dependencies (bip39, bs58) - should only be used in CLI/Node.js environments
 */
export const getBrowserSafeKeypair = async ({
  name,
  mnemonic,
  privateKey,
}: {
  mnemonic: string | undefined;
  name: string | undefined;
  privateKey: string | undefined;
}): Promise<Keypair> => {
  let keypair: Keypair;
  if (privateKey) {
    keypair = keypairFromPrivateKey(privateKey);
  } else if (mnemonic) {
    keypair = await keypairFromMnemonic(mnemonic);
  } else if (name) {
    const accountData = getAccountData<SolanaAccountData>("solana", name);
    if (!accountData) {
      const errorMessage = handleError({
        context: "Failed to retrieve private key",
        error: new Error("Private key not found"),
        shouldThrow: false,
      });
      throw new Error(errorMessage);
    }
    keypair = keypairFromPrivateKey(accountData.privateKey);
  } else {
    throw new Error("No account provided");
  }
  return keypair;
};

// Export the internal functions for testing or advanced usage
export { keypairFromMnemonic, keypairFromPrivateKey };
