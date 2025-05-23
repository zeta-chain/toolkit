import chalk from "chalk";
import { Command, Option } from "commander";
import ora from "ora";
import { z } from "zod";

import { accountNameSchema } from "../../../../types/accounts.types";
import {
  resolveBitcoinAddress,
  resolveEvmAddress,
  resolveSolanaAddress,
  resolveSuiAddress,
} from "../../../../utils/addressResolver";
import { formatAddresses, formatBalances } from "../../../../utils/formatting";
import { ZetaChainClient } from "../../../client/src/client";

const WALLET_ERROR = `
❌ Error: Wallet addresses not found.

To resolve this issue, please choose one of these options:

1. Provide wallet addresses directly with command arguments:
   --evm <address>
   --solana <address>
   --bitcoin <address>
   --sui <address>
   
2. Generate new wallets automatically by running:
   npx zetachain accounts create --name <name>
`;

const balancesOptionsSchema = z.object({
  bitcoin: z.string().optional(),
  evm: z.string().optional(),
  json: z.boolean().default(false),
  name: accountNameSchema.optional(),
  network: z.enum(["mainnet", "testnet"]).default("testnet"),
  solana: z.string().optional(),
  sui: z.string().optional(),
  ton: z.string().optional(),
});

type BalancesOptions = z.infer<typeof balancesOptionsSchema>;

const main = async (options: BalancesOptions) => {
  const spinner = ora("Connecting to network...").start();

  try {
    const evmAddress = resolveEvmAddress({
      accountName: options.name,
      evmAddress: options.evm,
      handleError: () =>
        spinner.warn(
          `Error resolving EVM address ${
            !options.evm && options.name ? `for user '${options.name}'` : ""
          }`
        ),
    });

    const solanaAddress = resolveSolanaAddress({
      accountName: options.name,
      handleError: () =>
        spinner.warn(
          `Error resolving Solana address ${
            !options.solana && options.name ? `for user '${options.name}'` : ""
          }`
        ),
      solanaAddress: options.solana,
    });

    const btcAddress = resolveBitcoinAddress({
      accountName: options.name,
      bitcoinAddress: options.bitcoin,
      handleError: () =>
        spinner.warn(
          `Error resolving Bitcoin ${options.network} address${
            !options.bitcoin && options.name
              ? ` for account '${options.name}'`
              : ""
          }`
        ),
      isMainnet: options.network === "mainnet",
    });

    const suiAddress = resolveSuiAddress({
      accountName: options.name,
      handleError: () =>
        spinner.warn(
          `Error resolving Sui address ${
            !options.sui && options.name ? `for user '${options.name}'` : ""
          }`
        ),
      suiAddress: options.sui,
    });

    const tonAddress = options.ton;

    if (
      !evmAddress &&
      !btcAddress &&
      !solanaAddress &&
      !suiAddress &&
      !tonAddress
    ) {
      spinner.fail("No addresses provided or derivable from account name");
      console.error(chalk.red(WALLET_ERROR));
      return;
    }

    spinner.text = "Initializing client...";
    const client = new ZetaChainClient({
      network: options.network,
    });

    spinner.text = `Fetching balances on ${options.network}...`;
    const balances = await client.getBalances({
      btcAddress,
      evmAddress,
      solanaAddress,
      suiAddress,
      tonAddress,
    });

    spinner.succeed("Successfully fetched balances");

    if (options.json) {
      console.log(JSON.stringify(balances, null, 2));
      return;
    }

    const addressesInfo = formatAddresses({
      bitcoin: btcAddress,
      evm: evmAddress,
      solana: solanaAddress,
      sui: suiAddress,
    });

    if (addressesInfo) {
      console.log("\n" + addressesInfo + "\n");
    }

    if (balances.length === 0) {
      console.log(chalk.yellow("No balances found for the provided addresses"));
      return;
    }

    console.table(formatBalances(balances));
  } catch (error) {
    spinner.fail("Failed to fetch balances");
    console.error(chalk.red("Error details:"), error);
  }
};

export const balancesCommand = new Command("balances")
  .description("Fetch native and ZETA token balances")
  .option("--evm <address>", "Fetch balances for a specific EVM address")
  .option("--solana <address>", "Fetch balances for a specific Solana address")
  .option(
    "--bitcoin <address>",
    "Fetch balances for a specific Bitcoin address"
  )
  .option("--sui <address>", "Fetch balances for a specific Sui address")
  .option("--ton <address>", "Fetch balances for a specific TON address")
  .option("--name <name>", "Account name")
  .addOption(
    new Option("--network <network>", "Network to use")
      .choices(["mainnet", "testnet"])
      .default("testnet")
  )
  .option("--json", "Output balances as JSON")
  .action(async (options: BalancesOptions) => {
    const validatedOptions = balancesOptionsSchema.parse(options);
    await main(validatedOptions);
  });
