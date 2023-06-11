import { getAddress } from "@zetachain/addresses";
import ZetaEth from "@zetachain/interfaces/abi/json/contracts/Zeta.eth.sol/ZetaEth.json";
import * as dotenv from "dotenv";
import { ethers } from "ethers";
import { task } from "hardhat/config";
import { HardhatRuntimeEnvironment } from "hardhat/types";

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

const fetchNativeBalance = async (
  address: string,
  provider: ethers.providers.JsonRpcProvider
) => {
  const balance = await provider.getBalance(address);
  return parseFloat(ethers.utils.formatEther(balance)).toFixed(2);
};

const fetchZetaBalance = async (
  address: string,
  provider: ethers.providers.JsonRpcProvider,
  networkName: string
) => {
  if (networkName === "athens") return "";
  const zetaAddress = getAddress({
    address: "zetaToken",
    networkName,
    zetaNetwork: "athens",
  });
  const contract = new ethers.Contract(zetaAddress, ZetaEth, provider);
  const balance = await contract.balanceOf(address);
  return parseFloat(ethers.utils.formatEther(balance)).toFixed(2);
};

const main = async (args: any, hre: HardhatRuntimeEnvironment) => {
  const { ethers, config } = hre as any;
  const fetchBalances = async (
    address: string,
    provider: ethers.providers.JsonRpcProvider,
    networkName: string
  ) => {
    try {
      const { config } = hre as any;
      const { url } = config.networks[networkName];
      const native = await fetchNativeBalance(address, provider);
      const zeta = await fetchZetaBalance(address, provider, networkName);

      return { native, networkName, zeta };
    } catch (error) {}
  };

  let address: string;
  if (args.address) {
    address = args.address;
  } else if (process.env.PRIVATE_KEY) {
    address = new ethers.Wallet(process.env.PRIVATE_KEY).address;
  } else {
    return console.error(walletError + balancesError);
  }

  const balancePromises = Object.keys(hre.config.networks).map(
    (networkName) => {
      const { url } = hre.config.networks[networkName] as any;
      const provider = new ethers.providers.JsonRpcProvider(url);
      return fetchBalances(address, provider, networkName);
    }
  );

  const balances = await Promise.all(balancePromises);
  const filteredBalances = balances.filter((balance) => balance != null);

  console.log(`
📊 Balances for ${address}
`);
  console.table(filteredBalances);
};

export const balancesTask = task(
  "balances",
  `Fetch native and ZETA token balances`,
  main
).addOptionalParam("address", `Fetch balances for a specific address`);
