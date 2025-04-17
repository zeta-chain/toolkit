import { z } from "zod";

export interface AccountData {
  [key: string]: string | undefined;
}

export interface AccountInfo {
  address: string;
  name: string;
  type: string;
}

export interface EVMAccountData {
  address: string;
  mnemonic?: string;
  name?: string;
  privateKey: string;
}

export interface SolanaAccountData {
  name?: string;
  publicKey: string;
  secretKey: string;
}
export interface AccountDetails {
  [key: string]: string;
}

export const AvailableAccountTypes = ["evm", "solana"] as const;

// Define schemas for account data types
const evmAccountDataSchema = z.object({
  address: z.string(),
  mnemonic: z.string().optional(),
  name: z.string().optional(),
  privateKey: z.string(),
});

const solanaAccountDataSchema = z.object({
  name: z.string().optional(),
  publicKey: z.string(),
  secretKey: z.string(),
});

// Union schema for both account types
export const accountDataSchema = z.union([
  evmAccountDataSchema,
  solanaAccountDataSchema,
]);
