import ERC20_ABI from "@openzeppelin/contracts/build/contracts/ERC20.json";
import { getAddress, ParamChainName } from "@zetachain/protocol-contracts";
import ZRC20 from "@zetachain/protocol-contracts/abi/ZRC20.sol/ZRC20.json";
import axios from "axios";
import { AbiCoder, ethers } from "ethers";
import { getFullnodeUrl, SuiClient } from "@mysten/sui/client";

import {
  Call,
  MULTICALL3_ABI,
  MulticallContract,
  RpcSolTokenByAccountResponse,
  Token,
  TokenBalance,
  TokenContract,
} from "../types/balances.types";
import { ForeignCoin } from "../types/foreignCoins.types";
import { ObserverSupportedChain } from "../types/supportedChains.types";
import { handleError } from "./handleError";

export interface UTXO {
  txid: string;
  value: number;
  vout: number;
}

/**
 * Parses a token ID from chain ID and symbol
 */
export const parseTokenId = (
  chainId: string = "",
  symbol: string = ""
): `${string}__${string}` => {
  return `${chainId}__${symbol}`;
};

/**
 * Collects tokens from foreign coins data
 */
export const collectTokensFromForeignCoins = (
  foreignCoins: ForeignCoin[],
  supportedChains: ObserverSupportedChain[],
  zetaChainId: string
): Token[] => {
  const mappedTokens = foreignCoins.flatMap((foreignCoin) => {
    if (foreignCoin.coin_type === "Gas") {
      // Return an array of two tokens for Gas coin type
      return [
        {
          chain_id: foreignCoin.foreign_chain_id,
          coin_type: foreignCoin.coin_type,
          decimals: foreignCoin.decimals,
          symbol: foreignCoin.symbol,
          zrc20: foreignCoin.zrc20_contract_address,
        },
        {
          chain_id: zetaChainId,
          coin_type: "ZRC20",
          contract: foreignCoin.zrc20_contract_address,
          decimals: foreignCoin.decimals,
          symbol: foreignCoin.symbol,
        },
      ];
    } else if (foreignCoin.coin_type === "ERC20") {
      const supportedChain = supportedChains.find(
        (sc) => sc.chain_id === foreignCoin.foreign_chain_id
      );

      // Create tokens based on VM type
      const zrc20Token: Token = {
        chain_id: zetaChainId,
        coin_type: "ZRC20",
        contract: foreignCoin.zrc20_contract_address,
        decimals: foreignCoin.decimals,
        symbol: foreignCoin.name,
      };

      // Only add the original token if we have a supported chain
      if (supportedChain?.vm === "evm") {
        const evmToken: Token = {
          chain_id: foreignCoin.foreign_chain_id,
          coin_type: "ERC20",
          contract: foreignCoin.asset,
          decimals: foreignCoin.decimals,
          symbol: foreignCoin.symbol,
          zrc20: foreignCoin.zrc20_contract_address,
        };
        return [evmToken, zrc20Token];
      } else if (supportedChain?.vm === "svm") {
        const svmToken: Token = {
          chain_id: foreignCoin.foreign_chain_id,
          coin_type: "SPL",
          contract: foreignCoin.asset,
          decimals: foreignCoin.decimals,
          symbol: foreignCoin.symbol,
          zrc20: foreignCoin.zrc20_contract_address,
        };
        return [svmToken, zrc20Token];
      }

      // If no matching chain type, just return the ZRC20 token
      return [zrc20Token];
    } else if (foreignCoin.coin_type === "ZRC20") {
      // Handle ZRC20 tokens
      return [
        {
          chain_id: zetaChainId,
          coin_type: "ZRC20",
          contract: foreignCoin.zrc20_contract_address,
          decimals: foreignCoin.decimals,
          symbol: foreignCoin.symbol,
        },
      ];
    }

    // In case the coin_type is something else
    return [];
  });

  return mappedTokens;
};

