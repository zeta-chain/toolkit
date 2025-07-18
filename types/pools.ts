import { ethers } from "ethers";
import { z } from "zod";

import {
  DEFAULT_FACTORY,
  DEFAULT_FEE,
  DEFAULT_RPC,
  DEFAULT_WZETA,
} from "../src/constants/pools";

export interface MintParams {
  amount0Desired: bigint;
  amount0Min: bigint;
  amount1Desired: bigint;
  amount1Min: bigint;
  deadline: number;
  fee: number;
  recipient: string;
  tickLower: number;
  tickUpper: number;
  token0: string;
  token1: string;
}

export interface PoolCreationError extends Error {
  receipt?: ethers.TransactionReceipt;
  transaction?: ethers.TransactionResponse;
}

export interface DeploymentError extends Error {
  receipt?: ethers.TransactionReceipt;
  transaction?: ethers.TransactionResponse;
}

export interface Slot0Result {
  feeProtocol: number;
  observationCardinality: number;
  observationCardinalityNext: number;
  observationIndex: number;
  sqrtPriceX96: bigint;
  tick: number;
  unlocked: boolean;
}

export const evmAddressSchema = z
  .string()
  .refine((val) => ethers.isAddress(val), "Must be a valid EVM address");

export const showPoolOptionsSchema = z.object({
  factory: z.string().default(DEFAULT_FACTORY),
  fee: z
    .string()
    .transform((val) => Number(val))
    .default(DEFAULT_FEE.toString()),
  pool: z.string().optional(),
  rpc: z.string().default(DEFAULT_RPC),
  tokens: z.array(z.string()).optional(),
});

export const addLiquidityOptionsSchema = z.object({
  amounts: z.array(z.string()).min(2).max(2),
  privateKey: z.string(),
  recipient: z.string().optional(),
  rpc: z.string().default(DEFAULT_RPC),
  tickLower: z
    .string()
    .transform((val) => Number(val))
    .optional(),
  tickUpper: z
    .string()
    .transform((val) => Number(val))
    .optional(),
  tokens: z.array(z.string()).min(2).max(2),
});

export const removeLiquidityOptionsSchema = z.object({
  burn: z.boolean().optional(),
  privateKey: z.string(),
  rpc: z.string().default(DEFAULT_RPC),
  tokenId: z
    .string()
    .regex(/^\d+$/, { message: "tokenId must be a numeric string" })
    .optional(),
});

export const createPoolOptionsSchema = z.object({
  factory: z.string().default(DEFAULT_FACTORY),
  fee: z.string().default(DEFAULT_FEE.toString()),
  prices: z.array(z.string()).length(2),
  privateKey: z.string(),
  rpc: z.string().default(DEFAULT_RPC),
  tokens: z.array(evmAddressSchema).length(2),
});

export const deployOptionsSchema = z.object({
  privateKey: z.string(),
  rpc: z.string().default(DEFAULT_RPC),
  wzeta: z.string().default(DEFAULT_WZETA),
});

export const showLiquidityOptionsSchema = z.object({
  privateKey: z.string(),
  rpc: z.string().default(DEFAULT_RPC),
});

export type ShowPoolOptions = z.infer<typeof showPoolOptionsSchema>;
export type AddLiquidityOptions = z.infer<typeof addLiquidityOptionsSchema>;
export type CreatePoolOptions = z.infer<typeof createPoolOptionsSchema>;
export type DeployOptions = z.infer<typeof deployOptionsSchema>;
export type RemoveLiquidityOptions = z.infer<
  typeof removeLiquidityOptionsSchema
>;
export type ShowLiquidityOptions = z.infer<typeof showLiquidityOptionsSchema>;
