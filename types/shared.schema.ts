import { utils } from "ethers";
import { z } from "zod";

export const evmAddressSchema = z
  .string()
  .refine((val) => utils.isAddress(val), "Must be a valid EVM address");
