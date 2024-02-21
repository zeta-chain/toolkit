import "@nomicfoundation/hardhat-toolbox";
import "./packages/tasks/src";

import { getHardhatConfigNetworks } from "@zetachain/networks";
import { HardhatUserConfig } from "hardhat/config";

const config: HardhatUserConfig = {
  networks: {
    ...getHardhatConfigNetworks(),
    zeta_testnet: {
      ...getHardhatConfigNetworks()["zeta_testnet"],
      url: "https://zetachain-testnet-evm.itrocket.net",
    },
  },
  solidity: {
    compilers: [
      { version: "0.6.6" /** For uniswap v2 */ },
      { version: "0.8.7" },
    ],
  },
};

export default config;
