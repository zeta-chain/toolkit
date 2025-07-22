import { z } from "zod";

import { DEFAULT_EVM_RPC_URL } from "../../constants/api";

export const contractsListOptionsSchema = z.object({
  rpc: z.string().default(DEFAULT_EVM_RPC_URL),
  columns: z.array(z.enum(["type", "address"])).default([]),
  json: z.boolean().default(false),
});

export const contractsShowOptionsSchema = z.object({
  rpc: z.string().default(DEFAULT_EVM_RPC_URL),
  json: z.boolean().default(false),
  chainId: z.string(),
  type: z.string(),
});
