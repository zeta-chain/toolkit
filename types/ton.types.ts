import { z } from "zod";

import { DEFAULT_ACCOUNT_NAME } from "./shared.constants";
import {
  evmAddressSchema,
  typesAndValuesLengthRefineRule,
  validAmountSchema,
} from "./shared.schema";

export const baseTonOptionsSchema = z.object({
  apiKey: z.string().optional(),
  gateway: z.string(),
  mnemonic: z.string().optional(),
  name: z.string().default(DEFAULT_ACCOUNT_NAME),
  receiver: evmAddressSchema,
  rpc: z.string().url(),
});

export const depositOptionsSchema = baseTonOptionsSchema.extend({
  amount: validAmountSchema,
});

export const depositAndCallOptionsSchema = baseTonOptionsSchema
  .extend({
    amount: validAmountSchema,
    data: z.string().optional(),
    types: z.array(z.string()).optional(),
    values: z.array(z.string()).optional(),
  })
  .refine(typesAndValuesLengthRefineRule.rule, {
    message: typesAndValuesLengthRefineRule.message,
    path: typesAndValuesLengthRefineRule.path,
  });
