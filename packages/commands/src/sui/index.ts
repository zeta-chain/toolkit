import { Command } from "commander";

import { encodeCommand } from "./encode";

export const suiCommand = new Command("sui")
  .description("Sui commands")
  .addCommand(encodeCommand);
