import { Command } from "commander";
import { createAccountsCommand } from "./create";
import { showAccountsCommand } from "./show";

export const accountsCommand = new Command("accounts")
  .description("Account management commands")
  .addCommand(createAccountsCommand)
  .addCommand(showAccountsCommand);
