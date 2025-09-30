#!/usr/bin/env node
import { Command } from "commander";

import { showRequiredOptions } from "../../../utils/common.command.helpers";
import { accountsCommand } from "./accounts";
import { bitcoinCommand } from "./bitcoin";
import { evmCommand } from "./evm";
import { faucetCommand } from "./faucet";
import { queryCommand } from "./query";
import { solanaCommand } from "./solana";
import { stakingCommand } from "./staking";
import { suiCommand } from "./sui";
import { tonCommand } from "./ton";
import { zetachainCommand } from "./zetachain";

export const toolkitCommand = new Command("toolkit")
  .summary("Local development environment")
  .helpCommand(false);

toolkitCommand.addCommand(accountsCommand);
toolkitCommand.addCommand(bitcoinCommand);
toolkitCommand.addCommand(evmCommand);
toolkitCommand.addCommand(faucetCommand);
toolkitCommand.addCommand(queryCommand);
toolkitCommand.addCommand(solanaCommand);
toolkitCommand.addCommand(suiCommand);
toolkitCommand.addCommand(tonCommand);
toolkitCommand.addCommand(zetachainCommand);
toolkitCommand.addCommand(stakingCommand);
showRequiredOptions(toolkitCommand);

toolkitCommand.parse(process.argv);
