import "@nomicfoundation/hardhat-toolbox";
import "./packages/tasks/src";

import * as dotenv from "dotenv";
import type { HardhatUserConfig } from "hardhat/config";

import { getHardhatConfig } from "./packages/client/src";

dotenv.config();

const config: HardhatUserConfig = {
  ...getHardhatConfig({ accounts: [process.env.PRIVATE_KEY] }),
  solidity: {
    compilers: [
      { version: "0.6.6" /** For uniswap v2 */ },
      { version: "0.8.7" },
    ],
  },
};

export default config;

console.log(config);
