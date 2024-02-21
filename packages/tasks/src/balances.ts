import * as dotenv from "dotenv";
import { task } from "hardhat/config";
import { HardhatRuntimeEnvironment } from "hardhat/types";
import ora from "ora";

import { ZetaChainClient } from "../../client/src/";
import { bitcoinAddress } from "./bitcoinAddress";

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

const summarizeTokens = (tokens: any[]) => {
  let table = {} as any;
  tokens.forEach((token) => {
    if (!table[token.chain_name]) {
      table[token.chain_name] = {};
    }
    const balance = parseFloat(token.balance).toFixed(2);
    if (parseFloat(token.balance) > 0) {
      if (token.coin_type === "Gas") {
        table[token.chain_name].gas = balance;
      } else if (token.symbol === "ZETA") {
        table[token.chain_name].zeta = balance;
      } else if (token.coin_type === "ERC20") {
        table[token.chain_name].erc20 =
          (table[token.chain_name].erc20
            ? table[token.chain_name].erc20 + " "
            : "") +
          balance +
          " " +
          token.symbol;
      } else if (token.coin_type === "ZRC20") {
        table[token.chain_name].zrc20 =
          (table[token.chain_name].zrc20
            ? table[token.chain_name].zrc20 + " "
            : "") +
          balance +
          " " +
          token.symbol;
      }
    }
  });
  return table;
};

const main = async (args: any, hre: HardhatRuntimeEnvironment) => {
  const client = new ZetaChainClient({ network: "testnet" });
  const spinner = ora("Fetching balances...");
  if (!args.json) {
    spinner.start();
  }
  const { ethers, config } = hre as any;
  const pk = process.env.PRIVATE_KEY;
  let address: string;
  let btc_address: any;

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
  const balances = (await client.getBalances(address, btc_address)) as any;

  if (args.json) {
    console.log(JSON.stringify(balances, null, 2));
  } else {
    spinner.stop();
    console.log(`
EVM: ${address} ${btc_address ? `\nBitcoin: ${btc_address}` : ""}
    `);
    console.table(summarizeTokens(balances));
  }
};

export const balancesTask = task(
  "balances",
  `Fetch native and ZETA token balances`,
  main
)
  .addOptionalParam("address", `Fetch balances for a specific address`)
  .addFlag("json", "Output balances as JSON");
