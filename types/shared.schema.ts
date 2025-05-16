import { ethers } from "ethers";
import { z } from "zod";

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
export const hexStringSchema = z
  .string()
  .regex(/^(0x)?[0-9a-fA-F]*$/, { message: "data must be hex encoded" });

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

export const typesAndValuesLengthRefineRule = {
  message:
    "If provided, the 'types' and 'values' arrays must both exist and have the same length",
  path: ["values"],
  rule: (data: { types?: string[]; values?: string[] }) => {
    // Only check length equality if both arrays exist
    if (data.types && data.values) {
      return data.types.length === data.values.length;
    }
    // If one exists and the other doesn't, that's invalid
    if ((data.types && !data.values) || (!data.types && data.values)) {
      return false;
    }
    // If both are undefined/not provided, that's valid
    return true;
  },
};
export const typesAndDataExclusivityRefineRule = {
  message: "Provide either --data or --types/--values (not both)",
  path: ["data"],
  rule: (data: { data?: string; types?: string[]; values?: string[] }) => {
    // Prevent providing both data and types/values
    if (data.data && (data.types || data.values)) {
      return false;
    }

    return true;
  },
};
