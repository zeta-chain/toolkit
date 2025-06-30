import { Command } from "commander";

import { balancesCommand } from "./balances";
import { cctxCommand } from "./cctx";
import { feesCommand } from "./fees";

export const queryCommand = new Command("query")
  .alias("q")
  .description("Query commands")
  .addCommand(balancesCommand)
  .addCommand(cctxCommand)
  .addCommand(feesCommand)
  .helpCommand(false);
