#!/usr/bin/env node
import { Command } from "commander";

import { accountsCommand } from "./accounts";
import { balancesCommand } from "./balances";
import { bitcoinCommand } from "./bitcoin";
import { solanaCommand } from "./solana";
import { suiCommand } from "./sui";

export const toolkitCommand = new Command("toolkit")
  .description("Local development environment")
  .helpCommand(false);

toolkitCommand.addCommand(accountsCommand);
toolkitCommand.addCommand(balancesCommand);
toolkitCommand.addCommand(bitcoinCommand);
toolkitCommand.addCommand(solanaCommand);
toolkitCommand.addCommand(suiCommand);

toolkitCommand.parse(process.argv);
