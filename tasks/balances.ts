import * as dotenv from "dotenv";
import { task } from "hardhat/config";
import { HardhatRuntimeEnvironment } from "hardhat/types";
import ora from "ora";

import { getBalances } from "../helpers/balances";
import { bitcoinAddress } from "../lib/bitcoinAddress";

declare const hre: any;

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
  const spinner = ora("Fetching balances...");
  if (!args.json) {
    spinner.start();
  }
  const { ethers, config } = hre as any;
  const pk = process.env.PRIVATE_KEY;
  let address: string;
  let btc_address: string;

  if (args.address) {
    address = args.address;
  } else if (pk) {
    address = new ethers.Wallet(pk).address;
    btc_address = bitcoinAddress(pk);
  } else {
    spinner.stop();
    console.error(walletError + balancesError);
    return process.exit(1);
  }

  const filteredBalances = await getBalances(address, btc_address);

  if (args.json) {
    console.log(JSON.stringify(filteredBalances, null, 2));
  } else {
    spinner.stop();
    console.log(`
EVM: ${address} ${btc_address ? `\nBitcoin: ${btc_address}` : ""}
  `);

    const output = filteredBalances.reduce((acc: any, item: any) => {
      const { networkName, ...rest } = item;
      acc[networkName] = rest;
      return acc;
    }, {});

    console.table(output);
  }
};

export const balancesTask = task(
  "balances",
  `Fetch native and ZETA token balances`,
  main
)
  .addOptionalParam("address", `Fetch balances for a specific address`)
  .addFlag("json", "Output balances as JSON");
