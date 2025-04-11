import { Command } from "commander";
import { createAccountsCommand } from "./create";

export const accountsCommand = new Command("accounts")
  .description("Account management commands")
  .addCommand(createAccountsCommand);
