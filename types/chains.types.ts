export interface ChainParams {
  chain_id: string;
  confirmation_count: string;
}

export interface ChainTokenMap {
  [chainId: string]: string[];
}

export interface ChainConfirmationMap {
  [chainId: string]: string;
}

export interface ChainData {
  chainParams: ChainParams[];
  chains: import("./supportedChains.types").ObserverSupportedChain[];
  tokens: import("./foreignCoins.types").ForeignCoin[];
}

export const SOLANA_CHAIN_IDS = ["900", "901"] as const;
export const SUI_CHAIN_IDS = ["101", "103"] as const;

export type SolanaChainId = (typeof SOLANA_CHAIN_IDS)[number];
export type SuiChainId = (typeof SUI_CHAIN_IDS)[number];
