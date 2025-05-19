import { Command } from "commander";

import { depositCommand } from "./deposit";
import { encodeCommand } from "./encode";
import { depositAndCallCommand } from "./depositAndCall";

export const suiCommand = new Command("sui")
  .description("Sui commands")
  .addCommand(depositCommand)
  .addCommand(encodeCommand)
  .addCommand(depositAndCallCommand)
  .helpCommand(false);
