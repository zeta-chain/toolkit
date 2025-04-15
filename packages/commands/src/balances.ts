import chalk from "chalk";
import { Command } from "commander";
import * as dotenv from "dotenv";
import ora from "ora";

import {
  resolveBitcoinAddress,
  resolveEvmAddress,
  resolveSolanaAddress,
} from "../../../utils/addressResolver";
import { formatAddresses, formatBalances } from "../../../utils/formatting";
import { ZetaChainClient } from "../../client/src/client";

dotenv.config();

/**
 * @todo (Hernan): We need to change this to the account command once we have it.
 */
const WALLET_ERROR = `
❌ Error: Wallet addresses not found.

To resolve this issue, please choose one of these options:

1. Provide wallet addresses directly with command arguments:
   --evm <address>
   --solana <address>
   --bitcoin <address>

2. Use existing wallets by setting their private keys in environment variables:
   Add these to a .env file in the root of your project:

   EVM_PRIVATE_KEY=123... (without the 0x prefix)
   BTC_PRIVATE_KEY=123... (without the 0x prefix)
   SOLANA_PRIVATE_KEY=123.. (base58 encoded or json array)
   
3. Generate new wallets automatically by running:
   npx hardhat account --save
`;

interface BalancesOptions {
  bitcoin?: string;
  evm?: string;
  json?: boolean;
  mainnet?: boolean;
  solana?: string;
}

const main = async (options: BalancesOptions) => {
  const spinner = ora("Connecting to network...").start();

  try {
    const evmAddress = resolveEvmAddress({
      evmAddress: options.evm,
      handleError: () => spinner.warn("Error parsing EVM private key"),
    });

    const solanaAddress = resolveSolanaAddress({
      handleError: () => spinner.warn("Error parsing Solana private key"),
      solanaAddress: options.solana,
    });

    const btcAddress = resolveBitcoinAddress({
      bitcoinAddress: options.bitcoin,
      handleError: () => spinner.warn("Error deriving Bitcoin address"),
      isMainnet: options.mainnet,
    });

    if (!evmAddress && !btcAddress && !solanaAddress) {
      spinner.fail("No addresses provided or derivable from private keys");
      console.error(chalk.red(WALLET_ERROR));
      return;
    }

    spinner.text = "Initializing client...";
    const client = new ZetaChainClient({
      network: options.mainnet ? "mainnet" : "testnet",
    });

    spinner.text = `Fetching balances on ${
      options.mainnet ? "mainnet" : "testnet"
    }...`;
    const balances = await client.getBalances({
      btcAddress,
      evmAddress,
      solanaAddress,
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
  .option("--mainnet", "Run the command on mainnet")
  .option("--json", "Output balances as JSON")
  .action(main);
