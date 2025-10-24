import { z } from "zod";

import { DEFAULT_EVM_RPC_URL } from "../../constants/api";

export const contractsListOptionsSchema = z.object({
  columns: z.array(z.enum(["type", "address"])).default(["type", "address"]),
  json: z.boolean().default(false),
  rpc: z.string().default(DEFAULT_EVM_RPC_URL),
});

export const contractsShowOptionsSchema = z.object({
  chainId: z.string(),
  rpc: z.string().default(DEFAULT_EVM_RPC_URL),
  type: z.string(),
});
