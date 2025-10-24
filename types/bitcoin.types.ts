import { z } from "zod";

import { EncodingFormat } from "../src/chains/bitcoin/inscription/encode";
import {
  BITCOIN_FEES,
  DEFAULT_BITCOIN_API,
  DEFAULT_GAS_PRICE_API,
} from "./bitcoin.constants";
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
  memo?: string;
  network: "signet" | "mainnet";
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

export const baseBitcoinOptionsSchema = z.object({
  bitcoinApi: z.string().url().optional().default(DEFAULT_BITCOIN_API),
  gasPriceApi: z.string().url().optional().default(DEFAULT_GAS_PRICE_API),
  gateway: z.string(),
  name: z.string().optional().default(DEFAULT_ACCOUNT_NAME),
  privateKey: z.string().optional(),
});

export const baseBitcoinInscriptionOptionsSchema =
  baseBitcoinOptionsSchema.extend({
    abortAddress: z.string().optional(),
    commitFee: z
      .string()
      .optional()
      .default(BITCOIN_FEES.DEFAULT_COMMIT_FEE_SAT.toString())
      .transform((val) => Number(val)),
    data: hexStringSchema.optional(),
    format: encodingFormatSchema,
    network: z.enum(["signet", "mainnet"]).default("signet"),
    receiver: evmAddressSchema.optional(),
    revertAddress: z.string().optional(),
    revertMessage: z.string().optional(),
  });

const withCommonBitcoinInscriptionRefines = <
  TSchema extends z.ZodTypeAny,
  TOut = z.infer<TSchema>,
  TIn = z.input<TSchema>
>(
  schema: TSchema
): z.ZodEffects<TSchema, TOut, TIn> =>
  schema
    .refine(typesAndValuesLengthRefineRule.rule, {
      message: typesAndValuesLengthRefineRule.message,
      path: typesAndValuesLengthRefineRule.path,
    })
    .refine(typesAndDataExclusivityRefineRule.rule, {
      message: typesAndDataExclusivityRefineRule.message,
      path: typesAndDataExclusivityRefineRule.path,
    }) as unknown as z.ZodEffects<TSchema, TOut, TIn>;

export const inscriptionDepositAndCallOptionsSchema =
  withCommonBitcoinInscriptionRefines(
    baseBitcoinInscriptionOptionsSchema.extend({
      amount: validAmountSchema,
      types: z.array(z.string()).optional(),
      values: z.array(z.string()).optional(),
    })
  );

export const inscriptionDepositOptionsSchema =
  baseBitcoinInscriptionOptionsSchema.extend({
    amount: validAmountSchema,
  });

export const inscriptionCallOptionsSchema = withCommonBitcoinInscriptionRefines(
  baseBitcoinInscriptionOptionsSchema.extend({
    types: z.array(z.string()).optional(),
    values: z.array(z.string()).optional(),
  })
);

export const baseBitcoinMemoOptionsSchema = baseBitcoinOptionsSchema.extend({
  network: z.enum(["signet", "mainnet"]).default("signet"),
  networkFee: z.string(),
  receiver: evmAddressSchema,
});

export const memoDepositAndCallOptionsSchema =
  baseBitcoinMemoOptionsSchema.extend({
    amount: validAmountSchema,
    data: hexStringSchema.optional(),
  });

export const memoDepositOptionsSchema = baseBitcoinMemoOptionsSchema.extend({
  amount: validAmountSchema,
});

export const memoCallOptionsSchema = baseBitcoinMemoOptionsSchema.extend({
  data: hexStringSchema.optional(),
});
