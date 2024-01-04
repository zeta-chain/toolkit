import ERC20_ABI from "@openzeppelin/contracts/build/contracts/ERC20.json";
import { getEndpoints } from "@zetachain/networks/dist/src/getEndpoints";
import { getAddress } from "@zetachain/protocol-contracts";
import ZRC20 from "@zetachain/protocol-contracts/abi/zevm/ZRC20.sol/ZRC20.json";
import { ethers } from "ethers";
import { formatUnits } from "ethers/lib/utils";
import fetch from "isomorphic-fetch";

export const getForeignCoins = async () => {
  const api = getEndpoints("cosmos-http", "zeta_testnet")[0]?.url;
  const endpoint = `${api}/zeta-chain/fungible/foreign_coins`;
  const response = await fetch(endpoint);
  const data = await response.json();
  return data.foreignCoins;
};

export const getSupportedChains = async () => {
  const api = getEndpoints("cosmos-http", "zeta_testnet")[0]?.url;
  const endpoint = `${api}/zeta-chain/observer/supportedChains`;
  const response = await fetch(endpoint);
  const data = await response.json();
  return data.chains;
};

export const getBalances = async (evmAddress: any, btcAddress = null) => {
  let tokens = [];
  const foreignCoins = await getForeignCoins();
  const supportedChains = await getSupportedChains();
  foreignCoins.forEach((token: any) => {
    if (token.coin_type === "Gas") {
      tokens.push({
        chain_id: token.foreign_chain_id,
        coin_type: token.coin_type,
        decimals: token.decimals,
        symbol: token.symbol,
        zrc20: token.zrc20_contract_address,
      });
      tokens.push({
        chain_id: 7001,
        coin_type: "ZRC20",
        contract: token.zrc20_contract_address,
        decimals: token.decimals,
        symbol: token.symbol,
      });
    } else if (token.coin_type === "ERC20") {
      tokens.push({
        chain_id: token.foreign_chain_id,
        coin_type: "ERC20",
        contract: token.asset,
        symbol: token.symbol,
        zrc20: token.zrc20_contract_address,
      });
      tokens.push({
        chain_id: 7001,
        coin_type: "ZRC20",
        contract: token.zrc20_contract_address,
        decimals: token.decimals,
        symbol: token.name,
      });
    }
  });
  supportedChains.forEach((chain: any) => {
    const contract = getAddress("zetaToken", chain.chain_name as any);
    if (contract) {
      tokens.push({
        chain_id: chain.chain_id,
        coin_type: "ERC20",
        contract,
        decimals: 18,
        symbol: "WZETA",
      });
    }
  });
  tokens.push({
    chain_id: 7001,
    coin_type: "Gas",
    decimals: 18,
    symbol: "ZETA",
  });

  tokens = tokens.map((token: any) => {
    const ticker = token.symbol.split("-")[0];
    const chain_name =
      token.chain_id === 7001
        ? "zeta_testnet"
        : supportedChains.find((c: any) => c.chain_id === token.chain_id)
            ?.chain_name;
    return {
      ...token,
      chain_name,
      id: `${token.chain_id
        .toString()
        .toLowerCase()}__${token.symbol.toLowerCase()}`,
      ticker,
    };
  });

  const balances = await Promise.all(
    tokens.map(async (token: any) => {
      const isGas = token.coin_type === "Gas";
      const isBitcoin = token.chain_name === "btc_testnet";
      const isERC = token.coin_type === "ERC20";
      const isZRC = token.coin_type === "ZRC20";
      if (isGas && !isBitcoin) {
        const rpc = getEndpoints("evm", token.chain_name)[0]?.url;
        const provider = new ethers.providers.StaticJsonRpcProvider(rpc);
        return provider.getBalance(evmAddress).then((balance) => {
          return { ...token, balance: formatUnits(balance, token.decimals) };
        });
      } else if (isGas && isBitcoin && btcAddress) {
        const API = getEndpoints("esplora", "btc_testnet")[0]?.url;
        return fetch(`${API}/address/${btcAddress}`).then(async (response) => {
          const r = await response.json();
          const { funded_txo_sum, spent_txo_sum } = r.chain_stats;
          const balance = (
            (funded_txo_sum - spent_txo_sum) /
            100000000
          ).toString();
          return { ...token, balance };
        });
      } else if (isERC) {
        const rpc = getEndpoints("evm", token.chain_name)[0]?.url;
        const provider = new ethers.providers.StaticJsonRpcProvider(rpc);
        const contract = new ethers.Contract(
          token.contract,
          ERC20_ABI.abi,
          provider
        );
        const decimals = await contract.decimals();
        return contract.balanceOf(evmAddress).then((balance: any) => {
          return {
            ...token,
            balance: formatUnits(balance, decimals),
            decimals,
          };
        });
      } else if (isZRC) {
        const rpc = getEndpoints("evm", token.chain_name)[0]?.url;
        const provider = new ethers.providers.StaticJsonRpcProvider(rpc);
        const contract = new ethers.Contract(
          token.contract,
          ZRC20.abi,
          provider
        );
        return contract.balanceOf(evmAddress).then((balance: any) => {
          return {
            ...token,
            balance: formatUnits(balance, token.decimals),
          };
        });
      } else {
        return Promise.resolve(token);
      }
    })
  );
  return balances;
};
