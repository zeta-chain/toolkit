#!/usr/bin/env node
import { Command } from "commander";

import { accountsCommand } from "./accounts";
import { bitcoinCommand } from "./bitcoin";
import { solanaCommand } from "./solana";

export const toolkitCommand = new Command("toolkit")
  .description("Local development environment")
  .helpCommand(false);

toolkitCommand.addCommand(accountsCommand);
toolkitCommand.addCommand(solanaCommand);
toolkitCommand.addCommand(bitcoinCommand);

toolkitCommand.parse(process.argv);
