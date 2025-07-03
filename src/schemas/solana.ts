import * as anchor from "@coral-xyz/anchor";
import { z } from "zod";

export const revertOptionsSchema = z.object({
  abortAddress: z.string().optional(),
  callOnRevert: z.boolean(),
  onRevertGasLimit: z.union([z.string(), z.number(), z.bigint()]).optional(),
  revertAddress: z.string().optional(),
  revertMessage: z.string(),
});

export const solanaOptionsSchema = z.object({
  chainId: z.string(),
  signer: z.instanceof(anchor.web3.Keypair),
});

export const solanaCallParamsSchema = z.object({
  receiver: z.string(),
  revertOptions: revertOptionsSchema,
  types: z.array(z.string()),
  values: z.array(z.union([z.string(), z.bigint(), z.boolean()])),
});

export const solanaDepositParamsSchema = z.object({
  amount: z.string(),
  receiver: z.string(),
  revertOptions: revertOptionsSchema,
  token: z.string().optional(),
});

export const solanaDepositAndCallParamsSchema = z.object({
  amount: z.string(),
  receiver: z.string(),
  revertOptions: revertOptionsSchema,
  token: z.string().optional(),
  types: z.array(z.string()),
  values: z.array(z.union([z.string(), z.bigint(), z.boolean()])),
});
