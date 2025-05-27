import { z } from "zod";

export const depositOptionsSchema = z.object({
  amount: z.string(),
  apiKey: z.string().optional(),
  endpoint: z.string(),
  gateway: z.string(),
  mnemonic: z.string(),
  receiver: z
    .string()
    .regex(
      /^0x[0-9a-fA-F]{40}$/,
      "EVM address must be 0x-prefixed 20-byte hex"
    ),
});
