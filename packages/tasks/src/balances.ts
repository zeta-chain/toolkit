import * as dotenv from "dotenv";
import { ethers } from "ethers";
import { task } from "hardhat/config";
import { HardhatRuntimeEnvironment } from "hardhat/types";
import ora from "ora";

import { ZetaChainClient } from "../../client/src/";
import { bitcoinAddress } from "./bitcoinAddress";

dotenv.config();

export const walletError = `
❌ Error: Wallet address not found.

To resolve this issue, please follow these steps:

* Set your PRIVATE_KEY environment variable. You can write
  it to a .env file in the root of your project like this:

  PRIVATE_KEY=123... (without the 0x prefix)
  
  Or you can generate a new private key by running:

  npx hardhat account --save
`;

const balancesError = `
* Alternatively, you can fetch the balance of any address
  by using the --address flag:
  
  npx hardhat balances --address <wallet_address>
`;

const main = async (args: any, hre: HardhatRuntimeEnvironment) => {
  const client = new ZetaChainClient({
    network: args.mainnet ? "mainnet" : "testnet",
  });
  const spinner = ora("Fetching balances...");
  if (!args.json) {
    spinner.start();
  }
  const pk = process.env.PRIVATE_KEY;
  let evmAddress: string;
  let btcAddress: any;

  if (args.address) {
    evmAddress = args.address;
  } else if (pk) {
    evmAddress = new ethers.Wallet(pk).address;
    btcAddress = bitcoinAddress(pk, args.mainnet ? "mainnet" : "testnet");
  } else {
    spinner.stop();
    console.error(walletError + balancesError);
    return process.exit(1);
  }
  let balances = (await client.getBalances({
    btcAddress,
    evmAddress,
  })) as any;

  if (args.json) {
    console.log(JSON.stringify(balances, null, 2));
  } else {
    spinner.stop();
    console.log(`
EVM: ${evmAddress} ${btcAddress ? `\nBitcoin: ${btcAddress}` : ""}
    `);
    balances = balances.sort((a: any, b: any) => {
      if (a?.chain_name === undefined && b?.chain_name === undefined) return 0;
      if (a?.chain_name === undefined) return 1;
      if (b?.chain_name === undefined) return -1;

      return a.chain_name.localeCompare(b.chain_name);
    });

    balances = balances.map((balance: any) => ({
      /* eslint-disable */
      Chain: balance.chain_name,
      Token: balance.symbol,
      Type: balance.coin_type,
      Amount: `${parseFloat(balance.balance).toFixed(6)}`,
      /* eslint-enable */
    }));
    console.table(balances);
  }
};

export const balancesTask = task(
  "balances",
  `Fetch native and ZETA token balances`,
  main
)
  .addOptionalParam("address", `Fetch balances for a specific address`)
  .addFlag("json", "Output balances as JSON")
  .addFlag("mainnet", "Run the task on mainnet");
