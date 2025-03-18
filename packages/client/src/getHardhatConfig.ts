import { networks } from "@zetachain/networks";

import { Chains } from "../../../types/client.types";

interface Config {
  [key: string]: {
    accounts?: string[];
    chainId: number;
    gas?: number;
    gasPrice?: number;
    url?: string;
  };
}

type GetHardhatConfigArgs = {
  accounts: string[];
};

type GetHardhatConfigReturnType = {
  etherscan: {
    apiKey: {
      zeta_mainnet: string;
      zeta_testnet: string;
    };
    customChains: {
      chainId: number;
      network: string;
      urls: {
        apiURL: string;
        browserURL: string;
      };
    }[];
  };
  networks: {
    hardhat: {
      chainId: number;
      forking: {
        blockNumber: number;
        url: string;
      };
    };
  };
  solidity: string;
};

// eslint-disable-next-line prefer-arrow/prefer-arrow-functions
export const getHardhatConfig = function ({
  accounts,
}: GetHardhatConfigArgs): GetHardhatConfigReturnType {
  const hardhat = {
    chainId: 1337,
    forking: { blockNumber: 14672712, url: "https://rpc.ankr.com/eth" },
  };

  const config: Config = {};

  Object.entries(networks as Chains).forEach(([network, data]) => {
    if (!data.fees) return;

    const apiUrls = data.api;
    const evmApi = apiUrls?.find((api) => api.type === "evm");

    if (!accounts) {
      throw new Error(
        "Seems like the client has been initialized without a wallet."
      );
    }

    config[network] = {
      chainId: data.chain_id,
      gas: data.fees.assets[0].gas,
      gasPrice: data.fees.assets[0].gas_price,
      url: evmApi?.url || "",
    };

    if (accounts.every(Boolean)) config[network].accounts = accounts;
  });

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
          apiURL: "https://zetachain-testnet.blockscout.com/api",
          browserURL: "https://zetachain-testnet.blockscout.com",
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
    solidity: "0.8.26",
  };
};