/**
 * Adds ZETA tokens to the tokens list
 */
export const addZetaTokens = (
  supportedChains: ObserverSupportedChain[],
  chains: Record<string, { chain_id: number }>,
  zetaChainId: string
): Token[] => {
  // Map chains to WZETA tokens where available
  const wzetaTokens = supportedChains
    .map((chain) => {
      const chainLabel = Object.keys(chains).find(
        (key) => chains[key].chain_id === parseInt(chain.chain_id)
      );

      if (chainLabel) {
        const contract = getAddress("zetaToken", chainLabel as ParamChainName);
        if (contract) {
          return {
            chain_id: chain.chain_id,
            coin_type: "ERC20",
            contract,
            decimals: 18,
            symbol: "WZETA",
          } as Token;
        }
      }
      return null;
    })
    .filter((token): token is Token => token !== null);

  // Add ZETA token for ZetaChain
  const zetaToken: Token = {
    chain_id: zetaChainId,
    coin_type: "Gas",
    decimals: 18,
    symbol: "ZETA",
  };

  return [...wzetaTokens, zetaToken];
};

/**
 * Enriches tokens with additional metadata
 */
export const enrichTokens = (
  tokens: Token[],
  supportedChains: ObserverSupportedChain[]
): Token[] => {
  return tokens
    .map((token) => {
      const ticker = token.symbol.split("-")[0];
      const chain_name = supportedChains.find(
        (c) => c.chain_id === token.chain_id?.toString()
      )?.name;

      // Skip tokens without a chain name
      if (!chain_name) return null;

      return {
        ...token,
        chain_name,
        id: `${token.chain_id?.toString().toLowerCase() || ""}__${token.symbol
          .toLowerCase()
          .split(" ")
          .join("_")}`,
        ticker,
      };
    })
    .filter(
      (
        token
      ): token is Token & { chain_name: string; id: string; ticker: string } =>
        token !== null
    ) as Token[]; // Safe cast since we've added properties that extend Token
};

/**
 * Prepares multicall contexts for EVM tokens
 */
export const prepareMulticallContexts = (
  tokens: Token[],
  evmAddress: string
): Record<string, Call[]> => {
  const result: Record<string, Call[]> = {};

  // Process each token and group by chain name
  for (const token of tokens) {
    // Skip tokens that don't meet our criteria
    if (
      (token.coin_type !== "ERC20" && token.coin_type !== "ZRC20") ||
      !token.chain_name ||
      !token.contract
    ) {
      continue;
    }

    const chainName = token.chain_name;

    // Initialize array for this chain if it doesn't exist
    if (!result[chainName]) {
      result[chainName] = [];
    }

    // Create the call data for this token
    const callData = new ethers.Interface(
      token.coin_type === "ERC20" ? ERC20_ABI.abi : ZRC20.abi
    ).encodeFunctionData("balanceOf", [evmAddress]);

    // Add to the result
    result[chainName].push({
      callData,
      target: token.contract,
    });
  }

  return result;
};

/**
 * Gets EVM token balances using multicall
 */
