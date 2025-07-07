import { ethers } from "ethers";
import { z } from "zod";

import {
  bigNumberishSchema,
  evmAddressSchema,
} from "../../types/shared.schema";
import { revertOptionsSchema } from "./evm";

export const zetachainOptionsSchema = z.object({
  gateway: z.string().optional(),
  signer: z.instanceof(ethers.Wallet),
  txOptions: z
    .object({
      gasLimit: bigNumberishSchema.optional(),
      gasPrice: bigNumberishSchema.optional(),
      value: bigNumberishSchema.optional(),
    })
    .optional(),
});

export const callOptionsSchema = z.object({
  gasLimit: bigNumberishSchema,
  isArbitraryCall: z.boolean(),
});

export const zetachainCallParamsSchema = z.object({
  callOptions: callOptionsSchema,
  data: z.string().optional(),
  function: z.string().optional(),
  receiver: z.string(),
  revertOptions: revertOptionsSchema,
  types: z.array(z.string()).optional(),
  values: z.array(z.union([z.string(), z.bigint(), z.boolean()])).optional(),
  zrc20: evmAddressSchema,
});

export const zetachainWithdrawParamsSchema = z.object({
  amount: z.string(),
  receiver: z.string(),
  revertOptions: revertOptionsSchema,
  zrc20: evmAddressSchema,
});

export const zetachainWithdrawAndCallParamsSchema = z.object({
  amount: z.string(),
  callOptions: callOptionsSchema,
  data: z.string().optional(),
  function: z.string().optional(),
  receiver: z.string(),
  revertOptions: revertOptionsSchema,
  types: z.array(z.string()).optional(),
  values: z.array(z.union([z.string(), z.bigint(), z.boolean()])).optional(),
  zrc20: evmAddressSchema,
});
