import { Command } from "commander";

import { encodeCommand } from "./encode";
import { depositCommand } from "./deposit";

export const suiCommand = new Command("sui").description("Sui commands");

suiCommand.addCommand(encodeCommand);
suiCommand.addCommand(depositCommand);
