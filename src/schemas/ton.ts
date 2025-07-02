import { z } from "zod";

export const tonOptionsSchema = z.object({
  apiKey: z.string().optional(),
  chainId: z.string(),
  gateway: z.string().optional(),
  rpc: z.string().url(),
});

export const tonDepositParamsSchema = z.object({
  amount: z.string(),
  receiver: z.string(),
});

export const tonDepositSchema = z.object({
  options: tonOptionsSchema,
  params: tonDepositParamsSchema,
});

export const tonDepositAndCallParamsSchema = z.object({
  amount: z.string(),
  data: z.string().optional(),
  receiver: z.string(),
  types: z.array(z.string()).optional(),
  values: z.array(z.union([z.string(), z.bigint(), z.boolean()])).optional(),
});

export const tonDepositAndCallSchema = z.object({
  options: tonOptionsSchema,
  params: tonDepositAndCallParamsSchema,
});

// Call functionality (for future implementation)
export const tonCallParamsSchema = z.object({
  receiver: z.string(),
  types: z.array(z.string()),
  values: z.array(z.union([z.string(), z.bigint(), z.boolean()])),
});

export const tonCallSchema = z.object({
  options: tonOptionsSchema,
  params: tonCallParamsSchema,
});
