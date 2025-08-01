import { Command } from "commander";

import { listCommand } from "./list";
import { showCommand } from "./show";

export const chainsCommand = new Command("chains")
  .alias("c")
  .description("Supported chains commands")
  .addCommand(listCommand)
  .addCommand(showCommand)
  .helpCommand(false);
