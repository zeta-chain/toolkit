import { Command } from "commander";
import { deployCommand } from "./deploy";
import { createCommand } from "./create";

export const poolsCommand = new Command("pools")
  .description("Manage Uniswap V3 pools")
  .addCommand(deployCommand)
  .addCommand(createCommand);
