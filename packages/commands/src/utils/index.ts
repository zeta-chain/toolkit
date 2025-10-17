import { Command } from "commander";

import { addressCommand } from "./address";

export const utilsCommand = new Command("utils")
  .summary("Utility commands")
  .addCommand(addressCommand)
  .helpCommand(false);
