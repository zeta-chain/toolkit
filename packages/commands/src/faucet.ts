import { Command } from "commander";
// @ts-ignore
import { drip } from "@zetachain/faucet-cli/dist/commands/drip";
import { z } from "zod";

import { evmAddressSchema } from "../../../types/shared.schema";
import { validateAndParseSchema } from "../../../utils";
import { getAccountData } from "../../../utils/accounts";
import { EVMAccountData } from "../../../types/accounts.types";
import { DEFAULT_ACCOUNT_NAME } from "../../../types/shared.constants";
import { handleError } from "../../../utils";

const faucetOptionsSchema = z.object({
  address: evmAddressSchema.optional(),
  name: z.string().optional(),
});

type FaucetOptions = z.infer<typeof faucetOptionsSchema>;

const main = async (options: FaucetOptions) => {
  try {
    let address;
    if (options.address) {
      address = options.address;
    } else if (options.name) {
      const account = getAccountData<EVMAccountData>("evm", options.name);
      address = account?.address;
    }
    await drip({ address });
  } catch (error) {
    handleError({
      context: "Error requesting tokens from faucet",
      error,
      shouldThrow: false,
    });
    process.exit(1);
  }
};

export const faucetCommand = new Command()
  .name("faucet")
  .description("Request ZETA tokens from the faucet on a specific chain.")
  .option(
    "--address <address>",
    "Recipient address. (default: address from default account)"
  )
  .option(
    "--name <name>",
    "Account name to use if address not provided",
    DEFAULT_ACCOUNT_NAME
  )
  .action(async (options) => {
    const validatedOptions = validateAndParseSchema(
      options,
      faucetOptionsSchema,
      {
        exitOnError: true,
      }
    );
    await main(validatedOptions);
  });
