import { Command } from "commander";

import { addCommand } from "./add";
import { removeCommand } from "./remove";
import { showCommand } from "./show";

export const liquidityCommand = new Command("liquidity")
  .description("Manage liquidity in Uniswap V3 pools")
  .addCommand(addCommand)
  .addCommand(removeCommand)
  .addCommand(showCommand);
