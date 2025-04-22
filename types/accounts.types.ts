import { z } from "zod";

import { evmAddressSchema } from "../types/shared.schema";

export interface AccountInfo {
  address: string;
  name: string;
  type: string;
}

export interface AccountDetails {
  [key: string]: string;
}

export const AvailableAccountTypes = ["evm", "solana"] as const;

// Define unified schema for all account types
export const accountDataSchema = z.object({
  address: z.string(),
  mnemonic: z.string().optional(),
  privateKey: z.string(),
  privateKeyEncoding: z.string().optional(),
  privateKeyScheme: z.string().optional(),
  name: z.string().optional(),
});

export type AccountData = z.infer<typeof accountDataSchema>;

export const accountNameSchema = z
  .string()
  .min(1, "Account name is required")
  .regex(/^[a-zA-Z0-9]+$/, "Account name can only contain letters and numbers");
