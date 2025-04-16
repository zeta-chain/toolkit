import { Command } from "commander";
import { createCommand } from "./create";

export const poolsCommand = new Command("pools")
  .description("Manage Uniswap V3 pools")
  .addCommand(createCommand);
