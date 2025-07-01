import { ethers } from "ethers";
import { z } from "zod";

// Base schemas for common types
const revertOptionsSchema = z.object({
  abortAddress: z.string().optional(),
  callOnRevert: z.boolean(),
  onRevertGasLimit: z.union([z.string(), z.number(), z.bigint()]).optional(),
  revertAddress: z.string().optional(),
  revertMessage: z.string(),
});

const txOptionsSchema = z.object({
  gasLimit: z.union([z.string(), z.number(), z.bigint()]).optional(),
  gasPrice: z.union([z.string(), z.number(), z.bigint()]).optional(),
  value: z.union([z.string(), z.number(), z.bigint()]).optional(),
});

const evmOptionsSchema = z.object({
  gateway: z.string().optional(),
  signer: z.instanceof(ethers.Wallet),
  txOptions: txOptionsSchema.optional(),
});

// EVM Call schemas
const evmCallParamsSchema = z.object({
  receiver: z.string(),
  revertOptions: revertOptionsSchema,
  types: z.array(z.string()),
  values: z.array(z.union([z.string(), z.bigint(), z.boolean()])),
});

export const evmCallSchema = z.object({
  options: evmOptionsSchema,
  params: evmCallParamsSchema,
});

// EVM Deposit schemas
const evmDepositParamsSchema = z.object({
  amount: z.string(),
  receiver: z.string(),
  revertOptions: revertOptionsSchema,
  token: z.string().optional(),
});

export const evmDepositSchema = z.object({
  options: evmOptionsSchema,
  params: evmDepositParamsSchema,
});

// EVM Deposit and Call schemas
const evmDepositAndCallParamsSchema = z.object({
  amount: z.string(),
  receiver: z.string(),
  revertOptions: revertOptionsSchema,
  token: z.string().optional(),
  types: z.array(z.string()),
  values: z.array(z.union([z.string(), z.bigint(), z.boolean()])),
});

export const evmDepositAndCallSchema = z.object({
  options: evmOptionsSchema,
  params: evmDepositAndCallParamsSchema,
});

// Export individual parameter schemas for convenience
export {
  evmCallParamsSchema,
  evmDepositAndCallParamsSchema,
  evmDepositParamsSchema,
  evmOptionsSchema,
  revertOptionsSchema,
  txOptionsSchema,
};
