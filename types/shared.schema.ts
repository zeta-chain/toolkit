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
