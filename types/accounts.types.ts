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

export const AvailableAccountTypes = ["evm", "solana", "bitcoin"] as const;

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

const bitcoinAccountDataSchema = z.object({
  mainnetAddress: z.string(),
  mainnetWIF: z.string(),
  name: z.string().optional(),
  privateKey: z.string(),
  testnetAddress: z.string(),
  testnetWIF: z.string(),
});

export type EVMAccountData = z.infer<typeof evmAccountDataSchema>;
export type SolanaAccountData = z.infer<typeof solanaAccountDataSchema>;
export type BitcoinAccountData = z.infer<typeof bitcoinAccountDataSchema>;

// Union schema for all account types
export const accountDataSchema = z.union([
  evmAccountDataSchema,
  solanaAccountDataSchema,
  bitcoinAccountDataSchema,
]);

export const accountNameSchema = z
  .string()
  .min(1, "Account name is required")
  .regex(/^[a-zA-Z0-9]+$/, "Account name can only contain letters and numbers");

export const accountTypeSchema = z.enum(AvailableAccountTypes, {
  errorMap: () => ({
    message: `Type must be one of the following: ${AvailableAccountTypes.join(
      ", "
    )}`,
  }),
});
