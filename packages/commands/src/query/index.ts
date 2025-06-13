import { Command } from "commander";

import { balancesCommand } from "./balances";
import { cctxCommand } from "./cctx";

export const queryCommand = new Command("query")
  .description("Query commands")
  .addCommand(balancesCommand)
  .addCommand(cctxCommand)
  .helpCommand(false);
