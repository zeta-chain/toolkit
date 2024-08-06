import ERC20_ABI from "@openzeppelin/contracts/build/contracts/ERC20.json";
import { getAddress } from "@zetachain/protocol-contracts";
import ZRC20 from "@zetachain/protocol-contracts/abi/zevm/ZRC20.sol/ZRC20.json";
import { ethers } from "ethers";
import { formatUnits } from "ethers/lib/utils";
import fetch from "isomorphic-fetch";

import { ZetaChainClient } from "./client";

export interface TokenBalance {
  balance: string;
  chain_id: number | string;
  chain_name: string;
  coin_type: string;
  contract?: string;
  decimals: number;
  id: string;
  symbol: string;
  ticker: string;
  zrc20?: string;
}

const MULTICALL3_ABI = [
  {
    inputs: [
      {
        components: [
          { internalType: "address", name: "target", type: "address" },
          { internalType: "bytes", name: "callData", type: "bytes" },
        ],
        internalType: "struct IMulticall3.Call[]",
        name: "calls",
        type: "tuple[]",
      },
    ],
    name: "aggregate",
    outputs: [
      { internalType: "uint256", name: "blockNumber", type: "uint256" },
      { internalType: "bytes[]", name: "returnData", type: "bytes[]" },
    ],
    stateMutability: "view",
    type: "function",
  },
];

/**
 * Get token balances of all tokens on all chains connected to ZetaChain.
 *
 * @param this - ZetaChainClient instance.
 * @param options.evmAddress EVM address
 * @param options.btcAddress Bitcoin address
 * @returns
 */
export const getBalances = async function (
  this: ZetaChainClient,
  { evmAddress, btcAddress }: { btcAddress?: string; evmAddress: string }
): Promise<TokenBalance[]> {
  let tokens = [];
  const supportedChains = await this.getSupportedChains();
  const foreignCoins = await this.getForeignCoins();
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
        chain_id: this.getChainId(`zeta_${this.network}`),
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
        chain_id: this.getChainId(`zeta_${this.network}`),
        coin_type: "ZRC20",
        contract: token.zrc20_contract_address,
        decimals: token.decimals,
        symbol: token.name,
      });
    }
  });
  supportedChains.forEach((chain: any) => {
    const chainLabel = Object.keys(this.getChains()).find(
      (key) => this.getChains()[key].chain_id === parseInt(chain.chain_id)
    );

    if (chainLabel) {
      const contract = getAddress("zetaToken", chainLabel as any);
      if (contract) {
        tokens.push({
          chain_id: chain.chain_id,
          coin_type: "ERC20",
          contract,
          decimals: 18,
          symbol: "WZETA",
        });
      }
    }
  });
  tokens.push({
    chain_id: this.getChainId(`zeta_${this.network}`),
    coin_type: "Gas",
    decimals: 18,
    symbol: "ZETA",
  });

  tokens = tokens
    .map((token: any) => {
      const ticker = token.symbol.split("-")[0];
      const chain_name = supportedChains.find(
        (c: any) => c.chain_id === token.chain_id.toString()
      )?.chain_name;
      return {
        ...token,
        chain_name,
        id: `${token.chain_id.toString().toLowerCase()}__${token.symbol
          .toLowerCase()
          .split(" ")
          .join("_")}`,
        ticker,
      };
    })
    .filter((token: any) => token.chain_name);

  const multicallAddress = "0xca11bde05977b3631167028862be2a173976ca11";

  const multicallContexts: Record<string, any[]> = {};

  tokens.forEach((token: any) => {
    if (token.coin_type === "ERC20" || token.coin_type === "ZRC20") {
      if (!multicallContexts[token.chain_name]) {
        multicallContexts[token.chain_name] = [];
      }
      multicallContexts[token.chain_name].push({
        callData: new ethers.utils.Interface(
          token.coin_type === "ERC20" ? ERC20_ABI.abi : ZRC20.abi
        ).encodeFunctionData("balanceOf", [evmAddress]),
        target: token.contract,
      });
    }
  });

  const balances: TokenBalance[] = [];

  await Promise.all(
    Object.keys(multicallContexts).map(async (chainName) => {
      const rpc = await this.getEndpoint("evm", chainName);
      const provider = new ethers.providers.StaticJsonRpcProvider(rpc);
      const multicallContract = new ethers.Contract(
        multicallAddress,
        MULTICALL3_ABI,
        provider
      );

      const calls = multicallContexts[chainName];

      try {
        const { returnData } = await multicallContract.callStatic.aggregate(
          calls
        );

        returnData.forEach((data: any, index: number) => {
          const token = tokens.find(
            (t) =>
              t.chain_name === chainName &&
              (t.coin_type === "ERC20" || t.coin_type === "ZRC20") &&
              t.contract === calls[index].target
          );
          if (token) {
            const balance = ethers.utils.defaultAbiCoder.decode(
              ["uint256"],
              data
            )[0];
            const formattedBalance = formatUnits(balance, token.decimals);
            balances.push({ ...token, balance: formattedBalance });
          }
        });
      } catch (error) {
        console.error(`Multicall failed for ${chainName}:`, error);
        // Fallback to individual calls if multicall fails
        for (const token of tokens.filter(
          (t) =>
            t.chain_name === chainName &&
            (t.coin_type === "ERC20" || t.coin_type === "ZRC20")
        )) {
          try {
            const contract = new ethers.Contract(
              token.contract,
              token.coin_type === "ERC20" ? ERC20_ABI.abi : ZRC20.abi,
              provider
            );
            const balance = await contract.balanceOf(evmAddress);
            const formattedBalance = formatUnits(balance, token.decimals);
            balances.push({ ...token, balance: formattedBalance });
          } catch (err) {
            console.error(
              `Failed to get balance for ${token.symbol} on ${chainName}:`,
              err
            );
          }
        }
      }
    })
  );

  await Promise.all(
    tokens
      .filter(
        (token) =>
          token.coin_type === "Gas" &&
          !["btc_testnet", "btc_mainnet"].includes(token.chain_name)
      )
      .map(async (token) => {
        const chainLabel = Object.keys(this.getChains()).find(
          (key) => this.getChains()[key].chain_id === parseInt(token.chain_id)
        );
        if (chainLabel) {
          const rpc = await this.getEndpoint("evm", chainLabel);
          const provider = new ethers.providers.StaticJsonRpcProvider(rpc);
          const balance = await provider.getBalance(evmAddress);
          const formattedBalance = formatUnits(balance, token.decimals);
          balances.push({ ...token, balance: formattedBalance });
        }
      })
  );

  await Promise.all(
    tokens
      .filter(
        (token) =>
          token.coin_type === "Gas" &&
          ["btc_testnet", "btc_mainnet"].includes(token.chain_name) &&
          btcAddress
      )
      .map(async (token) => {
        const API = this.getEndpoint("esplora", token.chain_name);
        const response = await fetch(`${API}/address/${btcAddress}`);
        const r = await response.json();
        const { funded_txo_sum, spent_txo_sum } = r.chain_stats;
        const balance = (
          (funded_txo_sum - spent_txo_sum) /
          100000000
        ).toString();
        balances.push({ ...token, balance });
      })
  );

  return balances;
};
