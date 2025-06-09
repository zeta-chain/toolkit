import { Command } from "commander";

import { depositCommand } from "./deposit";
import { depositAndCallCommand } from "./depositAndCall";
import { encodeCommand } from "./encode";
import { callCommand } from "./call";

export const solanaCommand = new Command("solana")
  .description("Solana commands")
  .addCommand(depositCommand)
  .addCommand(depositAndCallCommand)
  .addCommand(encodeCommand)
  .addCommand(callCommand)
  .helpCommand(false);
