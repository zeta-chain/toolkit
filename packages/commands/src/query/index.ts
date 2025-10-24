import { Command } from "commander";

import { balancesCommand } from "./balances";
import { cctxCommand } from "./cctx";
import { chainsCommand } from "./chains";
import { contractsCommand } from "./contracts";
import { feesCommand } from "./fees";
import { tokensCommand } from "./tokens";

export const queryCommand = new Command("query")
  .alias("q")
  .summary("Query ZetaChain data and connected chain information")
  .description(
    `Provides a set of tools to fetch on-chain data from ZetaChain and its connected chains.

You can retrieve balances, token information, supported chain details, cross-chain transaction status, and fee estimates for cross-chain operations.`
  )
  .addCommand(balancesCommand)
  .addCommand(cctxCommand)
  .addCommand(contractsCommand)
  .addCommand(feesCommand)
  .addCommand(tokensCommand)
  .addCommand(chainsCommand)
  .helpCommand(false);
