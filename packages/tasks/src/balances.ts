import { Keypair } from "@solana/web3.js";
import bs58 from "bs58";
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

const main = async (args: any, hre: HardhatRuntimeEnvironment) => {
  const client = new ZetaChainClient({
    network: args.mainnet ? "mainnet" : "testnet",
  });
  const spinner = ora("Fetching balances...");
  if (!args.json) {
    spinner.start();
  }

  const evmKey = process.env.EVM_PRIVATE_KEY;
  const solanaKey = process.env.SOLANA_PRIVATE_KEY;
  const btcKey = process.env.BTC_PRIVATE_KEY;

  let evmAddress: string | undefined;
  let btcAddress: string | undefined;
  let solanaAddress: string | undefined;

  if (args.evm) {
    evmAddress = args.evm;
  }
  if (args.solana) {
    solanaAddress = args.solana;
  }
  if (args.bitcoin) {
    btcAddress = args.bitcoin;
  }

  if (!evmAddress && !solanaAddress && !btcAddress) {
    if (evmKey) {
      evmAddress = new ethers.Wallet(evmKey).address;
    }
    if (solanaKey) {
      try {
        if (solanaKey.startsWith("[") && solanaKey.endsWith("]")) {
          solanaAddress = Keypair.fromSecretKey(
            Uint8Array.from(JSON.parse(solanaKey))
          ).publicKey.toString();
        } else {
          solanaAddress = Keypair.fromSecretKey(
            bs58.decode(solanaKey)
          ).publicKey.toString();
        }
      } catch (error) {
        {
          spinner.stop();
          console.error("Error parsing solanaKey", error);
          return process.exit(1);
        }
      }
    }
    if (btcKey) {
      btcAddress = bitcoinAddress(btcKey, args.mainnet ? "mainnet" : "testnet");
    }
    if (!solanaKey && !btcKey && !evmKey) {
      {
        spinner.stop();
        console.error(walletError + balancesError);
        return process.exit(1);
      }
    }
  }

  let balances = (await client.getBalances({
    btcAddress,
    evmAddress,
    solanaAddress,
  })) as any;

  if (args.json) {
    console.log(JSON.stringify(balances, null, 2));
  } else {
    spinner.stop();
    console.log(`
      EVM: ${evmAddress} ${btcAddress ? `\nBitcoin: ${btcAddress}` : ""} ${
      solanaAddress ? `\nSolana: ${solanaAddress}` : ""
    }
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
  .addFlag("json", "Output balances as JSON")
  .addFlag("mainnet", "Run the task on mainnet")
  .addOptionalParam("evm", `Fetch balances for a specific EVM address`)
  .addOptionalParam("solana", `Fetch balances for a specific Solana address`)
  .addOptionalParam("bitcoin", `Fetch balances for a specific Bitcoin address`);
