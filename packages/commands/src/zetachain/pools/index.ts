import { Command } from "commander";

import { createCommand } from "./create";
import { deployCommand } from "./deploy";
import { liquidityCommand } from "./liquidity";
import { showCommand } from "./show";

export const poolsCommand = new Command("pools")
  .summary("ZetaChain pools commands")
  .alias("p")
  .addCommand(deployCommand)
  .addCommand(createCommand)
  .addCommand(showCommand)
  .addCommand(liquidityCommand);
