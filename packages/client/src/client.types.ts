type ChainDenom = {
  denom: string;
  exponent: number;
};

type ChainAsset = {
  base: string;
  denoms: ChainDenom[];
  symbol: string;
};

type ChainFeeAsset = {
  denom: string;
  gas: number;
  gas_price: number;
};

type ChainFees = {
  assets: ChainFeeAsset[];
};

type ChainApp = {
  address: string;
  tx: string;
  type: string;
  url: string;
};

type ChainAPI = {
  type: string;
  url: string;
};

type ChainStaking = {
  denom: string;
};

export type ChainData = {
  api?: ChainAPI[];
  apps?: ChainApp[];
  assets?: ChainAsset[];
  bech32_prefix?: string;
  chain_aliases?: string[];
  chain_id: number;
  chain_name: string;
  fees?: ChainFees;
  staking?: ChainStaking;
};
