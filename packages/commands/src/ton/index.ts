import { Command } from "commander";

import { depositCommand } from "./deposit";
import { depositAndCallCommand } from "./depositAndCall";

export const tonCommand = new Command("ton")
  .description("TON commands")
  .addCommand(depositCommand)
  .addCommand(depositAndCallCommand)
  .helpCommand(false);
