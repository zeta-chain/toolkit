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

export const chainsShowOptionsSchema = z
  .object({
    apiMainnet: z.string().default(DEFAULT_API_MAINNET_URL),
    apiTestnet: z.string().default(DEFAULT_API_TESTNET_URL),
    chainId: z.string().optional(),
    chainName: z.string().optional(),
    field: z.string().optional(),
    json: z.boolean().default(false),
  })
  .refine(
    (data) => {
      const hasChain = !!data.chainName;
      const hasChainId = !!data.chainId;
      return (hasChain || hasChainId) && !(hasChain && hasChainId);
    },
    {
      message:
        "Either --chain-name or --chain-id must be provided, but not both",
    }
  );
