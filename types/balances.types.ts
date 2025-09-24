import { Contract, ContractMethod, ethers } from "ethers";

import { OmitIndexSignature } from "./shared.types";

export interface TokenBalance {
  balance: string;
  chain_id: bigint | string | null;
  chain_name?: string;
  coin_type: string;
  contract?: string;
  decimals: number;
  id: `${string}__${string}`;
  symbol: string;
  ticker?: string;
  zrc20?: string;
}

export interface Token {
  chain_id: bigint | string | null;
  chain_name?: string;
  coin_type: string;
  contract?: string;
  decimals: number;
  symbol: string;
  ticker?: string;
  zrc20?: string;
}

export type TokenContract = ethers.Contract & {
  balanceOf: (address: string) => Promise<number>;
};

interface TokenAccountByOwner {
  account: {
    data: {
      parsed: {
        info: {
          tokenAmount: {
            amount: string;
            decimals: number;
          };
        };
      };
    };
  };
}

export interface RpcSolTokenByAccountResponse {
  result: {
    value: TokenAccountByOwner[];
  };
}

export const MULTICALL3_ABI = [
  {
    inputs: [
      {
        components: [
          { internalType: "address", name: "target", type: "address" },
          { internalType: "bytes", name: "callData", type: "bytes" },
        ],
        internalType: "struct IMulticall3.Call[]",
        name: "calls",
        type: "tuple[]",
      },
    ],
    name: "aggregate",
    outputs: [
      { internalType: "uint256", name: "blockNumber", type: "uint256" },
      { internalType: "bytes[]", name: "returnData", type: "bytes[]" },
    ],
    stateMutability: "view",
    type: "function",
  },
];

export interface Call {
  callData: ethers.BytesLike;
  target: string;
}

type AggregateResult = [blockNumber: bigint, returnData: string[]];

export interface MulticallContract extends OmitIndexSignature<Contract> {
  aggregate?: ContractMethod<[calls: Call[]], AggregateResult, AggregateResult>;
}

export interface GetBalancesOptions {
  btcAddress?: string;
  evmAddress?: string;
  solanaAddress?: string;
  suiAddress?: string;
}
