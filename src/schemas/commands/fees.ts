import { z } from "zod";

import { DEFAULT_API_URL, DEFAULT_EVM_RPC_URL } from "../../constants/api";

export const feesParamsSchema = z.object({
  gasLimit: z.string().optional(),
});

export const feesOptionsSchema = z.object({
  api: z.string().default(DEFAULT_API_URL),
  rpc: z.string().default(DEFAULT_EVM_RPC_URL),
});

export const feesCLIOptionsSchema = feesOptionsSchema.extend({
  json: z.boolean().default(false),
});

export const feesShowOptionsSchema = z.object({
  source: z.string().optional(),
  json: z.boolean().default(false),
  rpc: z.string().default(DEFAULT_EVM_RPC_URL),
  api: z.string().default(DEFAULT_API_URL),
  target: z.string().optional(),
  targetChain: z.string().optional(),
});
