import * as fs from "fs";
import { task } from "hardhat/config";
import { HardhatRuntimeEnvironment } from "hardhat/types";
import * as path from "path";

import { processTemplates } from "./processTemplates";

const main = async (args: any, hre: HardhatRuntimeEnvironment) => {
  processTemplates("token", args);
  const configPath = path.resolve(process.cwd(), "hardhat.config.ts");
  let hardhatConfigContents = fs.readFileSync(configPath, "utf8");

  hardhatConfigContents =
    `import "@zetachain/standard-contracts/contracts/token/tasks"\n` +
    hardhatConfigContents;

  fs.writeFileSync(configPath, hardhatConfigContents);
};

export const newTokenTask = task(
  "new:token",
  "Create a new universal token",
  main
);
