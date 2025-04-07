export type Pair = {
  key: string;
  tokenA: string;
  tokenB: string;
};

export interface Reserves {
  _blockTimestampLast: number;
  _reserve0: bigint;
  _reserve1: bigint;
}

export interface Zrc20Details {
  [key: string]: {
    decimals?: number;
    symbol?: string;
  };
}

interface PoolToken {
  address: string;
  decimals?: number;
  reserve: bigint;
  symbol?: string;
}

export interface Pool {
  pair: string;
  t0: PoolToken;
  t1: PoolToken;
}
