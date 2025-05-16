import { networks } from "@zetachain/networks";
import { type NetworksSchema } from "@zetachain/networks/dist/src/types";

export const getChainName = (chainId: number): string => {
  const typedNetworks = networks as NetworksSchema;
  const network = Object.values(typedNetworks).find(
    (n) => n.chain_id === chainId
  );

  if (!network) {
    throw new Error(`Network with chain ID ${chainId} not found`);
  }

  return network.chain_name;
};

export const getRpcUrl = (chainId: number): string => {
  const typedNetworks = networks as NetworksSchema;
  const network = Object.values(typedNetworks).find(
    (n) => n.chain_id === chainId
  );

  if (!network) {
    throw new Error(`Network with chain ID ${chainId} not found`);
  }

  if (!network.api) {
    throw new Error(`Network with chain ID ${chainId} has no API endpoints`);
  }

  const evmRpc = network.api.find((api) => api.type === "evm");
  if (!evmRpc) {
    throw new Error(`Network with chain ID ${chainId} has no EVM RPC endpoint`);
  }

  return evmRpc.url;
};

export const getNetworkTypeByChainId = (
  chainId: number
): "mainnet" | "testnet" => {
  const typedNetworks = networks as NetworksSchema;
  const network = Object.values(typedNetworks).find(
    (n) => n.chain_id === chainId
  );

  if (!network?.type) {
    throw new Error(`Network with chain ID ${chainId} not found`);
  }

  return network.type as "mainnet" | "testnet";
};
