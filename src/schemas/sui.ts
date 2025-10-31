import { Ed25519Keypair } from "@mysten/sui/keypairs/ed25519";
import { z } from "zod";

import { chainIds } from "../../utils/sui";

export const suiOptionsSchema = z.object({
  chainId: z.enum(chainIds),
  gasLimit: z.string().optional(),
  gatewayObject: z.string().optional(),
  gatewayPackage: z.string().optional(),
  signer: z.instanceof(Ed25519Keypair),
});

// Browser-friendly schema without Ed25519Keypair requirement
export const suiBrowserOptionsSchema = z.object({
  chainId: z.enum(chainIds),
  gasLimit: z.string().optional(),
  gatewayObject: z.string().optional(),
  gatewayPackage: z.string().optional(),
  signerAddress: z.string().optional(), // Optional: only needed for non-native token transfers
});

export const suiDepositParamsSchema = z.object({
  amount: z.string(),
  receiver: z.string(),
  token: z.string().optional(),
});

export const suiDepositAndCallParamsSchema = z.object({
  amount: z.string(),
  receiver: z.string(),
  token: z.string().optional(),
  types: z.array(z.string()),
  values: z.array(z.union([z.string(), z.bigint(), z.boolean()])),
});
