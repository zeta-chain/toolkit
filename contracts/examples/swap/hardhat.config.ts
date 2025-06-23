<<<<<<< HEAD
import "@nomicfoundation/hardhat-toolbox";
import { HardhatUserConfig } from "hardhat/config";
import * as dotenv from "dotenv";

import "./tasks";
import "@zetachain/localnet/tasks";
import "@zetachain/toolkit/tasks";
import { getHardhatConfig } from "@zetachain/toolkit/client";

import "@openzeppelin/hardhat-upgrades";

dotenv.config();

const config: HardhatUserConfig = {
  ...getHardhatConfig({ accounts: [process.env.PRIVATE_KEY] }),
  solidity: {
    compilers: [{ version: "0.8.20" }, { version: "0.8.26" }],
  },
};

export default config;
=======
import "@nomicfoundation/hardhat-toolbox";
import { HardhatUserConfig } from "hardhat/config";
import * as dotenv from "dotenv";

import "./tasks";
import "@zetachain/localnet/tasks";
import "@zetachain/toolkit/tasks";
import { getHardhatConfig } from "@zetachain/toolkit/client";

import "@openzeppelin/hardhat-upgrades";

dotenv.config();

const config: HardhatUserConfig = {
  ...getHardhatConfig({ accounts: [process.env.PRIVATE_KEY] }),
  solidity: {
    compilers: [{ version: "0.8.20" }, { version: "0.8.26" }],
  },
};

export default config;
>>>>>>> 5f253fe3f9f992f7f918f140b466e2635ecd8c54
