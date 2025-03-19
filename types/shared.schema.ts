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
  { message: "Types must be a valid JSON array of strings" }
);

export const bigNumberStringSchema = z
  .number()
  .int()
  .min(0)
  .transform((val) => ethers.toBigInt(val));
