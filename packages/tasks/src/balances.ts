import { Keypair } from "@solana/web3.js";
import bs58 from "bs58";
import * as dotenv from "dotenv";
import { ethers } from "ethers";
import { task } from "hardhat/config";
import ora from "ora";
import { z } from "zod";

import { numberArraySchema } from "../../../types/shared.schema";
import { parseJson, validateAndParseSchema } from "../../../utils";
import { generateBitcoinAddress } from "../../../utils/generateBitcoinAddress";
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
  const parsedArgs = validateAndParseSchema(args, balancesArgsSchema);

  const client = new ZetaChainClient({
    network: parsedArgs.mainnet ? "mainnet" : "testnet",
  });
  const spinner = ora("Fetching balances...");
  if (!parsedArgs.json) {
    spinner.start();
  }

  const evmKey = process.env.EVM_PRIVATE_KEY || process.env.PRIVATE_KEY;
  const solanaKey = process.env.SOLANA_PRIVATE_KEY;
  const btcKey = process.env.BTC_PRIVATE_KEY;

  let evmAddress: string | undefined;
  let btcAddress: string | undefined;
  let solanaAddress: string | undefined;

  if (parsedArgs.evm) {
    evmAddress = parsedArgs.evm;
  }
  if (parsedArgs.solana) {
    solanaAddress = parsedArgs.solana;
  }
  if (parsedArgs.bitcoin) {
    btcAddress = parsedArgs.bitcoin;
  }

  if (!evmAddress && !solanaAddress && !btcAddress) {
    if (evmKey) {
      try {
        evmAddress = new ethers.Wallet(evmKey).address;
      } catch (error) {
        spinner.stop();
        console.error("Error parsing EVM private key", error);
        return process.exit(1);
      }
    }
    if (solanaKey) {
      try {
        if (solanaKey.startsWith("[") && solanaKey.endsWith("]")) {
          const parsedKey = parseJson(solanaKey, numberArraySchema);

          solanaAddress = Keypair.fromSecretKey(
            Uint8Array.from(parsedKey)
          ).publicKey.toString();
        } else {
          solanaAddress = Keypair.fromSecretKey(
            bs58.decode(solanaKey)
          ).publicKey.toString();
        }
      } catch (error) {
        spinner.stop();
        console.error("Error parsing Solana private key", error);
        return process.exit(1);
      }
    }
    if (btcKey) {
      btcAddress = generateBitcoinAddress(
        btcKey,
        parsedArgs.mainnet ? "mainnet" : "testnet"
      );
    }
    if (!solanaKey && !btcKey && !evmKey) {
      {
        spinner.stop();
        console.error(walletError + balancesError);
        return process.exit(1);
      }
    }
  }

  let balances = await client.getBalances({
    btcAddress,
    evmAddress,
    solanaAddress,
  });

  if (parsedArgs.json) {
    console.log(JSON.stringify(balances, null, 2));
  } else {
    spinner.stop();

    console.log(`
EVM: ${evmAddress} ${btcAddress ? `\nBitcoin: ${btcAddress}` : ""} ${
      solanaAddress ? `\nSolana: ${solanaAddress}` : ""
    }
    `);
    balances = balances.sort((a, b) => {
      if (a?.chain_name === undefined && b?.chain_name === undefined) return 0;
      if (a?.chain_name === undefined) return 1;
      if (b?.chain_name === undefined) return -1;

      return a.chain_name.localeCompare(b.chain_name);
    });

    const parsedBalances = balances.map((balance) => ({
      Amount: `${parseFloat(balance.balance).toFixed(6)}`,
      Chain: balance.chain_name,
      Token: balance.symbol,
      Type: balance.coin_type,
    }));
    console.table(parsedBalances);
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
