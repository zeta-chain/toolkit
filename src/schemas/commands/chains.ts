import { z } from "zod";

import { DEFAULT_API_URL } from "../../constants/api";

export const chainsListOptionsSchema = z.object({
  api: z.string().default(DEFAULT_API_URL),
  json: z.boolean().default(false),
});

export const chainsShowOptionsSchema = z.object({
  api: z.string().default(DEFAULT_API_URL),
  chain: z.string(),
  field: z.string().optional(),
  json: z.boolean().default(false), // can be chain_id or chain_name
});
