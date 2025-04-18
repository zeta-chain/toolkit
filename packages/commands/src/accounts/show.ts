import { Command, Option } from "commander";
import { z } from "zod";

import {
  accountDataSchema,
  AccountDetails,
  accountNameSchema,
  AvailableAccountTypes,
  EVMAccountData,
  SolanaAccountData,
} from "../../../../types/accounts.types";
import { safeExists, safeReadFile } from "../../../../utils/fsUtils";
import { getAccountKeyPath } from "../../../../utils/keyPaths";
import { parseJson } from "../../../../utils/parseJson";
import { validateAndParseSchema } from "../../../../utils/validateAndParseSchema";

const showAccountOptionsSchema = z.object({
  json: z.boolean().default(false),
  name: accountNameSchema,
  type: z.enum(AvailableAccountTypes, {
    errorMap: () => ({ message: "Type must be either 'evm' or 'solana'" }),
  }),
});

type ShowAccountOptions = z.infer<typeof showAccountOptionsSchema>;

const getEVMAccountDetails = (
  keyData: EVMAccountData,
  keyPath: string
): AccountDetails => {
  return {
    address: keyData.address,
    fileLocation: keyPath,
    mnemonic: keyData.mnemonic || "N/A",
    name: keyData.name || "N/A",
    privateKey: keyData.privateKey,
    type: "evm",
  };
};

const getSolanaAccountDetails = (
  keyData: SolanaAccountData,
  keyPath: string
): AccountDetails => {
  return {
    fileLocation: keyPath,
    name: keyData.name || "N/A",
    publicKey: keyData.publicKey,
    secretKey: keyData.secretKey,
    type: "solana",
  };
};

const main = (options: ShowAccountOptions): void => {
  const { type, name, json } = options;

  const keyPath = getAccountKeyPath(type, name);

  if (!safeExists(keyPath)) {
    console.error(`Account ${name} of type ${type} not found at ${keyPath}`);
    return;
  }

  const keyData = parseJson(safeReadFile(keyPath), accountDataSchema);
  keyData.name = name; // Add name to keyData for display

  const accountDetails =
    type === "evm"
      ? getEVMAccountDetails(keyData as EVMAccountData, keyPath)
      : getSolanaAccountDetails(keyData as SolanaAccountData, keyPath);

  if (json) {
    console.log(JSON.stringify(accountDetails, null, 2));
  } else {
    console.log("\nAccount Details:");
    console.table(accountDetails);
  }
};

export const showAccountsCommand = new Command("show")
  .description("Show details of an existing account")
  .addOption(
    new Option("--type <type>", "Account type (evm or solana)").choices(
      AvailableAccountTypes
    )
  )
  .requiredOption("--name <name>", "Account name")
  .option("--json", "Output in JSON format")
  .action((opts) => {
    const validated = validateAndParseSchema(opts, showAccountOptionsSchema, {
      exitOnError: true,
    });
    main(validated);
  });
