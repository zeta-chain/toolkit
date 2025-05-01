import { Command } from "commander";

import { depositCommand } from "./deposit";
import { encodeCommand } from "./encode";

export const suiCommand = new Command("sui").description("Sui commands");

suiCommand.addCommand(encodeCommand);
suiCommand.addCommand(depositCommand);
