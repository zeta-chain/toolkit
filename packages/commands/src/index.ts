import { Command } from "commander";

import { evmCommand } from "./evm/";
import { accountsCommand } from "./accounts";
import { solanaEncodeCommand } from "./solanaEncode";

export const toolkitCommand = new Command("toolkit")
  .description("Local development environment")
  .helpCommand(false);

toolkitCommand.addCommand(solanaEncodeCommand);
toolkitCommand.addCommand(evmCommand);
toolkitCommand.addCommand(accountsCommand);
