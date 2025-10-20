import { Command, Option } from "commander";
import { z } from "zod";

import { drip } from "../../../src/utils/faucet/drip";
import { faucetOptionsSchema } from "../../../types/faucet.types";
import { DEFAULT_ACCOUNT_NAME } from "../../../types/shared.constants";
import { handleError, validateAndParseSchema } from "../../../utils";
import { resolveEvmAddress } from "../../../utils/addressResolver";

type FaucetOptions = z.infer<typeof faucetOptionsSchema>;

const main = async (options: FaucetOptions) => {
  try {
    const address = resolveEvmAddress({
      accountName: options.name,
      evmAddress: options.address,
    });

    if (!address) {
      throw new Error(
        "Please, create an account or provide an address as an argument."
      );
    }

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
  .summary("Request testnet ZETA tokens from the faucet")
  .description("Request testnet ZETA tokens from the faucet")
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
