import { Command } from "commander";

import { listCommand } from "./list";
import { showCommand } from "./show";

export const delegationsCommand = new Command("delegations")
  .summary("Delegations-related queries")
  .addCommand(listCommand)
  .addCommand(showCommand)
  .helpCommand(false);
