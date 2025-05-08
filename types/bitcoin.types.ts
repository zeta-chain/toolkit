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
export const depositAndCallOptionsSchema = z
  .object({
    amount: z.string().refine((val) => !isNaN(Number(val)) && Number(val) > 0, {
      message: "Amount must be a valid positive number",
    }),
    api: z.string().url(),
    data: z.string().optional(),
    gateway: z.string(),
    privateKey: z.string().min(1, "Private key is required"),
    receiver: z.string().optional(),
    revertAddress: z.string().optional(),
    types: z.array(z.string()).optional(),
    values: z.array(z.string()).optional(),
  })
  .refine(
    (data) => {
      // Only check length equality if both arrays exist
      if (data.types && data.values) {
        return data.types.length === data.values.length;
      }
      // If one exists and the other doesn't, that's invalid
      if ((data.types && !data.values) || (!data.types && data.values)) {
        return false;
      }
      // If both are undefined/not provided, that's valid
      return true;
    },
    {
      message:
        "If provided, the 'types' and 'values' arrays must both exist and have the same length",
      path: ["values"],
    }
  );
