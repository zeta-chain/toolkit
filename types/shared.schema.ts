import { ethers } from "ethers";
import { z } from "zod";

import { DEFAULT_ACCOUNT_NAME } from "./shared.constants";

export const evmAddressSchema = z
  .string()
  .refine((val) => ethers.isAddress(val), "Must be a valid EVM address");

export const validJsonStringSchema = z.string().refine(
  (val) => {
    try {
      JSON.parse(val);
      return true;
    } catch {
      return false;
    }
  },
  { message: "Types must be a valid JSON string" }
);

export const bigNumberStringSchema = z
  .number()
  .int()
  .min(0)
  .transform((val) => ethers.toBigInt(val));

export const numberArraySchema = z.array(z.number());
export const stringArraySchema = z.array(z.string());
export const validAmountSchema = z
  .string()
  .refine((val) => !isNaN(Number(val)) && Number(val) > 0, {
    message: "Amount must be a valid positive number",
  });
export const numericStringSchema = z
  .string()
  .refine((val) => /^\d+$/.test(val), {
    message: "Must be a string containing only numbers",
  });
export const evmPrivateKeySchema = z
  .string()
  .refine((val) => /^(0x)?[0-9a-fA-F]{64}$/.test(val), {
    message: "Must be a 64-character hex string (optional 0x prefix)",
  })
  .transform((val) => (val.startsWith("0x") ? val : `0x${val}`))
  // Add cryptographic validation
  .refine(
    (val) => {
      try {
        new ethers.Wallet(val); // Throws if invalid
        return true;
      } catch {
        return false;
      }
    },
    { message: "Invalid private key (must be in secp256k1 range)" }
  );
/**
 * Validation rule for Zod schema refinement that ensures only one of name or privateKey is provided.
 * This prevents users from specifying both a named account and a private key at the same time.
 */
export const namePkRefineRule = (data: {
  name: string;
  privateKey?: string;
}) => {
  return !(data.privateKey && data.name !== DEFAULT_ACCOUNT_NAME);
};
