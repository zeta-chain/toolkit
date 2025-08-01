import { Command } from "commander";

import { balancesCommand } from "./balances";
import { cctxCommand } from "./cctx";
import { chainsCommand } from "./chains";
import { contractsCommand } from "./contracts";
import { feesCommand } from "./fees";
import { tokensCommand } from "./tokens";

export const queryCommand = new Command("query")
  .alias("q")
  .summary("Query commands")
  .addCommand(balancesCommand)
  .addCommand(cctxCommand)
  .addCommand(contractsCommand)
  .addCommand(feesCommand)
  .addCommand(tokensCommand)
  .addCommand(chainsCommand)
  .helpCommand(false);
