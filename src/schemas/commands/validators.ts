import { z } from "zod";

import { DEFAULT_EVM_RPC_URL } from "../../constants/api";

export const validatorsListOptionsSchema = z.object({
  rpc: z.string().default(DEFAULT_EVM_RPC_URL),
  status: z
    .enum(["Bonded", "Unbonding", "Unbonded", "Unspecified"])
    .default("Bonded"),
  limit: z
    .preprocess(
      (v) => (typeof v === "string" ? parseInt(v, 10) : v),
      z.number().int().positive()
    )
    .default(50),
  json: z.boolean().default(false),
  decimals: z
    .preprocess(
      (v) => (typeof v === "string" ? parseInt(v, 10) : v),
      z.number().int().min(0).max(36)
    )
    .default(18),
});

export type ValidatorsListOptions = z.infer<typeof validatorsListOptionsSchema>;
