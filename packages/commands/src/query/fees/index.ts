import { Command } from "commander";

import { listCommand } from "./list";
import { showCommand } from "./show";

export const feesCommand = new Command("fees")
  .description("Fees commands")
  .addCommand(listCommand)
  .addCommand(showCommand)
  .helpCommand(false);
