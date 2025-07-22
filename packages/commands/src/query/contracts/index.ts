import { Command } from "commander";

import { listCommand } from "./list";
import { showCommand } from "./show";

export const contractsCommand = new Command("contracts")
  .alias("c")
  .description("Contract registry commands")
  .addCommand(listCommand)
  .addCommand(showCommand)
  .helpCommand(false);
