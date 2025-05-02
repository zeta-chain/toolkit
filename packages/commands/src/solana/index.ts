import { Command } from "commander";

import { encodeCommand } from "./encode";
import { depositCommand } from "./deposit";

export const solanaCommand = new Command("solana").description(
  "Solana commands"
);

solanaCommand.addCommand(encodeCommand);
solanaCommand.addCommand(depositCommand);
