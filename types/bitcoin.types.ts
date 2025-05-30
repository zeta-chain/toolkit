import * as bitcoin from "bitcoinjs-lib";
import { z } from "zod";

import { EncodingFormat } from "../utils/bitcoinEncode";
import { DEFAULT_ACCOUNT_NAME } from "./shared.constants";
import {
  evmAddressSchema,
  hexStringSchema,
  typesAndDataExclusivityRefineRule,
  typesAndValuesLengthRefineRule,
  validAmountSchema,
} from "./shared.schema";

const enumKeys = Object.keys(EncodingFormat).filter(
  (k) => isNaN(Number(k)) // filters out numeric reverse mappings
) as [keyof typeof EncodingFormat, ...Array<keyof typeof EncodingFormat>];

const encodingFormatSchema = z
  .enum(enumKeys)
  .transform((val) => EncodingFormat[val]);

export const formatEncodingChoices = Object.keys(EncodingFormat).filter((key) =>
  isNaN(Number(key))
);

export interface BitcoinTxParams {
  address: string;
  amount: number;
  api: string;
  depositFee: number;
  gateway: string;
  key: bitcoin.Signer;
  memo?: string;
  networkFee: number;
  utxos: BtcUtxo[];
}

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

export const inscriptionDepositAndCallOptionsSchema = z
  .object({
    amount: validAmountSchema,
    bitcoinApi: z.string().url(),
    data: hexStringSchema.optional(),
    encodingFormat: encodingFormatSchema,
    gasPriceApi: z.string().url(),
    gateway: z.string(),
    name: z.string().optional().default(DEFAULT_ACCOUNT_NAME),
    privateKey: z.string().optional(),
    receiver: evmAddressSchema.optional(),
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

export const inscriptionDepositOptionsSchema = z.object({
  amount: z.string().refine((val) => !isNaN(Number(val)) && Number(val) > 0, {
    message: "Amount must be a valid positive number",
  }),
  bitcoinApi: z.string().url(),
  data: hexStringSchema.optional(),
  encodingFormat: encodingFormatSchema,
  gasPriceApi: z.string().url(),
  gateway: z.string(),
  name: z.string().optional().default(DEFAULT_ACCOUNT_NAME),
  privateKey: z.string().optional(),
  receiver: evmAddressSchema.optional(),
  revertAddress: z.string().optional(),
});

export const inscriptionCallOptionsSchema = z
  .object({
    bitcoinApi: z.string().url(),
    data: hexStringSchema.optional(),
    encodingFormat: encodingFormatSchema,
    gasPriceApi: z.string().url(),
    gateway: z.string(),
    name: z.string().optional().default(DEFAULT_ACCOUNT_NAME),
    privateKey: z.string().optional(),
    receiver: evmAddressSchema.optional(),
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

export const memoDepositAndCallOptionsSchema = z.object({
  amount: validAmountSchema,
  bitcoinApi: z.string().url(),
  data: hexStringSchema.optional(),
  gasPriceApi: z.string().url(),
  gateway: z.string(),
  name: z.string().optional().default(DEFAULT_ACCOUNT_NAME),
  networkFee: z.string(),
  privateKey: z.string().optional(),
  receiver: evmAddressSchema,
});

export const memoDepositOptionsSchema = z.object({
  amount: z.string().refine((val) => !isNaN(Number(val)) && Number(val) > 0, {
    message: "Amount must be a valid positive number",
  }),
  bitcoinApi: z.string().url(),
  data: hexStringSchema.optional(),
  gasPriceApi: z.string().url(),
  gateway: z.string(),
  name: z.string().optional().default(DEFAULT_ACCOUNT_NAME),
  networkFee: z.string(),
  privateKey: z.string().optional(),
  receiver: evmAddressSchema,
});

export const memoCallOptionsSchema = z.object({
  bitcoinApi: z.string().url(),
  data: hexStringSchema.optional(),
  gasPriceApi: z.string().url(),
  gateway: z.string(),
  name: z.string().optional().default(DEFAULT_ACCOUNT_NAME),
  networkFee: z.string(),
  privateKey: z.string().optional(),
  receiver: evmAddressSchema,
});
