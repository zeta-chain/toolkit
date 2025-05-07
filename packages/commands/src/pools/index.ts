import { Command } from "commander";

import { createCommand } from "./create";
import { deployCommand } from "./deploy";
import { liquidityCommand } from "./liquidity";
import { showCommand } from "./show";

export const poolsCommand = new Command("pools")
  .description("Manage Uniswap V3 pools")
  .addCommand(deployCommand)
  .addCommand(createCommand)
  .addCommand(showCommand)
  .addCommand(liquidityCommand);
