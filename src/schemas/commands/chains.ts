import { z } from "zod";

import {
  DEFAULT_API_MAINNET_URL,
  DEFAULT_API_TESTNET_URL,
  DEFAULT_API_URL,
} from "../../constants/api";

export const chainsListOptionsSchema = z.object({
  api: z.string().default(DEFAULT_API_URL),
  json: z.boolean().default(false),
});

// For backwards-compatibility we still allow `--api`, but prefer the explicit
// network-specific flags.
export const chainsShowOptionsSchema = z.object({
  api: z.string().default(DEFAULT_API_URL).optional(),
  apiMainnet: z.string().default(DEFAULT_API_MAINNET_URL),
  apiTestnet: z.string().default(DEFAULT_API_TESTNET_URL),
  chain: z.string(),
  field: z.string().optional(),
  json: z.boolean().default(false), // can be chain_id or chain_name
});
