#!/usr/bin/env node
import { Command } from "commander";

import { accountsCommand } from "./accounts";
import { balancesCommand } from "./balances";
import { solanaCommand } from "./solana";
import { suiCommand } from "./sui";
import { poolsCommand } from "./pools";

export const toolkitCommand = new Command("toolkit")
  .description("Local development environment")
  .helpCommand(false);

toolkitCommand.addCommand(accountsCommand);
toolkitCommand.addCommand(balancesCommand);
toolkitCommand.addCommand(solanaCommand);
toolkitCommand.addCommand(suiCommand);
toolkitCommand.addCommand(poolsCommand);

toolkitCommand.parse(process.argv);
