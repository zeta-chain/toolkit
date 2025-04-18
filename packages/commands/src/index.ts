import { Command } from "commander";

import { accountsCommand } from "./accounts";
import { poolsCommand } from "./pools/";
import { solanaEncodeCommand } from "./solanaEncode";

export const toolkitCommand = new Command("toolkit")
  .description("Local development environment")
  .helpCommand(false);

toolkitCommand
  .addCommand(solanaEncodeCommand)
  .addCommand(poolsCommand)
  .addCommand(accountsCommand);
