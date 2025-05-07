import { Command } from "commander";

import { addCommand } from "./add";

export const liquidityCommand = new Command("liquidity")
  .description("Manage liquidity in Uniswap V3 pools")
  .addCommand(addCommand);
