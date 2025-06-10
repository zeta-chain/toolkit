#!/usr/bin/env node
import { Command } from "commander";

import { showRequiredOptions } from "../../../utils/common.command.helpers";
import { accountsCommand } from "./accounts";
import { bitcoinCommand } from "./bitcoin";
import { evmCommand } from "./evm";
import { queryCommand } from "./query";
import { solanaCommand } from "./solana";
import { suiCommand } from "./sui";
import { zetachainCommand } from "./zetachain";

export const toolkitCommand = new Command("toolkit")
  .summary("Local development environment")
  .helpCommand(false);

toolkitCommand.addCommand(accountsCommand);
toolkitCommand.addCommand(bitcoinCommand);
toolkitCommand.addCommand(evmCommand);
toolkitCommand.addCommand(queryCommand);
toolkitCommand.addCommand(solanaCommand);
toolkitCommand.addCommand(suiCommand);
toolkitCommand.addCommand(zetachainCommand);

showRequiredOptions(toolkitCommand);

toolkitCommand.parse(process.argv);
