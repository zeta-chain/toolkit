export interface CrossChainTx {
  creator: string;
  index: string;
  zeta_fees: string;
  relayed_message: string;
  cctx_status: {
    status: string;
    status_message: string;
    error_message: string;
    lastUpdate_timestamp: string;
    isAbortRefunded: boolean;
    created_timestamp: string;
    error_message_revert: string;
    error_message_abort: string;
  };
  inbound_params: {
    sender: string;
    sender_chain_id: string;
    tx_origin: string;
    coin_type: string;
    asset: string;
    amount: string;
    observed_hash: string;
    observed_external_height: string;
    ballot_index: string;
    finalized_zeta_height: string;
    tx_finalization_status: string;
    is_cross_chain_call: boolean;
    status: string;
    confirmation_mode: string;
  };
  outbound_params: Array<{
    receiver: string;
    receiver_chainId: string;
    coin_type: string;
    amount: string;
    tss_nonce: string;
    gas_limit: string;
    gas_price: string;
    gas_priority_fee: string;
    hash: string;
    ballot_index: string;
    observed_external_height: string;
    gas_used: string;
    effective_gas_price: string;
    effective_gas_limit: string;
    tss_pubkey: string;
    tx_finalization_status: string;
    call_options: {
      gas_limit: string;
      is_arbitrary_call: boolean;
    };
    confirmation_mode: string;
  }>;
  protocol_contract_version: string;
  revert_options: {
    revert_address: string;
    call_on_revert: boolean;
    abort_address: string;
    revert_message: string;
    revert_gas_limit: string;
  };
}
