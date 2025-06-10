import { Command } from "commander";

import { depositCommand } from "./deposit";
import { depositAndCallCommand } from "./depositAndCall";
import { encodeCommand } from "./encode";

export const suiCommand = new Command("sui")
  .summary("Sui commands")
  .addCommand(depositAndCallCommand)
  .addCommand(depositCommand)
  .addCommand(encodeCommand)
  .helpCommand(false);