export const getEvmTokenBalancesWithMulticall = async (
  chainName: string,
  rpc: string,
  multicallContexts: Call[],
  tokens: Token[]
): Promise<TokenBalance[]> => {
  const provider = new ethers.JsonRpcProvider(rpc);
  const multicallAddress = "0xca11bde05977b3631167028862be2a173976ca11";

  const multicallInterface = new ethers.Interface(MULTICALL3_ABI);
  const multicallContract: MulticallContract = new ethers.Contract(
    multicallAddress,
    multicallInterface,
    provider
  );

  try {
    if (!multicallContract.aggregate) {
      throw new Error("aggregate method not available on Multicall Contract");
    }

    const [, returnData] = await multicallContract.aggregate.staticCall(
      multicallContexts
    );

    // Transform returnData to balances using map instead of forEach/push
    const balances = returnData
      .map((data, index) => {
        const token = tokens.find(
          (t) =>
            t.chain_name === chainName &&
            (t.coin_type === "ERC20" || t.coin_type === "ZRC20") &&
            t.contract === multicallContexts[index].target
        );

        if (!token) return null;

        try {
          const abiCoder = AbiCoder.defaultAbiCoder();
          const [decoded] = abiCoder.decode(["uint256"], data);

          if (typeof decoded !== "bigint") {
            console.error("Invalid decoded value: expected bigint");
            return null;
          }

          const balance = BigInt(decoded);
          const formattedBalance = ethers.formatUnits(balance, token.decimals);

          return {
            ...token,
            balance: formattedBalance,
            id: parseTokenId(token.chain_id?.toString() || "", token.symbol),
          };
        } catch (error) {
          console.error(
            `Failed to decode data for token ${token.symbol}:`,
            error
          );
          return null;
        }
      })
      .filter((balance): balance is TokenBalance => balance !== null);

    return balances;
  } catch (error) {
    console.error(`Multicall failed for ${chainName}:`, error);
    return [];
  }
};

/**
 * Fallback to individual calls if multicall fails
 */
export const getEvmTokenBalancesFallback = async (
  chainName: string,
  rpc: string,
  tokens: Token[],
  evmAddress: string
): Promise<TokenBalance[]> => {
  const balances: TokenBalance[] = [];
  const provider = new ethers.JsonRpcProvider(rpc);

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
      const formattedBalance = ethers.formatUnits(balance, token.decimals);

      balances.push({
        ...token,
        balance: formattedBalance,
        id: parseTokenId(token.chain_id?.toString() || "", token.symbol),
      });
    } catch (err) {
      console.error(
        `Failed to get balance for ${token.symbol} on ${chainName}:`,
        err
      );
    }
  }

  return balances;
};

/**
 * Gets native EVM token balances
 */
export const getNativeEvmTokenBalances = async (
  tokens: Token[],
  evmAddress: string,
  getEndpoint: (type: string, chainName: string) => string,
  chains: Record<string, { chain_id: number }>
): Promise<TokenBalance[]> => {
  const balances: TokenBalance[] = [];
  const nonEvmChainNames = [
    "btc_testnet",
    "btc_mainnet",
    "solana_mainnet",
    "solana_testnet",
    "solana_devnet",
  ];

  const gasTokens = tokens.filter(
    (token) =>
      token.coin_type === "Gas" &&
      token.chain_name &&
      !nonEvmChainNames.includes(token.chain_name)
  );

  for (const token of gasTokens) {
    const chainLabel = Object.keys(chains).find((key) => {
      const parsedTokenChainId = parseInt((token.chain_id as string) || "");
      return chains[key].chain_id === parsedTokenChainId;
    });

    if (chainLabel) {
      try {
        const rpc = getEndpoint("evm", chainLabel);
        const provider = new ethers.JsonRpcProvider(rpc);
        const balance = await provider.getBalance(evmAddress);
        const formattedBalance = ethers.formatUnits(balance, token.decimals);

        balances.push({
          ...token,
          balance: formattedBalance,
          id: parseTokenId(token.chain_id?.toString() || "", token.symbol),
        });
      } catch (error) {
        console.error(`Failed to get native balance for ${chainLabel}:`, error);
      }
    }
  }

  return balances;
};

/**
 * Gets BTC balances
 */
