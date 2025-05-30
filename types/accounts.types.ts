import { z } from "zod";

import { evmAddressSchema } from "./shared.schema";
export interface AccountInfo {
  address: string;
  name: string;
  type: string;
}

export interface AccountDetails {
  [key: string]: string;
}

export const AvailableAccountTypes = [
  "evm",
  "solana",
  "sui",
  "bitcoin",
] as const;

// Define schemas for account data types
const evmAccountDataSchema = z.object({
  address: evmAddressSchema,
  mnemonic: z.string().optional(),
  name: z.string().optional(),
  privateKey: z.string(),
});

const solanaAccountDataSchema = z.object({
  name: z.string().optional(),
  privateKey: z.string(),
  publicKey: z.string(),
});

const bitcoinAccountDataSchema = z.object({
  mainnetAddress: z.string(),
  mainnetWIF: z.string(),
  name: z.string().optional(),
  privateKey: z.string(),
  testnetAddress: z.string(),
  testnetWIF: z.string(),
});

const suiAccountDataSchema = z.object({
  address: z.string(),
  name: z.string().optional(),
  privateKey: z.string(),
  privateKeyEncoding: z.string(),
  privateKeyScheme: z.string(),
  publicKey: z.string(),
});

export type EVMAccountData = z.infer<typeof evmAccountDataSchema>;
export type SolanaAccountData = z.infer<typeof solanaAccountDataSchema>;
export type BitcoinAccountData = z.infer<typeof bitcoinAccountDataSchema>;
export type SuiAccountData = z.infer<typeof suiAccountDataSchema>;
export const accountNameSchema = z
  .string()
  .min(1, "Account name is required")
  .regex(/^[a-zA-Z0-9]+$/, "Account name can only contain letters and numbers");

// Define unified schema for all account types
export const accountDataSchema = z.object({
  address: z.string().optional(),
  mainnetAddress: z.string().optional(),
  mainnetWIF: z.string().optional(),
  mnemonic: z.string().optional(),
  name: z.string().optional(),
  privateKey: z.string(),
  privateKeyBytes: z.string().optional(),
  privateKeyEncoding: z.string().optional(),
  privateKeyScheme: z.string().optional(),
  publicKey: z.string().optional(),
  testnetAddress: z.string().optional(),
  testnetWIF: z.string().optional(),
});

export type AccountData = z.infer<typeof accountDataSchema>;
export const accountTypeSchema = z.enum(AvailableAccountTypes, {
  errorMap: () => ({
    message: `Type must be one of the following: ${AvailableAccountTypes.join(
      ", "
    )}`,
  }),
});
