import confirm from "@inquirer/confirm";
import { Command } from "commander";
import fs from "fs";
import os from "os";
import path from "path";

const main = async (options: { name: string; type: string }) => {
  const { type, name } = options;

  if (type !== "evm" && type !== "solana") {
    console.error("Invalid account type. Must be either 'evm' or 'solana'");
    return;
  }

  const baseDir = path.join(os.homedir(), ".zetachain", "keys", type);
  const keyPath = path.join(baseDir, `${name}.json`);

  if (!fs.existsSync(keyPath)) {
    console.error(`Account ${name} of type ${type} not found at ${keyPath}`);
    return;
  }

  const shouldDelete = await confirm({
    default: false,
    message: `Are you sure you want to delete account ${name} of type ${type}? This action cannot be undone.`,
  });

  if (!shouldDelete) {
    console.log("Operation cancelled.");
    return;
  }

  fs.unlinkSync(keyPath);
  console.log(`Account ${name} of type ${type} deleted successfully.`);
};

export const deleteAccountsCommand = new Command("delete")
  .description("Delete an existing account")
  .requiredOption("--type <type>", "Account type (evm or solana)")
  .requiredOption("--name <name>", "Account name")
  .action(main);
