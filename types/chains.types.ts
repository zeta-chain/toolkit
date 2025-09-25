import { ForeignCoinsSDKType } from "@zetachain/sdk-cosmos/zetachain/zetacore/fungible/foreign_coins";
import { ChainParamsSDKType } from "@zetachain/sdk-cosmos/zetachain/zetacore/observer/params";
import { ChainSDKType } from "@zetachain/sdk-cosmos/zetachain/zetacore/pkg/chains/chains";

export interface ChainTokenMap {
  [chainId: string]: string[];
}

export interface ChainConfirmationMap {
  [chainId: string]: string;
}

export interface ChainData {
  chainParams: ChainParamsSDKType[];
  chains: ChainSDKType[];
  tokens: ForeignCoinsSDKType[];
}

export const SOLANA_CHAIN_IDS = ["900", "901"] as const;
export const SUI_CHAIN_IDS = ["101", "103"] as const;

export type SolanaChainId = (typeof SOLANA_CHAIN_IDS)[number];
export type SuiChainId = (typeof SUI_CHAIN_IDS)[number];
