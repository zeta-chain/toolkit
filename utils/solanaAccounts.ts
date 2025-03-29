import * as anchor from "@coral-xyz/anchor";
import { ethers } from "ethers";
import { z } from "zod";

// These dependencies can be injected for testing
export const dependencies = {
  anchor,
  ethers,
};

/**
 * Interface representing a Solana account with public key and isWritable flag
 */
export interface SolanaAccount {
  isWritable: boolean;
  publicKey: string; // Hex-encoded public key
}

/**
 * Zod schema for validating Solana public keys
 * Ensures the string can be constructed as a valid Solana PublicKey
 */
const publicKeySchema = z.string().refine(
  (val) => {
    try {
      new dependencies.anchor.web3.PublicKey(val);
      return true;
    } catch (error) {
      return false;
    }
  },
  {
    message: "Invalid Solana public key format",
  }
);

/**
 * Zod schema for validating Solana account strings
 * Format: "publicKey:isWritable" where isWritable is "true" or "false"
 */
export const solanaAccountStringSchema = z
  .string()
  .refine((val) => val.includes(":"), {
    message: "Account string must include ':' separator",
  })
  .refine(
    (val) => {
      const parts = val.split(":");
      return parts.length === 2;
    },
    {
      message: "Account string must have exactly one ':' separator",
    }
  )
  .transform((val) => {
    const [pubkey, isWritableStr] = val.split(":");
    return { isWritableStr, pubkey };
  })
  .pipe(
    z.object({
      isWritableStr: z
        .enum(["true", "false"])
        .transform((val) => val === "true"),
      pubkey: publicKeySchema,
    })
  );

/**
 * Parse a string in format "publicKey:isWritable" into a Solana account object
 *
 * @param accountString - String in format "publicKey:isWritable" where isWritable is "true" or "false"
 * @param index - Optional index for error reporting in array contexts
 * @returns An object with isWritable boolean and publicKey as hex string
 * @throws Error if the string format is invalid or the public key is invalid
 */
export const parseSolanaAccount = (
  accountString: string,
  index?: number
): SolanaAccount => {
  const errorPrefix =
    typeof index === "number"
      ? `Invalid account format at index ${index}`
      : "Invalid account format";

  try {
    // Parse and validate the account string with Zod
    const result = solanaAccountStringSchema.parse(accountString);

    // Convert the public key to bytes and hexlify
    const publicKey = new dependencies.anchor.web3.PublicKey(result.pubkey);

    return {
      isWritable: result.isWritableStr,
      publicKey: dependencies.ethers.hexlify(publicKey.toBytes()),
    };
  } catch (error) {
    if (error instanceof z.ZodError) {
      const issues = error.issues.map((issue) => issue.message).join(", ");
      throw new Error(`${errorPrefix}: ${issues}`);
    }

    // Handle other errors (like PublicKey construction errors)
    throw new Error(
      `${errorPrefix}: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
  }
};

/**
 * Parse an array of account strings into Solana account objects
 *
 * @param accounts - Array of strings in format "publicKey:isWritable"
 * @returns Array of Solana account objects
 */
export const parseSolanaAccounts = (accounts: string[]): SolanaAccount[] => {
  return accounts.map((account, index) => parseSolanaAccount(account, index));
};
