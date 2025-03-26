export interface ConvertGasToZetaResponse {
  ZetaBlockHeight: string;
  outboundGasInZeta: string;
  protocolFeeInZeta: string;
}

export type FeeItem = {
  address: string;
  asset?: string;
  category: string;
  chain_id: string;
  chain_name: string;
  coin_type?: string;
  decimals?: number;
  description?: string;
  foreign_chain_id?: number;
  gasFee: string;
  protocolFee: string;
  symbol?: string;
  totalFee: string;
  type: string;
};
