import * as viemChains from "viem/chains";

export const getRpcUrl = (chainId: number): string => {
  const chain = Object.values(viemChains).find((c) => c.id === chainId);

  if (!chain) {
    throw new Error(`Chain with ID ${chainId} not found in viem/chains`);
  }

  const url = chain.rpcUrls?.default?.http?.[0];
  if (!url) {
    throw new Error(`No RPC HTTP URL found for chain ID ${chainId}`);
  }
  return url;
};
