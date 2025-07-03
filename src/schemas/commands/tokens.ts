import { z } from "zod";

import { DEFAULT_API_URL } from "../../constants/tokens";

export const tokensListOptionsSchema = z.object({
  api: z.string().default(DEFAULT_API_URL),
  columns: z.array(z.enum(["asset", "type", "decimals"])).default([]),
  json: z.boolean().default(false),
});

export const tokensShowOptionsSchema = z.object({
  api: z.string().default(DEFAULT_API_URL),
  field: z.string().optional(),
  json: z.boolean().default(false),
  symbol: z.string(),
});
