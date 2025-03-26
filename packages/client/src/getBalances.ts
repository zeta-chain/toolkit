import ERC20_ABI from "@openzeppelin/contracts/build/contracts/ERC20.json";
import { getAddress, ParamChainName } from "@zetachain/protocol-contracts";
import ZRC20 from "@zetachain/protocol-contracts/abi/ZRC20.sol/ZRC20.json";
import axios from "axios";
import { AbiCoder, ethers } from "ethers";

import {
  EsploraResponse,
  MULTICALL3_ABI,
  MulticallContract,
  RpcSolTokenByAccountResponse,
  Token,
  TokenBalance,
  TokenContract,
} from "../../../types/balances.types";
import { ZetaChainClient } from "./client";

const parseTokenId = (
  chainId: string = "",
  symbol: string = ""
): `${string}__${string}` => {
  return `${chainId}__${symbol}`;
};

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
  {
    evmAddress,
    btcAddress,
    solanaAddress,
  }: { btcAddress?: string; evmAddress?: string; solanaAddress?: string }
): Promise<TokenBalance[]> {
  let tokens: Token[] = [];

  const supportedChains = await this.getSupportedChains();
  const foreignCoins = await this.getForeignCoins();

  foreignCoins.forEach((foreignCoin) => {
    if (foreignCoin.coin_type === "Gas") {
      tokens.push({
        chain_id: foreignCoin.foreign_chain_id,
        coin_type: foreignCoin.coin_type,
        decimals: foreignCoin.decimals,
        symbol: foreignCoin.symbol,
        zrc20: foreignCoin.zrc20_contract_address,
      });
      tokens.push({
        chain_id: this.getChainId(`zeta_${this.network}`),
        coin_type: "ZRC20",
        contract: foreignCoin.zrc20_contract_address,
        decimals: foreignCoin.decimals,
        symbol: foreignCoin.symbol,
      });
    } else if (foreignCoin.coin_type === "ERC20") {
      const supportedChain = supportedChains.find(
        (c) => c.chain_id === foreignCoin.foreign_chain_id
      );

      if (supportedChain?.vm === "evm") {
        tokens.push({
          chain_id: foreignCoin.foreign_chain_id,
          coin_type: "ERC20",
          contract: foreignCoin.asset,
          decimals: foreignCoin.decimals,
          symbol: foreignCoin.symbol,
          zrc20: foreignCoin.zrc20_contract_address,
        });
      } else if (supportedChain?.vm === "svm") {
        tokens.push({
          chain_id: foreignCoin.foreign_chain_id,
          coin_type: "SPL",
          contract: foreignCoin.asset,
          decimals: foreignCoin.decimals,
          symbol: foreignCoin.symbol,
          zrc20: foreignCoin.zrc20_contract_address,
        });
      }

      tokens.push({
        chain_id: this.getChainId(`zeta_${this.network}`),
        coin_type: "ZRC20",
        contract: foreignCoin.zrc20_contract_address,
        decimals: foreignCoin.decimals,
        symbol: foreignCoin.name,
      });
    }
  });

  supportedChains.forEach((chain) => {
    const chainLabel = Object.keys(this.getChains()).find(
      (key) => this.getChains()[key].chain_id === parseInt(chain.chain_id)
    );

    if (chainLabel) {
      const contract = getAddress("zetaToken", chainLabel as ParamChainName);
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
    .map((token) => {
      const ticker = token.symbol.split("-")[0];
      const chain_name = supportedChains.find(
        (c) => c.chain_id === token.chain_id?.toString()
      )?.name;

      return {
        ...token,
        chain_name,
        id: `${token.chain_id?.toString().toLowerCase()}__${token.symbol
          .toLowerCase()
          .split(" ")
          .join("_")}`,
        ticker,
      };
    })
    .filter((token) => token.chain_name);

  const multicallAddress = "0xca11bde05977b3631167028862be2a173976ca11";

  const multicallContexts: Record<
    string,
    { callData: string; target: string }[]
  > = {};

  const balances: TokenBalance[] = [];

  if (evmAddress) {
    tokens.forEach((token) => {
      if (
        (token.coin_type === "ERC20" || token.coin_type === "ZRC20") &&
        token.chain_name &&
        token.contract
      ) {
        if (!multicallContexts[token.chain_name]) {
          multicallContexts[token.chain_name] = [];
        }

        multicallContexts[token.chain_name].push({
          callData: new ethers.Interface(
            token.coin_type === "ERC20" ? ERC20_ABI.abi : ZRC20.abi
          ).encodeFunctionData("balanceOf", [evmAddress]),
          target: token.contract,
        });
      }
    });

    await Promise.all(
      Object.keys(multicallContexts).map(async (chainName) => {
        const rpc = this.getEndpoint("evm", chainName);
        const provider = new ethers.JsonRpcProvider(rpc);
        const multicallInterface = new ethers.Interface(MULTICALL3_ABI);
        const multicallContract: MulticallContract = new ethers.Contract(
          multicallAddress,
          multicallInterface,
          provider
        );

        const calls = multicallContexts[chainName];

        try {
          if (!multicallContract.aggregate) {
            throw new Error(
              "aggregate method not available on Multicall Contract"
            );
          }

          const [, returnData] = await multicallContract.aggregate.staticCall(
            calls
          );

          returnData.forEach((data, index: number) => {
            const token = tokens.find(
              (t) =>
                t.chain_name === chainName &&
                (t.coin_type === "ERC20" || t.coin_type === "ZRC20") &&
                t.contract === calls[index].target
            );
            if (token) {
              const abiCoder = AbiCoder.defaultAbiCoder();
              const [decoded] = abiCoder.decode(["uint256"], data);

              if (typeof decoded !== "bigint") {
                throw new Error("Invalid decoded value: expected bigint");
              }

              const balance = BigInt(decoded);

              const formattedBalance = ethers.formatUnits(
                balance,
                token.decimals
              );

              balances.push({
                ...token,
                balance: formattedBalance,
                id: parseTokenId(token.chain_id?.toString(), token.symbol),
              });
            }
          });
        } catch {
          // Fallback to individual calls if multicall fails
          for (const token of tokens.filter(
            (t) =>
              t.chain_name === chainName &&
              (t.coin_type === "ERC20" || t.coin_type === "ZRC20")
          )) {
            try {
              if (!token.contract) {
                continue;
              }

              const contract = new ethers.Contract(
                token.contract,
                token.coin_type === "ERC20" ? ERC20_ABI.abi : ZRC20.abi,
                provider
              ) as TokenContract;

              const balance = await contract.balanceOf(evmAddress);
              const formattedBalance = ethers.formatUnits(
                balance,
                token.decimals
              );

              balances.push({
                ...token,
                balance: formattedBalance,
                id: parseTokenId(token.chain_id?.toString(), token.symbol),
              });
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

    const nonEvmChainNames = [
      "btc_testnet",
      "btc_mainnet",
      "solana_mainnet",
      "solana_testnet",
      "solana_devnet",
    ];

    await Promise.all(
      tokens
        .filter(
          (token) =>
            token.coin_type === "Gas" &&
            token.chain_name &&
            !nonEvmChainNames.includes(token.chain_name)
        )
        .map(async (token) => {
          const chainLabel = Object.keys(this.getChains()).find((key) => {
            const parsedTokenChainId = parseInt(
              (token.chain_id as string) || ""
            );

            return this.getChains()[key].chain_id === parsedTokenChainId;
          });

          if (chainLabel) {
            const rpc = this.getEndpoint("evm", chainLabel);
            const provider = new ethers.JsonRpcProvider(rpc);
            const balance = await provider.getBalance(evmAddress);
            const formattedBalance = ethers.formatUnits(
              balance,
              token.decimals
            );

            balances.push({
              ...token,
              balance: formattedBalance,
              id: parseTokenId(token.chain_id?.toString(), token.symbol),
            });
          }
        })
    );
  }

  const btcChainNames = ["btc_testnet", "btc_mainnet"];

  await Promise.all(
    tokens
      .filter(
        (token) =>
          token.coin_type === "Gas" &&
          token.chain_name &&
          btcChainNames.includes(token.chain_name) &&
          btcAddress
      )
      .map(async (token) => {
        const API = this.getEndpoint("esplora", token.chain_name || "");

        const { data } = await axios.get<EsploraResponse>(
          `${API}/address/${btcAddress}`
        );

        const { funded_txo_sum, spent_txo_sum } = data.chain_stats;

        const balance = (
          (BigInt(funded_txo_sum) - BigInt(spent_txo_sum)) /
          BigInt(100000000)
        ).toString();

        balances.push({
          ...token,
          balance,
          id: parseTokenId(token.chain_id?.toString(), token.symbol),
        });
      })
  );

  const solChainNames = ["solana_mainnet", "solana_testnet", "solana_devnet"];

  await Promise.all(
    tokens
      .filter(
        (token) =>
          token.coin_type === "Gas" &&
          token.chain_name &&
          solChainNames.includes(token.chain_name) &&
          solanaAddress
      )
      .map(async (token) => {
        const API = this.getEndpoint("solana", token.chain_name || "");

        const { data } = await axios.post<{ result: { value: number } }>(
          API,
          {
            id: 1,
            jsonrpc: "2.0",
            method: "getBalance",
            params: [solanaAddress],
          },
          {
            headers: {
              "Content-Type": "application/json",
            },
          }
        );

        const balance = (Number(data.result.value) / 10 ** 9).toFixed(9);

        balances.push({
          ...token,
          balance,
          id: parseTokenId(token.chain_id?.toString(), token.symbol),
        });
      })
  );

  const splTokens = tokens.filter(
    (token) =>
      token.coin_type === "SPL" &&
      token.chain_name &&
      ["solana_mainnet", "solana_testnet", "solana_devnet"].includes(
        token.chain_name
      )
  );

  await Promise.all(
    splTokens.map(async (token) => {
      try {
        const API = this.getEndpoint("solana", token.chain_name || "");
        const response = await axios.post<RpcSolTokenByAccountResponse>(
          API,
          {
            id: 1,
            jsonrpc: "2.0",
            method: "getTokenAccountsByOwner",
            params: [
              solanaAddress,
              { mint: token.contract },
              {
                encoding: "jsonParsed",
              },
            ],
          },
          {
            headers: {
              "Content-Type": "application/json",
            },
          }
        );

        const isResponseOk = response.status >= 200 && response.status < 300;

        if (!isResponseOk) {
          console.error(
            `Failed to fetch SPL token accounts for ${token.symbol}`,
            response
          );
          balances.push({
            ...token,
            balance: "0",
            id: parseTokenId(token.chain_id?.toString(), token.symbol),
          });
          return;
        }

        const data = response.data;

        if (data.result && data.result.value && data.result.value.length > 0) {
          let totalBalance = BigInt(0);

          for (const acc of data.result.value) {
            const amount = acc.account.data.parsed.info.tokenAmount.amount;
            const decimals = acc.account.data.parsed.info.tokenAmount.decimals;
            totalBalance += BigInt(amount) / BigInt(10 ** decimals);
          }
          balances.push({
            ...token,
            balance: totalBalance.toString(),
            id: parseTokenId(token.chain_id?.toString(), token.symbol),
          });
        } else {
          balances.push({
            ...token,
            balance: "0",
            id: parseTokenId(token.chain_id?.toString(), token.symbol),
          });
        }
      } catch (err) {
        console.error(
          `Failed to get SPL balance for ${token.symbol} on ${token.chain_name}:`,
          err
        );
        balances.push({
          ...token,
          balance: "0",
          id: parseTokenId(token.chain_id?.toString(), token.symbol),
        });
      }
    })
  );

  return balances;
};
