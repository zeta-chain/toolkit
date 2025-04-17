import confirm from "@inquirer/confirm";
import { Command, Option } from "commander";
import fs from "fs";
import os from "os";
import path from "path";
import { z } from "zod";

import { AvailableAccountTypes } from "../../../../types/accounts.types";
import { handleError } from "../../../../utils/handleError";
import { validateAndParseSchema } from "../../../../utils/validateAndParseSchema";

const deleteAccountOptionsSchema = z.object({
  name: z.string().min(1, "Account name is required"),
  type: z.enum(AvailableAccountTypes, {
    errorMap: () => ({ message: "Type must be either 'evm' or 'solana'" }),
  }),
});

type DeleteAccountOptions = z.infer<typeof deleteAccountOptionsSchema>;

const main = async (options: DeleteAccountOptions) => {
  const { type, name } = options;

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

  try {
    fs.unlinkSync(keyPath);
    console.log(`Account ${name} of type ${type} deleted successfully.`);
  } catch (error: unknown) {
    handleError({
      context: "Failed to delete account",
      error,
      shouldThrow: true,
    });
  }
};

export const deleteAccountsCommand = new Command("delete")
  .description("Delete an existing account")
  .addOption(
    new Option("--type <type>", "Account type (evm or solana)").choices(
      AvailableAccountTypes
    )
  )
  .requiredOption("--name <name>", "Account name")
  .action(async (opts) => {
    const validated = validateAndParseSchema(opts, deleteAccountOptionsSchema, {
      exitOnError: true,
    });
    await main(validated);
  });
