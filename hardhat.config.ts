import "@nomicfoundation/hardhat-toolbox";
import "./packages/tasks/src";

import * as dotenv from "dotenv";
import { HardhatUserConfig } from "hardhat/config";

import { getHardhatConfig } from "./packages/client/src";

dotenv.config();

export const config: HardhatUserConfig = {
  ...getHardhatConfig({ accounts: [process.env.PRIVATE_KEY] }),
};
