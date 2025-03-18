export interface ForeignCoin {
  asset: string;
  coin_type: string;
  decimals: number;
  foreign_chain_id: string;
  gas_limit: string;
  liquidity_cap: string;
  name: string;
  paused: boolean;
  symbol: string;
  zrc20_contract_address: string;
}

export interface ForeignCoinsResponse {
  foreignCoins: ForeignCoin[];
  pagination: {
    next_key: string | null;
    total: string;
  };
}
