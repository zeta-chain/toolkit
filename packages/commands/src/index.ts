import { Command } from "commander";

import { accountsCommand } from "./accounts";
import { solanaEncodeCommand } from "./solanaEncode";
import { suiCommand } from "./sui";

export const toolkitCommand = new Command("toolkit")
  .description("Local development environment")
  .helpCommand(false);

const solanaCommand = new Command("solana").description("Solana commands");

solanaCommand.addCommand(solanaEncodeCommand);

toolkitCommand.addCommand(solanaCommand);
toolkitCommand.addCommand(suiCommand);
toolkitCommand.addCommand(solanaEncodeCommand);
toolkitCommand.addCommand(accountsCommand);
