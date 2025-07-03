import { Command } from "commander";

import { balancesCommand } from "./balances";
import { cctxCommand } from "./cctx";
import { tokensCommand } from "./tokens";

export const queryCommand = new Command("query")
  .description("Query commands")
  .addCommand(balancesCommand)
  .addCommand(cctxCommand)
  .addCommand(tokensCommand)
  .helpCommand(false);
