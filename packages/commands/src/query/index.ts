import { Command } from "commander";

import { balancesCommand } from "./balances";

export const queryCommand = new Command("query")
  .description("Query commands")
  .addCommand(balancesCommand)
  .helpCommand(false);
