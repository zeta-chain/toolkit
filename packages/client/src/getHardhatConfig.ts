import { ZetaChainClient } from "./client";

interface Config {
  [key: string]: {
    accounts?: string[];
    chainId: number;
    gas?: number;
    gasPrice?: number;
    url?: string;
  };
}

export const getHardhatConfig = function (this: ZetaChainClient) {
  const hardhat = {
    chainId: 1337,
    forking: { blockNumber: 14672712, url: "https://rpc.ankr.com/eth" },
  };

  const config: Config = {};
  const networks = this.chains;

  for (const network in networks as any) {
    if (!(networks as any)[network].fees) continue;
    let apiUrls = (networks as any)[network].api;
    let evmApi = apiUrls?.find((api: any) => api.type === "evm");

    if (!this.wallet?.privateKey) {
      throw new Error(
        "Seems like the client has been initialized without a wallet."
      );
    }

    config[network] = {
      accounts: [this.wallet?.privateKey],
      chainId: (networks as any)[network].chain_id,
      gas: (networks as any)[network].fees.assets[0].gas,
      gasPrice: (networks as any)[network].fees.assets[0].gas_price,
      url: evmApi?.url || "",
    };
  }

  return {
    networks: { ...config, hardhat },
    solidity: "0.8.7",
  };
};
