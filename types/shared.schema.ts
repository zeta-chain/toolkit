import { utils } from "ethers";
import { z } from "zod";

export const evmAddressSchema = z
  .string()
  .refine((val) => utils.isAddress(val), "Must be a valid EVM address");

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
