import confirm from "@inquirer/confirm";
import { Command } from "commander";
import fs from "fs";
import os from "os";
import path from "path";
import { z } from "zod";

import { validateAndParseSchema } from "../../../../utils/validateAndParseSchema";

const deleteAccountOptionsSchema = z.object({
  name: z.string().min(1, "Account name is required"),
  type: z.enum(["evm", "solana"], {
    errorMap: () => ({ message: "Type must be either 'evm' or 'solana'" }),
  }),
});

type DeleteAccountOptions = z.infer<typeof deleteAccountOptionsSchema>;

const main = async (options: DeleteAccountOptions) => {
  const { type, name } = validateAndParseSchema(
    options,
    deleteAccountOptionsSchema,
    {
      exitOnError: true,
    }
  );

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