export const getBtcBalances = async (
  tokens: Token[],
  btcAddress: string
): Promise<TokenBalance[]> => {
  const balances: TokenBalance[] = [];
  const btcChainNames = ["btc_testnet4", "btc_signet_testnet", "btc_mainnet"];

  const btcTokens = tokens.filter(
    (token) =>
      token.coin_type === "Gas" &&
      token.chain_name &&
      btcChainNames.includes(token.chain_name)
  );

  for (const token of btcTokens) {
    try {
      let network = "";
      if (token.chain_name === "btc_signet_testnet") {
        network = "/signet";
      } else if (token.chain_name === "btc_testnet4") {
        network = "/testnet4";
      }
      const API = `https://mempool.space${network}/api`;
      const utxos = (
        await axios.get<UTXO[]>(`${API}/address/${btcAddress}/utxo`)
      ).data;
      utxos.sort((a: UTXO, b: UTXO) => a.value - b.value);
      let inTotal = 0;
      const picks = [];
      for (const u of utxos) {
        inTotal += u.value;
        picks.push(u);
      }
      const balance = (inTotal / 100000000).toFixed(8);
      balances.push({
        ...token,
        balance,
        id: parseTokenId(token.chain_id?.toString() || "", token.symbol),
      });
    } catch (error) {
      console.error(
        `Failed to get BTC balance for ${token.chain_name}:`,
        error instanceof Error ? error.message : String(error)
      );
    }
  }

  return balances;
};

/**
 * Gets Solana native SOL balances
 */
export const getSolanaBalances = async (
  tokens: Token[],
  solanaAddress: string,
  getEndpoint: (type: string, chainName: string) => string
): Promise<TokenBalance[]> => {
  const solChainNames = ["solana_mainnet", "solana_testnet", "solana_devnet"];

  const solTokens = tokens.filter(
    (token) =>
      token.coin_type === "Gas" &&
      token.chain_name &&
      solChainNames.includes(token.chain_name)
  );

  // Use Promise.all with map for parallel processing
  const balanceResults = await Promise.all(
    solTokens.map(async (token) => {
      try {
        const API = getEndpoint("solana", token.chain_name || "");
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

        return {
          ...token,
          balance,
          id: parseTokenId(token.chain_id?.toString() || "", token.symbol),
        };
      } catch (error) {
        console.error(
          `Failed to get SOL balance for ${token.chain_name}:`,
          error
        );
        // Return null for failed requests
        return null;
      }
    })
  );

  // Filter out null values from failures
  return balanceResults.filter(
    (result): result is TokenBalance => result !== null
  );
};

/**
 * Gets Sui native SUI balances
 */
export const getSuiBalances = async (
  tokens: Token[],
  suiAddress: string
): Promise<TokenBalance[]> => {
  const suiChainNames = ["sui_mainnet", "sui_testnet"];

  const suiTokens = tokens.filter(
    (token) =>
      token.coin_type === "Gas" &&
      token.chain_name &&
      suiChainNames.includes(token.chain_name)
  );

  // Use Promise.all with map for parallel processing
  const balanceResults = await Promise.all(
    suiTokens.map(async (token) => {
      try {
        const network =
          (token.chain_name?.replace("sui_", "") as "mainnet" | "testnet") ||
          "testnet";
        const client = new SuiClient({ url: getFullnodeUrl(network) });

        const coins = await client.getCoins({
          owner: suiAddress,
          coinType: "0x2::sui::SUI",
        });

        let totalBalance = BigInt(0);
        for (const coin of coins.data) {
          totalBalance += BigInt(coin.balance);
        }

        // Convert from MIST (10^9) to SUI
        const balance = (Number(totalBalance) / 10 ** 9).toFixed(9);

        return {
          ...token,
          balance,
          id: parseTokenId(token.chain_id?.toString() || "", token.symbol),
        };
      } catch (error) {
        console.error(
          `Failed to get SUI balance for ${token.chain_name}:`,
          error
        );
        // Return null for failed requests
        return null;
      }
    })
  );

  // Filter out null values from failures
  return balanceResults.filter(
    (result): result is TokenBalance => result !== null
  );
};

/**
 * Gets SPL token balances
 */
