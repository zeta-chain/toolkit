import { Command } from "commander";

import { createAccountsCommand } from "./create";
import { deleteAccountsCommand } from "./delete";
import { importAccountsCommand } from "./import";
import { listAccountsCommand } from "./list";
import { showAccountsCommand } from "./show";

export const accountsCommand = new Command("accounts")
  .summary("Manage accounts for all connected chains")
  .description(
    `Manages accounts for all connected chains in the ZetaChain CLI. Supports creating new accounts, importing existing ones, listing all accounts, showing details, and deleting accounts.

Accounts are stored locally in the CLI's key management system and can be used across all supported networks.`
  )
  .addCommand(createAccountsCommand)
  .addCommand(deleteAccountsCommand)
  .addCommand(importAccountsCommand)
  .addCommand(listAccountsCommand)
  .addCommand(showAccountsCommand)
  .helpCommand(false);
