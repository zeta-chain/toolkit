import { z } from "zod";

import { evmAddressSchema } from "./shared.schema";

const chainMetaSchema = z.object({
  id: z.string().optional(),
  name: z.string().optional(),
});

const targetSchema = z.object({
  chain: chainMetaSchema,
  decimals: z.number(),
  fee: z.string(),
  symbol: z.string(),
  zrc20: evmAddressSchema,
});

const sourceSchema = z.object({
  amount: z.string(),
  chain: chainMetaSchema,
  decimals: z.number(),
  equalsGas: z.boolean().optional(),
  symbol: z.string(),
  zrc20: evmAddressSchema,
});

export const showFeesDataSchema = z.object({
  source: sourceSchema.optional(),
  target: targetSchema,
});
