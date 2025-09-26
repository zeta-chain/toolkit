import { Command } from "commander";

import { listCommand } from "./list";

export const validatorsCommand = new Command("validators")
  .summary("Validators-related queries")
  .addCommand(listCommand)
  .helpCommand(false);
