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

export const InboundHashToCctxResponseSchema = z.object({
  inboundHashToCctx: z.object({
    cctx_index: z.array(z.string()),
    inbound_hash: z.string(),
  }),
});

export type InboundHashToCctxResponseReturnType = z.infer<
  typeof InboundHashToCctxResponseSchema
>;

export const CCTXResponseSchema = z.object({
  CrossChainTx: z.object({
    cctx_status: z.object({
      status: z.string(),
      status_message: z.string(),
    }),
    outbound_params: z.array(
      z.object({
        outbound_tx_hash: z.string(),
        outbound_tx_tss_nonce: z.number(),
        receiver_chainId: z.string(),
        sender_chain_id: z.string(),
      })
    ),
  }),
});

export interface CrossChainTxResponse {
  CrossChainTx: {
    cctx_status: {
      created_timestamp: string;
      error_message: string;
      error_message_revert: string;
      isAbortRefunded: boolean;
      lastUpdate_timestamp: string;
      status: "OutboundMined" | "Aborted" | "Reverted" | "Pending";
      status_message: string;
    };
    creator: string;
    inbound_params: {
      amount: string;
      asset: string;
      ballot_index: string;
      coin_type: "ERC20" | "ZRC20" | "Gas";
      finalized_zeta_height: string;
      is_cross_chain_call: boolean;
      observed_external_height: string;
      observed_hash: string;
      sender: string;
      sender_chain_id: string;
      status: "SUCCESS" | "FAILED";
      tx_finalization_status: string;
      tx_origin: string;
    };
    index: string;
    outbound_params: Array<{
      amount: string;
      ballot_index: string;
      call_options: {
        gas_limit: string;
        is_arbitrary_call: boolean;
      };
      coin_type: "ERC20" | "ZRC20" | "Gas";
      effective_gas_limit: string;
      effective_gas_price: string;
      gas_limit: string;
      gas_price: string;
      gas_priority_fee: string;
      gas_used: string;
      hash: string;
      observed_external_height: string;
      outbound_tx_hash: string;
      outbound_tx_tss_nonce: number;
      receiver: string;
      receiver_chainId: string;
      tss_nonce: string;
      tss_pubkey: string;
      tx_finalization_status: string;
    }>;
    protocol_contract_version: "V1" | "V2" | "V3";
    relayed_message: string;
    revert_options: {
      abort_address: string;
      call_on_revert: boolean;
      revert_address: string;
      revert_gas_limit: string;
      revert_message: string | null;
    };
    zeta_fees: string;
  };
}

export interface TssResponse {
  TSS: {
    finalizedZetaHeight: string;
    keyGenZetaHeight: string;
    operator_address_list: string[];
    tss_participant_list: string[];
    tss_pubkey: string;
  };
}
