import { getEndpoints, networks } from "@zetachain/networks";
import { getAddress } from "@zetachain/protocol-contracts";
import ZetaEth from "@zetachain/protocol-contracts/abi/evm/Zeta.eth.sol/ZetaEth.json";
import ZRC20 from "@zetachain/protocol-contracts/abi/zevm/ZRC20.sol/ZRC20.json";
import * as dotenv from "dotenv";
import { task } from "hardhat/config";
import { HardhatRuntimeEnvironment } from "hardhat/types";
import ora from "ora";

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

const fetchBitcoinBalance = async (address: string) => {
  const API = getEndpoints("esplora", "btc_testnet")[0].url;
  if (API === undefined) throw new Error("fetchBitcoinBalance: API not found");

  try {
    const response = await fetch(`${API}/address/${address}`);
    const data = await response.json();
    const { funded_txo_sum, spent_txo_sum } = data.chain_stats;
    const balance = funded_txo_sum - spent_txo_sum;
    return {
      native: `${balance / 100000000}`,
      networkName: "btc_testnet",
    };
  } catch (error) {}
};

const fetchNativeBalance = async (address: string, provider: any) => {
  const balance = await provider.getBalance(address);
  return parseFloat(hre.ethers.utils.formatEther(balance)).toFixed(2);
};

const fetchZetaBalance = async (
  address: string,
  provider: any,
  networkName: string
) => {
  if (networkName === "athens") return "";
  const zetaAddress = getAddress("zetaToken", networkName as any);
  const contract = new hre.ethers.Contract(zetaAddress, ZetaEth.abi, provider);
  const balance = await contract.balanceOf(address);
  return parseFloat(hre.ethers.utils.formatEther(balance)).toFixed(2);
};

const fetchBalances = async (
  address: string,
  provider: any,
  networkName: string
) => {
  try {
    const native = await fetchNativeBalance(address, provider);
    const zeta = await fetchZetaBalance(address, provider, networkName);
    const isZeta = networkName === "zeta_testnet";
    const zrc20 = isZeta ? { zrc20: await fetchZRC20Balance(address) } : {};
    /* eslint-disable */
    return { networkName, native, zeta, ...zrc20 };
    /* eslint-enable */
  } catch (error) {}
};

const fetchZRC20Balance = async (address: string) => {
  const { url } = hre.config.networks["zeta_testnet"] as any;
  const provider = new hre.ethers.providers.JsonRpcProvider(url);

  const promises = Object.keys(hre.config.networks).map(async (networkName) => {
    try {
      const zrc20 = getAddress("zrc20", networkName);
      const contract = new hre.ethers.Contract(zrc20, ZRC20.abi, provider);
      const balance = await contract.balanceOf(address);
      const denom = networks[networkName].assets[0].symbol;
      if (balance > 0) {
        const b = parseFloat(hre.ethers.utils.formatEther(balance)).toFixed(2);
        return `${b} ${denom}`;
      }
    } catch (error) {}
  });

  const result = await Promise.all(promises);

  // tBTC ZRC-20 balance
  const btcZRC20 = "0x65a45c57636f9BcCeD4fe193A602008578BcA90b"; // TODO: use getAddress("zrc20", "btc_testnet") when available
  const contract = new hre.ethers.Contract(btcZRC20, ZRC20.abi, provider);
  const balance = (await contract.balanceOf(address)) / 100000000;
  if (balance > 0) {
    result.push(`${balance} tBTC`);
  }

  return result.filter((item) => item !== undefined).join(", ");
};

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
  const balancePromises = Object.keys(config.networks).map((networkName) => {
    const { url } = config.networks[networkName] as any;
    const provider = new ethers.providers.JsonRpcProvider(url);
    return fetchBalances(address, provider, networkName);
  });

  const balances = await Promise.all(balancePromises);
  balances.push(await fetchBitcoinBalance(btc_address));
  const filteredBalances = balances.filter((balance) => balance != null);
  if (args.json) {
    console.log(JSON.stringify(filteredBalances, null, 2));
  } else {
    spinner.stop();
    console.log(`
EVM: ${address} ${btc_address ? `\nBitcoin: ${btc_address}` : ""}
  `);
    console.table(filteredBalances);
  }
};

export const balancesTask = task(
  "balances",
  `Fetch native and ZETA token balances`,
  main
)
  .addOptionalParam("address", `Fetch balances for a specific address`)
  .addFlag("json", "Output balances as JSON");
