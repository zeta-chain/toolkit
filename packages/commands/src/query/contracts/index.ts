import { Command } from "commander";

import { listCommand } from "./list";
import { showCommand } from "./show";

export const contractsCommand = new Command("contracts")
  .description("Contract registry commands")
  .addCommand(listCommand)
  .addCommand(showCommand)
  .helpCommand(false);
