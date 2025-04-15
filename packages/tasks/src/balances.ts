import * as dotenv from "dotenv";
import { task } from "hardhat/config";
import ora from "ora";
import { z } from "zod";

import { validateTaskArgs } from "../../../utils";
import {
  resolveBitcoinAddress,
  resolveEvmAddress,
  resolveSolanaAddress,
} from "../../../utils/addressResolver";
import { formatAddresses, formatBalances } from "../../../utils/formatting";
import { ZetaChainClient } from "../../client/src/";

dotenv.config();

export const walletError = `
❌ Error: Wallet address not found.

To resolve this issue, please follow these steps:

* Set your EVM_PRIVATE_KEY, SOLANA_PRIVATE_KEY, or BTC_PRIVATE_KEY environment variables. 
You can write it to a .env file in the root of your project like this:

  EVM_PRIVATE_KEY=123... (without the 0x prefix)
  BTC_PRIVATE_KEY=123... (without the 0x prefix)
  SOLANA_PRIVATE_KEY=123.. (base58 encoded or json array)
  
  Or you can generate a new private key by running:

  npx hardhat account --save
`;

const balancesError = `
* Alternatively, you can fetch the balance of any address
  by using the --evm, --solana, or --bitcoin flag:
  
  npx hardhat balances --evm <evm_address> --solana <solana_address> --bitcoin <bitcoin_address>
`;

const balancesArgsSchema = z.object({
  bitcoin: z.string().optional(),
  evm: z.string().optional(),
  json: z.boolean().optional(),
  mainnet: z.boolean().optional(),
  solana: z.string().optional(),
});

type BalancesArgs = z.infer<typeof balancesArgsSchema>;

const main = async (args: BalancesArgs) => {
  const parsedArgs = validateTaskArgs(args, balancesArgsSchema);

  const client = new ZetaChainClient({
    network: parsedArgs.mainnet ? "mainnet" : "testnet",
  });
  const spinner = ora("Fetching balances...");
  if (!parsedArgs.json) {
    spinner.start();
  }

  // Use address resolver utilities to handle address resolution
  const evmAddress = resolveEvmAddress({
    evmAddress: parsedArgs.evm,
    handleError: () => {
      spinner.stop();
      console.error("Error parsing EVM private key");
      process.exit(1);
    },
  });

  const solanaAddress = resolveSolanaAddress({
    handleError: () => {
      spinner.stop();
      console.error("Error parsing Solana private key");
      process.exit(1);
    },
    solanaAddress: parsedArgs.solana,
  });

  const btcAddress = resolveBitcoinAddress({
    bitcoinAddress: parsedArgs.bitcoin,
    handleError: () => {
      spinner.stop();
      console.error("Error deriving Bitcoin address");
      process.exit(1);
    },
    isMainnet: parsedArgs.mainnet,
  });

  if (!evmAddress && !solanaAddress && !btcAddress) {
    spinner.stop();
    console.error(walletError + balancesError);
    return process.exit(1);
  }

  const balances = await client.getBalances({
    btcAddress,
    evmAddress,
    solanaAddress,
  });

  if (parsedArgs.json) {
    console.log(JSON.stringify(balances, null, 2));
  } else {
    spinner.stop();

    // Use shared formatting utility
    const addressesInfo = formatAddresses({
      bitcoin: btcAddress,
      evm: evmAddress,
      solana: solanaAddress,
    });

    console.log(`\n${addressesInfo}\n`);

    // Use shared formatting utility
    const formattedBalances = formatBalances(balances);
    console.table(formattedBalances);
  }
};

export const balancesTask = task(
  "balances",
  `Fetch native and ZETA token balances`,
  main
)
  .addFlag("json", "Output balances as JSON")
  .addFlag("mainnet", "Run the task on mainnet")
  .addOptionalParam("evm", `Fetch balances for a specific EVM address`)
  .addOptionalParam("solana", `Fetch balances for a specific Solana address`)
  .addOptionalParam("bitcoin", `Fetch balances for a specific Bitcoin address`);