export const getSplTokenBalances = async (
  tokens: Token[],
  solanaAddress: string,
  getEndpoint: (type: string, chainName: string) => string
): Promise<TokenBalance[]> => {
  const balances: TokenBalance[] = [];

  const splTokens = tokens.filter(
    (token) =>
      token.coin_type === "SPL" &&
      token.chain_name &&
      ["solana_mainnet", "solana_testnet", "solana_devnet"].includes(
        token.chain_name
      )
  );

  for (const token of splTokens) {
    try {
      const API = getEndpoint("solana", token.chain_name || "");
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
          id: parseTokenId(token.chain_id?.toString() || "", token.symbol),
        });
        continue;
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
          id: parseTokenId(token.chain_id?.toString() || "", token.symbol),
        });
      } else {
        balances.push({
          ...token,
          balance: "0",
          id: parseTokenId(token.chain_id?.toString() || "", token.symbol),
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
        id: parseTokenId(token.chain_id?.toString() || "", token.symbol),
      });
    }
  }

  return balances;
};

/**
 * Estimates the gas price for a transaction
 * @param provider - The ethers Provider to use for blockchain interactions
 * @returns The estimated gas price in wei
 */
const getGasPriceEstimate = async (provider: ethers.Provider) => {
  // Define constants for better readability
  const STANDARD_ETH_TRANSFER_GAS = BigInt(21000); // Standard gas units for basic ETH transfers
  const DEFAULT_GAS_PRICE_GWEI = BigInt(10); // 10 gwei fallback gas price
  const GWEI_TO_WEI_MULTIPLIER = BigInt(1_000_000_000); // 1 gwei = 10^9 wei

  const feeData = await provider.getFeeData();
  let gasPriceEstimate: bigint;

  // Handle different fee structures based on what's available
  if (feeData?.gasPrice !== null) {
    // Legacy gas price for pre-EIP-1559
    gasPriceEstimate = feeData.gasPrice;
  } else if (feeData?.maxFeePerGas !== null) {
    // EIP-1559 fee structure
    gasPriceEstimate = feeData.maxFeePerGas;
  } else {
    // Fallback if neither is available
    gasPriceEstimate = DEFAULT_GAS_PRICE_GWEI * GWEI_TO_WEI_MULTIPLIER;
  }

  const estimatedGasCost = STANDARD_ETH_TRANSFER_GAS * gasPriceEstimate;

  return estimatedGasCost;
};

/**
 * Checks if a wallet has sufficient balance for a transaction
 *
 * @param provider - The ethers Provider to use for blockchain interactions
 * @param signer - The wallet to check the balance for
 * @param amount - The amount to check against the balance as a string
 * @param erc20 - Optional ERC20 token address. If not provided, checks native token balance
 * @returns Object containing the current balance, token decimals, and whether there's enough balance
 */
export const hasSufficientBalanceEvm = async (
  provider: ethers.Provider,
  signer: ethers.Wallet,
  amount: string,
  erc20?: string
): Promise<{
  balance: bigint;
  decimals: number;
  hasEnoughBalance: boolean;
}> => {
  let balance: bigint;
  let decimals = 18;

  if (erc20) {
    const erc20Contract = new ethers.Contract(erc20, ERC20_ABI.abi, provider);

    balance = (await erc20Contract.balanceOf(signer.address)) as bigint;
    decimals = (await erc20Contract.decimals()) as number;
  } else {
    balance = await provider.getBalance(signer.address);

    // Keep some balance for gas costs when using native tokens
    try {
      const estimatedGasCost = await getGasPriceEstimate(provider);
      balance =
        balance > estimatedGasCost ? balance - estimatedGasCost : BigInt(0);
    } catch (error) {
      handleError({
        context: "Failed to estimate gas cost",
        error,
        shouldThrow: false,
      });
    }
  }

  const parsedAmount = ethers.parseUnits(amount, decimals);

  const hasEnoughBalance = balance >= parsedAmount;

  return { balance, decimals, hasEnoughBalance };
};
