import { Command } from "commander";

import { depositCommand } from "./deposit";
import { encodeCommand } from "./encode";

export const solanaCommand = new Command("solana").description(
  "Solana commands"
);

solanaCommand.addCommand(encodeCommand);
solanaCommand.addCommand(depositCommand);
solanaCommand.addCommand(encodeCommand).helpCommand(false);
