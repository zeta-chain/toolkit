import { networks } from "@zetachain/networks";

interface Config {
  [key: string]: {
    accounts?: string[];
    chainId: number;
    gas?: number;
    gasPrice?: number;
    url?: string;
  };
}

export const getHardhatConfig = function ({ accounts }: any) {
  const hardhat = {
    chainId: 1337,
    forking: { blockNumber: 14672712, url: "https://rpc.ankr.com/eth" },
  };

  const config: Config = {};

  for (const network in networks as any) {
    if (!(networks as any)[network].fees) continue;
    let apiUrls = (networks as any)[network].api;
    let evmApi = apiUrls?.find((api: any) => api.type === "evm");

    if (!accounts) {
      throw new Error(
        "Seems like the client has been initialized without a wallet."
      );
    }

    config[network] = {
      chainId: (networks as any)[network].chain_id,
      gas: (networks as any)[network].fees.assets[0].gas,
      gasPrice: (networks as any)[network].fees.assets[0].gas_price,
      url: evmApi?.url || "",
    };

    if (accounts.every((e: string) => e)) config[network].accounts = accounts;
  }

  const etherscan = {
    apiKey: {
      zeta_mainnet: "YOUR_KEY_HERE",
      zeta_testnet: "YOUR_KEY_HERE",
    },
    customChains: [
      {
        chainId: 7001,
        network: "zeta_testnet",
        urls: {
          apiURL: "https://zetachain-athens-3.blockscout.com/api",
          browserURL: "https://zetachain-athens-3.blockscout.com",
        },
      },
      {
        chainId: 7000,
        network: "zeta_mainnet",
        urls: {
          apiURL: "https://zetachain.blockscout.com/api",
          browserURL: "https://zetachain.blockscout.com",
        },
      },
    ],
  };

  return {
    etherscan,
    networks: { ...config, hardhat },
    solidity: "0.8.7",
  };
};
