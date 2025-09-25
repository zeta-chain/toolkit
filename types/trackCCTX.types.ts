import { z } from "zod";

export interface Emitter {
  emit(event: "add", payload: { hash: string; text: string }): void;
  emit(
    event: "succeed" | "fail" | "update",
    payload: { hash: string; text: string }
  ): void;
  emit(
    event: "search-add" | "search-end" | "search-fail" | "search-update",
    payload: { text: string }
  ): void;
  emit(event: "mined-fail" | "mined-success", payload: { cctxs: CCTXs }): void;
}

export interface CCTX {
  confirmed_on_destination: boolean;
  outbound_tx_hash: string;
  outbound_tx_tss_nonce: number;
  receiver_chainId: string;
  sender_chain_id: string;
  status: string;
  status_message: string;
}
export type CCTXs = Record<string, CCTX[]>;

export type Spinners = Record<string, boolean>;

export interface PendingNonce {
  chain_id: string;
  nonce_high: string;
  nonce_low: string;
  tss: string;
}

interface Pagination {
  next_key: null | string;
  total: string;
}

export interface PendingNoncesResponse {
  pagination: Pagination;
  pending_nonces: PendingNonce[];
}

const InboundHashToCctxResponseSchema = z.object({
  inboundHashToCctx: z.object({
    cctx_index: z.array(z.string()),
    inbound_hash: z.string(),
  }),
});

export type InboundHashToCctxResponseReturnType = z.infer<
  typeof InboundHashToCctxResponseSchema
>;

export interface TssResponse {
  TSS: {
    finalizedZetaHeight: string;
    keyGenZetaHeight: string;
    operator_address_list: string[];
    tss_participant_list: string[];
    tss_pubkey: string;
  };
}
