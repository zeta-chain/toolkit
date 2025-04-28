import { Command } from "commander";

import { encodeCommand } from "./encode";

export const solanaCommand = new Command("solana").description(
  "Solana commands"
);

solanaCommand.addCommand(encodeCommand);
