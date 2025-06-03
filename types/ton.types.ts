import { z } from "zod";

export const depositOptionsSchema = z.object({
  amount: z.string(),
  apiKey: z.string().optional(),
  gateway: z.string(),
  mnemonic: z.string(),
  receiver: z
    .string()
    .regex(
      /^0x[0-9a-fA-F]{40}$/,
      "EVM address must be 0x-prefixed 20-byte hex"
    ),
  rpc: z.string(),
});

export const depositAndCallOptionsSchema = z.object({
  amount: z.string(),
  apiKey: z.string().optional(),
  data: z.string().optional(),
  gateway: z.string(),
  mnemonic: z.string(),
  receiver: z
    .string()
    .regex(
      /^0x[0-9a-fA-F]{40}$/,
      "EVM address must be 0x-prefixed 20-byte hex"
    ),
  rpc: z.string(),
  types: z.array(z.string()).optional(),
  values: z.array(z.string()).optional(),
});
