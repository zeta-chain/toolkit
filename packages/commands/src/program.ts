#!/usr/bin/env node
import { Command } from "commander";

import { accountsCommand } from "./accounts";
import { solanaCommand } from "./solana";

export const toolkitCommand = new Command("toolkit")
  .description("Local development environment")
  .helpCommand(false);

toolkitCommand.addCommand(accountsCommand);
toolkitCommand.addCommand(solanaCommand);

toolkitCommand.parse(process.argv);
