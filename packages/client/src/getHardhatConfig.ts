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
  // const hardhat = {
  //   chainId: 1337,
  //   forking: { blockNumber: 14672712, url: "https://rpc.ankr.com/eth" },
  // };

  // const config: Config = {};
  // const networks = this.chains;

  // for (const network in networks as any) {
  //   if (!(networks as any)[network].fees) continue;
  //   let apiUrls = (networks as any)[network].api;
  //   let evmApi = apiUrls?.find((api: any) => api.type === "evm");

  //   if (!this.wallet?.privateKey) {
  //     throw new Error(
  //       "Seems like the client has been initialized without a wallet."
  //     );
  //   }

  //   config[network] = {
  //     accounts: [this.wallet?.privateKey],
  //     chainId: (networks as any)[network].chain_id,
  //     gas: (networks as any)[network].fees.assets[0].gas,
  //     gasPrice: (networks as any)[network].fees.assets[0].gas_price,
  //     url: evmApi?.url || "",
  //   };
  // }

  // return { ...config, hardhat };
  return {
    networks: {
      mumbai_testnet: {
        accounts: [
          "0xc7eba6bc03dbb0ffaee88ce911a55e15592499f1733c46fbef2c7f780f7737d6",
        ],
        chainId: 80001,
        gas: 5000000,
        gasPrice: 80000000000,
        url: "https://rpc.ankr.com/polygon_mumbai",
      },
      bsc_mainnet: {
        accounts: [
          "0xc7eba6bc03dbb0ffaee88ce911a55e15592499f1733c46fbef2c7f780f7737d6",
        ],
        chainId: 56,
        gas: 2100000,
        gasPrice: 5000000000,
        url: "https://rpc.ankr.com/bsc",
      },
      eth_mainnet: {
        accounts: [
          "0xc7eba6bc03dbb0ffaee88ce911a55e15592499f1733c46fbef2c7f780f7737d6",
        ],
        chainId: 1,
        gas: 2100000,
        gasPrice: 38000000000,
        url: "https://rpc.ankr.com/eth",
      },
      zeta_mainnet: {
        accounts: [
          "0xc7eba6bc03dbb0ffaee88ce911a55e15592499f1733c46fbef2c7f780f7737d6",
        ],
        chainId: 7000,
        gas: 5000000,
        gasPrice: 10000000,
        url: "https://zetachain-evm.blockpi.network:443/v1/rpc/public",
      },
      zeta_testnet: {
        accounts: [
          "0xc7eba6bc03dbb0ffaee88ce911a55e15592499f1733c46fbef2c7f780f7737d6",
        ],
        chainId: 7001,
        gas: 5000000,
        gasPrice: 80000000000,
        url: "https://zetachain-athens-evm.blockpi.network/v1/rpc/public",
      },
      bsc_testnet: {
        accounts: [
          "0xc7eba6bc03dbb0ffaee88ce911a55e15592499f1733c46fbef2c7f780f7737d6",
        ],
        chainId: 97,
        gas: 5000000,
        gasPrice: 80000000000,
        url: "https://bsc-testnet.blockpi.network/v1/rpc/public",
      },
      goerli_testnet: {
        accounts: [
          "0xc7eba6bc03dbb0ffaee88ce911a55e15592499f1733c46fbef2c7f780f7737d6",
        ],
        chainId: 5,
        gas: 2100000,
        gasPrice: 38000000000,
        url: "https://rpc.ankr.com/eth_goerli",
      },
      hardhat: {
        chainId: 1337,
        forking: {
          blockNumber: 14672712,
          url: "https://rpc.ankr.com/eth",
        },
      },
    },
    solidity: "0.8.7",
  };
};
