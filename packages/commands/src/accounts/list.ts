import { Command } from "commander";
import path from "path";
import { z } from "zod";

import {
  accountDataSchema,
  AccountInfo,
  AvailableAccountTypes,
  EVMAccountData,
  SolanaAccountData,
} from "../../../../types/accounts.types";
import {
  safeExists,
  safeReadDir,
  safeReadFile,
} from "../../../../utils/fsUtils";
import { getAccountTypeDir } from "../../../../utils/keyPaths";
import { parseJson } from "../../../../utils/parseJson";
import { validateAndParseSchema } from "../../../../utils/validateAndParseSchema";

const listAccountsOptionsSchema = z.object({
  json: z.boolean().default(false),
});

const listChainAccounts = (
  chainType: (typeof AvailableAccountTypes)[number],
  accounts: AccountInfo[]
): void => {
  const chainDir = getAccountTypeDir(chainType);
  if (!safeExists(chainDir)) return;

  const files = safeReadDir(chainDir).filter((file) => file.endsWith(".json"));

  for (const file of files) {
    const keyPath = path.join(chainDir, file);
    const keyData = parseJson(safeReadFile(keyPath), accountDataSchema);

    accounts.push({
      address:
        chainType === "evm"
          ? (keyData as EVMAccountData).address
          : (keyData as SolanaAccountData).publicKey,
      name: file.replace(".json", ""),
      type: chainType,
    });
  }
};

type ListAccountsOptions = z.infer<typeof listAccountsOptionsSchema>;

const main = (options: ListAccountsOptions): void => {
  const { json } = options;
  const accounts: AccountInfo[] = [];

  listChainAccounts("evm", accounts);
  listChainAccounts("solana", accounts);

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
