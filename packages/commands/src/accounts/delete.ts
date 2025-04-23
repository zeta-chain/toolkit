import confirm from "@inquirer/confirm";
import { Command, Option } from "commander";
import { z } from "zod";

import {
  accountNameSchema,
  AvailableAccountTypes,
} from "../../../../types/accounts.types";
import { safeExists, safeUnlink } from "../../../../utils/fsUtils";
import { handleError } from "../../../../utils/handleError";
import { getAccountKeyPath } from "../../../../utils/keyPaths";
import { validateAndParseSchema } from "../../../../utils/validateAndParseSchema";

const deleteAccountOptionsSchema = z.object({
  name: accountNameSchema,
  type: z.enum(AvailableAccountTypes, {
    errorMap: () => ({
      message: "Type must be either 'evm', 'solana', or 'bitcoin'",
    }),
  }),
});

type DeleteAccountOptions = z.infer<typeof deleteAccountOptionsSchema>;

const main = async (options: DeleteAccountOptions) => {
  const { type, name } = options;

  const keyPath = getAccountKeyPath(type, name);

  if (!safeExists(keyPath)) {
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
    safeUnlink(keyPath);
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
    new Option(
      "--type <type>",
      "Account type (evm, solana, or bitcoin)"
    ).choices(AvailableAccountTypes)
  )
  .requiredOption("--name <name>", "Account name")
  .action(async (opts) => {
    const validated = validateAndParseSchema(opts, deleteAccountOptionsSchema, {
      exitOnError: true,
    });
    await main(validated);
  });
