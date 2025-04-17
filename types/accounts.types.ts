import { z } from "zod";

import { evmAddressSchema } from "../types/shared.schema";

export interface AccountData {
  [key: string]: string | undefined;
}

export interface AccountInfo {
  address: string;
  name: string;
  type: string;
}

export interface AccountDetails {
  [key: string]: string;
}

export const AvailableAccountTypes = ["evm", "solana"] as const;

// Define schemas for account data types
const evmAccountDataSchema = z.object({
  address: evmAddressSchema,
  mnemonic: z.string().optional(),
  name: z.string().optional(),
  privateKey: z.string(),
});

const solanaAccountDataSchema = z.object({
  name: z.string().optional(),
  publicKey: z.string(),
  secretKey: z.string(),
});

export type EVMAccountData = z.infer<typeof evmAccountDataSchema>;
export type SolanaAccountData = z.infer<typeof solanaAccountDataSchema>;

// Union schema for both account types
export const accountDataSchema = z.union([
  evmAccountDataSchema,
  solanaAccountDataSchema,
]);
