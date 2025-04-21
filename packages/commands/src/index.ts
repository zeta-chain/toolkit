import { Command } from "commander";

import { accountsCommand } from "./accounts";
import { evmCommand } from "./evm/";
import { solanaEncodeCommand } from "./solanaEncode";

export const toolkitCommand = new Command("toolkit")
  .description("Local development environment")
  .helpCommand(false);

toolkitCommand.addCommand(solanaEncodeCommand);
toolkitCommand.addCommand(evmCommand);
toolkitCommand.addCommand(accountsCommand);
