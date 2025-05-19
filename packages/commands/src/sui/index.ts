import { Command } from "commander";

import { depositCommand } from "./deposit";
import { depositAndCallCommand } from "./depositAndCall";
import { encodeCommand } from "./encode";

export const suiCommand = new Command("sui")
  .description("Sui commands")
  .addCommand(depositCommand)
  .addCommand(encodeCommand)
  .addCommand(depositAndCallCommand)
  .helpCommand(false);
