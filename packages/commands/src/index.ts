import { Command } from "commander";

import { solanaEncodeCommand } from "./solanaEncode";
import { suiEncodeCommand } from "./suiEncode";

export const toolkitCommand = new Command("toolkit")
  .description("Local development environment")
  .helpCommand(false);

const solanaCommand = new Command("solana").description("Solana commands");

const suiCommand = new Command("sui").description("Sui commands");

solanaCommand.addCommand(solanaEncodeCommand);
suiCommand.addCommand(suiEncodeCommand);

toolkitCommand.addCommand(solanaCommand);
toolkitCommand.addCommand(suiCommand);
