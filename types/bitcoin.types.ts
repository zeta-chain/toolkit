import { z } from "zod";

import { DEFAULT_ACCOUNT_NAME } from "./shared.constants";
import {
  hexStringSchema,
  typesAndDataExclusivityRefineRule,
  typesAndValuesLengthRefineRule,
  validAmountSchema,
} from "./shared.schema";

export interface BtcUtxo {
  status: {
    block_hash: string;
    block_height: number;
    block_time: number;
    confirmed: boolean;
  };
  txid: string;
  value: number;
  vout: number;
}

export interface BtcVout {
  scriptpubkey: string; // The scriptpubkey is a hex-encoded string
  value: number; // The value of the output in satoshis
}

export interface BtcVin {
  prevout?: BtcVout;
  scriptsig: string;
  scriptsig_asm?: string;
  sequence: number;
  txid: string;
  vout: number;
  witness?: string[];
}

export interface BtcTxById {
  fee: number;
  locktime: number;
  size: number;
  status: {
    block_hash: string;
    block_height: number;
    block_time: number;
    confirmed: boolean;
  };
  txid: string;
  version: number;
  vin: BtcVin[];
  vout: BtcVout[];
  weight: number;
}

export const bitcoinMethods = ["inscription", "memo"] as const;

export const depositAndCallOptionsSchema = z
  .object({
    amount: validAmountSchema,
    api: z.string().url(),
    data: hexStringSchema.optional(),
    gateway: z.string(),
    method: z.enum(bitcoinMethods).default("inscription"),
    name: z.string().optional().default(DEFAULT_ACCOUNT_NAME),
    privateKey: z.string().optional(),
    receiver: z.string().optional(),
    revertAddress: z.string().optional(),
    types: z.array(z.string()).optional(),
    values: z.array(z.string()).optional(),
  })
  .refine(typesAndValuesLengthRefineRule.rule, {
    message: typesAndValuesLengthRefineRule.message,
    path: typesAndValuesLengthRefineRule.path,
  })
  .refine(typesAndDataExclusivityRefineRule.rule, {
    message: typesAndDataExclusivityRefineRule.message,
    path: typesAndDataExclusivityRefineRule.path,
  });

export const depositOptionsSchema = z.object({
  amount: z.string().refine((val) => !isNaN(Number(val)) && Number(val) > 0, {
    message: "Amount must be a valid positive number",
  }),
  api: z.string().url(),
  data: hexStringSchema.optional(),
  gateway: z.string(),
  method: z.enum(bitcoinMethods).default("inscription"),
  name: z.string().optional().default(DEFAULT_ACCOUNT_NAME),
  privateKey: z.string().optional(),
  receiver: z.string().optional(),
  revertAddress: z.string().optional(),
});

export const callOptionsSchema = z
  .object({
    api: z.string().url(),
    data: hexStringSchema.optional(),
    gateway: z.string(),
    method: z.enum(bitcoinMethods).default("inscription"),
    name: z.string().optional().default(DEFAULT_ACCOUNT_NAME),
    privateKey: z.string().optional(),
    receiver: z.string().optional(),
    revertAddress: z.string().optional(),
    types: z.array(z.string()).optional(),
    values: z.array(z.string()).optional(),
  })
  .refine(typesAndValuesLengthRefineRule.rule, {
    message: typesAndValuesLengthRefineRule.message,
    path: typesAndValuesLengthRefineRule.path,
  })
  .refine(typesAndDataExclusivityRefineRule.rule, {
    message: typesAndDataExclusivityRefineRule.message,
    path: typesAndDataExclusivityRefineRule.path,
  });
