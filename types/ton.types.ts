import { z } from "zod";

import { evmAddressSchema } from "./shared.schema";

export const depositOptionsSchema = z.object({
  amount: z.string(),
  apiKey: z.string().optional(),
  gateway: z.string(),
  mnemonic: z.string(),
  receiver: evmAddressSchema,
  rpc: z.string(),
});

export const depositAndCallOptionsSchema = z.object({
  amount: z.string(),
  apiKey: z.string().optional(),
  data: z.string().optional(),
  gateway: z.string(),
  mnemonic: z.string(),
  receiver: evmAddressSchema,
  rpc: z.string(),
  types: z.array(z.string()).optional(),
  values: z.array(z.string()).optional(),
});
