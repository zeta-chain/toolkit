import { Command } from "commander";

import { evmDepositCommand } from "./evmDeposit";
import { accountsCommand } from "./accounts";
import { solanaEncodeCommand } from "./solanaEncode";

export const toolkitCommand = new Command("toolkit")
  .description("Local development environment")
  .helpCommand(false);

toolkitCommand.addCommand(solanaEncodeCommand);
toolkitCommand.addCommand(evmDepositCommand);
toolkitCommand.addCommand(accountsCommand);
