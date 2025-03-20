import "@nomicfoundation/hardhat-toolbox";
import "@typechain/hardhat";
import "./packages/tasks/src";

import * as dotenv from "dotenv";
import type { HardhatUserConfig } from "hardhat/config";

import { getHardhatConfig } from "./utils";

dotenv.config();

const accounts = process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [];

const config: HardhatUserConfig = {
  ...getHardhatConfig({ accounts }),
  solidity: {
    compilers: [
      { version: "0.6.6" /** For uniswap v2 */ },
      { version: "0.8.7" },
      { version: "0.8.26" },
      { version: "0.5.10" /** For create2 factory */ },
      { version: "0.5.16" /** For uniswap v2 core*/ },
    ],
  },
  typechain: {
    outDir: "typechain-types",
    target: "ethers-v6",
  },
};

export default config;
