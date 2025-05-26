// @ts-expect-error - The drip function from faucet-cli is not properly typed
import { drip } from "@zetachain/faucet-cli/dist/commands/drip";
import { Command, Option } from "commander";
import { z } from "zod";

import { EVMAccountData } from "../../../types/accounts.types";
import { faucetOptionsSchema } from "../../../types/faucet.types";
import { DEFAULT_ACCOUNT_NAME } from "../../../types/shared.constants";
import { handleError, validateAndParseSchema } from "../../../utils";
import { resolveEvmAddress } from "../../../utils/addressResolver";

type FaucetOptions = z.infer<typeof faucetOptionsSchema>;

const main = async (options: FaucetOptions) => {
  try {
    const address = resolveEvmAddress({
      evmAddress: options.address,
      accountName: options.name,
    });
    // eslint-disable-next-line @typescript-eslint/no-unsafe-call
    await drip({ address });
  } catch (error) {
    handleError({
      context: "Error requesting tokens from faucet",
      error,
      shouldThrow: false,
    });
  }
};

export const faucetCommand = new Command()
  .name("faucet")
  .description("Request testnet ZETA tokens from the faucet.")
  .addOption(
    new Option("--address <address>", "Recipient address.").conflicts(["name"])
  )
  .addOption(
    new Option("--name <name>", "Account name to use if address not provided")
      .default(DEFAULT_ACCOUNT_NAME)
      .conflicts(["address"])
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
