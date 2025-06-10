import { Command } from "commander";

import { depositCommand } from "./deposit";
import { encodeCommand } from "./encode";

export const solanaCommand = new Command("solana")
  .summary("Solana commands")
  .addCommand(depositCommand)
  .addCommand(encodeCommand)
  .helpCommand(false);
