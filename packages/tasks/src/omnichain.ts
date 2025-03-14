import * as fs from "fs";
import { task } from "hardhat/config";
import { HardhatRuntimeEnvironment } from "hardhat/types";
import * as path from "path";

import { processTemplates } from "./processTemplates";

const main = async (args: any, hre: HardhatRuntimeEnvironment) => {
  processTemplates("omnichain", args);

  const configPath = path.resolve(process.cwd(), "hardhat.config.ts");
  let hardhatConfigContents = fs.readFileSync(configPath, "utf8");

  // Add the omnichain tasks to the hardhat.config.ts file
  ["deploy", "interact"].forEach((task) => {
    const content = `import "./tasks/${task}";\n`;
    if (!hardhatConfigContents.includes(content)) {
      hardhatConfigContents = content + hardhatConfigContents;
    }
  });

  fs.writeFileSync(configPath, hardhatConfigContents);
};

export const omnichainTask = task(
  "omnichain",
  "Generate code for an omnichain contract",
  main
)
  .addPositionalParam("name", "Name of the contract")
  .addOptionalVariadicPositionalParam(
    "arguments",
    "Arguments for a crosschain call (e.g. dest:address to:bytes32 output:uint256)"
  );
