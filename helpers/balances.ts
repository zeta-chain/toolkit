import { getEndpoints } from "@zetachain/networks/dist/src/getEndpoints";
import networks from "@zetachain/networks/dist/src/networks";
import { getAddress } from "@zetachain/protocol-contracts";
import ZetaEth from "@zetachain/protocol-contracts/abi/evm/Zeta.eth.sol/ZetaEth.json";
import ZRC20 from "@zetachain/protocol-contracts/abi/zevm/ZRC20.sol/ZRC20.json";
import { ethers } from "ethers";
import { formatEther } from "ethers/lib/utils";

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
  return parseFloat(formatEther(balance)).toFixed(2);
};

const fetchZetaBalance = async (
  address: string,
  provider: any,
  networkName: string
) => {
  if (networkName === "zeta_testnet") return "";
  const zetaAddress = getAddress("zetaToken", networkName as any);
  const contract = new ethers.Contract(zetaAddress, ZetaEth.abi, provider);
  const balance = await contract.balanceOf(address);
  return parseFloat(formatEther(balance)).toFixed(2);
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
  const api = getEndpoints("evm", "zeta_testnet");
  if (api.length < 1) return;
  const rpc = api[0].url;
  const provider = new ethers.providers.JsonRpcProvider(rpc);
  const promises = Object.keys(networks).map(async (networkName) => {
    try {
      const zrc20 = getAddress("zrc20", networkName as any);
      const contract = new ethers.Contract(zrc20, ZRC20.abi, provider);
      const balance = await contract.balanceOf(address);
      const denom =
        networks[networkName as keyof typeof networks].assets[0].symbol;
      if (balance > 0) {
        const b = parseFloat(formatEther(balance)).toFixed(2);
        return `${b} ${denom}`;
      }
    } catch (error) {}
  });

  const result = await Promise.all(promises);

  // tBTC ZRC-20 balance
  const btcZRC20 = "0x65a45c57636f9BcCeD4fe193A602008578BcA90b"; // TODO: use getAddress("zrc20", "btc_testnet") when available
  const contract = new ethers.Contract(btcZRC20, ZRC20.abi, provider);
  const balance = (await contract.balanceOf(address)) / 100000000;
  if (balance > 0) {
    result.push(`${balance} tBTC`);
  }

  return result.filter((item) => item !== undefined).join(", ");
};

export const getBalances = async (address: any, btc_address = null) => {
  const balancePromises = Object.keys(networks).map((networkName) => {
    const api = getEndpoints("evm", networkName as any);
    if (api.length >= 1) {
      const rpc = api[0].url;
      const provider = new ethers.providers.JsonRpcProvider(rpc);
      return fetchBalances(address, provider, networkName);
    }
  });
  const balances = await Promise.all(balancePromises);
  if (btc_address)
    balances.push((await fetchBitcoinBalance(btc_address)) as any);
  return balances.filter((balance) => balance != null);
};
