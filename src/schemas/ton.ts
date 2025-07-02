import { KeyPair } from "@ton/crypto";
import { WalletContractV4 } from "@ton/ton";
import { z } from "zod";

export const tonOptionsSchema = z.object({
  apiKey: z.string().optional(),
  chainId: z.string(),
  gateway: z.string().optional(),
  keyPair: z.custom<KeyPair>().optional(),
  rpc: z.string().url(),
  signer: z.string().optional(),
  wallet: z.custom<WalletContractV4>().optional(),
});

export const tonDepositParamsSchema = z.object({
  amount: z.string(),
  receiver: z.string(),
});

export const tonDepositAndCallParamsSchema = z.object({
  amount: z.string(),
  data: z.string().optional(),
  receiver: z.string(),
  types: z.array(z.string()).optional(),
  values: z.array(z.union([z.string(), z.bigint(), z.boolean()])).optional(),
});
