import { ethers } from "ethers";
import { z } from "zod";

import {
  DEFAULT_FACTORY,
  DEFAULT_FEE,
  DEFAULT_RPC,
  DEFAULT_WZETA,
} from "../packages/commands/src/pools/constants";

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
  fee: z.number().default(DEFAULT_FEE),
  pool: z.string().optional(),
  rpc: z.string().default(DEFAULT_RPC),
  tokens: z.array(z.string()).optional(),
});

export const addLiquidityOptionsSchema = z.object({
  amounts: z.array(z.string()).min(2).max(2),
  privateKey: z.string(),
  recipient: z.string().optional(),
  rpc: z.string().default(DEFAULT_RPC),
  tickLower: z.number().optional(),
  tickUpper: z.number().optional(),
  tokens: z.array(z.string()).min(2).max(2),
});

export const createPoolOptionsSchema = z.object({
  factory: z.string().default(DEFAULT_FACTORY),
  fee: z.string().default(DEFAULT_FEE.toString()),
  initialPrice: z.string().optional(),
  privateKey: z.string(),
  rpc: z.string().default(DEFAULT_RPC),
  tokens: z.array(evmAddressSchema).length(2),
});

export const deployOptionsSchema = z.object({
  privateKey: z.string(),
  rpc: z.string().default(DEFAULT_RPC),
  wzeta: z.string().default(DEFAULT_WZETA),
});

export type ShowPoolOptions = z.infer<typeof showPoolOptionsSchema>;
export type AddLiquidityOptions = z.infer<typeof addLiquidityOptionsSchema>;
export type CreatePoolOptions = z.infer<typeof createPoolOptionsSchema>;
export type DeployOptions = z.infer<typeof deployOptionsSchema>;
