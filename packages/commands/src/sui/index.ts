import { Command } from "commander";

import { depositCommand } from "./deposit";
import { encodeCommand } from "./encode";

export const suiCommand = new Command("sui")
  .description("Sui commands")
  .addCommand(depositCommand)
  .addCommand(encodeCommand)
  .helpCommand(false);
