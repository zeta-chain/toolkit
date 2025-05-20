import { Command } from "commander";

import { depositCommand } from "./deposit";
import { encodeCommand } from "./encode";

export const solanaCommand = new Command("solana")
  .description("Solana commands")
  .addCommand(depositCommand)
  .addCommand(encodeCommand)
  .helpCommand(false);
