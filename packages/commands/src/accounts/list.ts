import { Command } from "commander";
import { z } from "zod";

import { AvailableAccountTypes } from "../../../../types/accounts.types";
import { listChainAccounts } from "../../../../utils/accounts";
import { validateAndParseSchema } from "../../../../utils/validateAndParseSchema";

const listAccountsOptionsSchema = z.object({
  json: z.boolean().default(false),
});

type ListAccountsOptions = z.infer<typeof listAccountsOptionsSchema>;

const main = (options: ListAccountsOptions): void => {
  const { json } = options;

  const accounts = AvailableAccountTypes.flatMap((chainType) =>
    listChainAccounts(chainType)
  );

  if (accounts.length === 0) {
    console.log("No accounts found.");
    return;
  }

  if (json) {
    console.log(JSON.stringify(accounts, null, 2));
  } else {
    console.log("\nAvailable Accounts:");
    console.table(accounts);
  }
};

export const listAccountsCommand = new Command("list")
  .description("List all available accounts")
  .option("--json", "Output in JSON format")
  .action((opts) => {
    const validated = validateAndParseSchema(opts, listAccountsOptionsSchema, {
      exitOnError: true,
    });
    main(validated);
  });
