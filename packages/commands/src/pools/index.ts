import { Command } from "commander";
import { deployCommand } from "./deploy";
import { createCommand } from "./create";
import { showCommand } from "./show";
import { liquidityCommand } from "./liquidity";

export const poolsCommand = new Command("pools")
  .description("Manage Uniswap V3 pools")
  .addCommand(deployCommand)
  .addCommand(createCommand)
  .addCommand(showCommand)
  .addCommand(liquidityCommand);
