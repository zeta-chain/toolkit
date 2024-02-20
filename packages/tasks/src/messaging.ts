import * as fs from "fs";
import { task, types } from "hardhat/config";
import { HardhatRuntimeEnvironment } from "hardhat/types";
import * as path from "path";

import { processTemplates } from "./processTemplates";

const main = async (args: any, hre: HardhatRuntimeEnvironment) => {
  await processTemplates("messaging", args);

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

export const messagingTask = task(
  "messaging",
  "Generate code for a cross-chain messaging contract",
  main
)
  .addPositionalParam("name", "Name of the contract")
  .addOptionalParam(
    "fees",
    "Use ZETA or native gas tokens for cross-chain fees",
    "native",
    types.string
  )
  .addOptionalVariadicPositionalParam(
    "arguments",
    "Arguments for a crosschain call (e.g. dest:address to:bytes32 output:uint256)"
  );
