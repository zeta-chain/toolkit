import { ethers } from "ethers";
import { z } from "zod";

import { bigNumberishSchema } from "../../types/shared.schema";
import { isValidEthersSigner } from "../../utils/validateSigner";

export const revertOptionsSchema = z.object({
  abortAddress: z.string().optional(),
  callOnRevert: z.boolean(),
  onRevertGasLimit: bigNumberishSchema.optional(),
  revertAddress: z.string().optional(),
  revertMessage: z.string(),
});

export const txOptionsSchema = z.object({
  gasLimit: bigNumberishSchema.optional(),
  gasPrice: bigNumberishSchema.optional(),
  value: bigNumberishSchema.optional(),
});

export const evmOptionsSchema = z.object({
  gateway: z.string().optional(),
  signer: z.custom<ethers.AbstractSigner>(isValidEthersSigner, {
    message: "signer must be an ethers Signer",
  }),
  txOptions: txOptionsSchema.optional(),
});

export const evmCallParamsSchema = z.object({
  receiver: z.string(),
  revertOptions: revertOptionsSchema,
  types: z.array(z.string()),
  values: z.array(z.union([z.string(), z.bigint(), z.boolean()])),
});

export const evmDepositParamsSchema = z.object({
  amount: z.string(),
  receiver: z.string(),
  revertOptions: revertOptionsSchema,
  token: z.string().optional(),
});

export const evmDepositAndCallParamsSchema = z.object({
  amount: z.string(),
  receiver: z.string(),
  revertOptions: revertOptionsSchema,
  token: z.string().optional(),
  types: z.array(z.string()),
  values: z.array(z.union([z.string(), z.bigint(), z.boolean()])),
});
