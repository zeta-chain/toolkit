import { z } from "zod";

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

/**
 * Schema for the deposit-and-call command options
 */
export const depositAndCallOptionsSchema = z.object({
  amount: z.string(),
  api: z.string().url(),
  gateway: z.string(),
  privateKey: z.string(),
  receiver: z.string(),
  revertAddress: z.string(),
  types: z.array(z.string()),
  values: z.array(z.string()),
});
