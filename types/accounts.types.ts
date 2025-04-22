import { z } from "zod";

export interface AccountInfo {
  address: string;
  name: string;
  type: string;
}

export interface AccountDetails {
  [key: string]: string;
}

export const AvailableAccountTypes = ["evm", "solana", "sui"] as const;

export const accountNameSchema = z
  .string()
  .min(1, "Account name is required")
  .regex(/^[a-zA-Z0-9]+$/, "Account name can only contain letters and numbers");

// Define unified schema for all account types
export const accountDataSchema = z.object({
  address: z.string(),
  keyScheme: z.string().optional(),
  mnemonic: z.string().optional(),
  name: z.string().optional(),
  privateKey: z.string(),
  privateKeyEncoding: z.string().optional(),
  privateKeyScheme: z.string().optional(),
  publicKey: z.string().optional(),
});

export type AccountData = z.infer<typeof accountDataSchema>;
