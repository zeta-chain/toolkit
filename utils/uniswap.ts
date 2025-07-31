import UniswapV2Pair from "@uniswap/v2-core/build/UniswapV2Pair.json";
import { getAddress, ParamChainName } from "@zetachain/protocol-contracts";
import SystemContract from "@zetachain/protocol-contracts/abi/SystemContract.sol/SystemContract.json";
import { ethers } from "ethers";

import { ZetaChainClient } from "../packages/client/src/client";
import { MULTICALL_ADDRESS } from "../src/constants/addresses";
import { MulticallContract } from "../types/balances.types";
import { ForeignCoin } from "../types/foreignCoins.types";
import { Pair, Pool, Reserves, Zrc20Details } from "../types/pools.types";
import MULTICALL3_ABI from "./multicall3.json";

/**
 * Initialize provider and contracts for Uniswap interaction
 */
export const initializeProviderAndContracts = function (this: ZetaChainClient) {
  const rpc = this.getEndpoint("evm", `zeta_${this.network}`);
  const provider = new ethers.JsonRpcProvider(rpc);
  const zetaNetwork = `zeta_${this.network}` as ParamChainName;

  const uniswapV2FactoryAddress = getAddress("uniswapV2Factory", zetaNetwork);
  if (!uniswapV2FactoryAddress) {
    throw new Error("uniswapV2Factory is not defined");
  }

  const systemContractAddress = getAddress("systemContract", zetaNetwork);
  if (!systemContractAddress) {
    throw new Error("System contract is not defined");
  }

  const systemContract = new ethers.Contract(
    systemContractAddress,
    SystemContract.abi,
    provider
  );

  const zetaTokenAddress = getAddress("zetaToken", zetaNetwork);
  if (!zetaTokenAddress) {
    throw new Error("ZETA token address is not defined");
  }

  return {
    addresses: {
      systemContractAddress,
      uniswapV2FactoryAddress,
      zetaTokenAddress,
    },
    provider,
    systemContract,
  };
};

/**
 * Get ZRC20 token addresses plus ZETA token address
 */
export const getTokenAddresses = async function (
  this: ZetaChainClient,
  zetaTokenAddress: string
): Promise<string[]> {
  const foreignCoins = await this.getForeignCoins();
  const zrc20Addresses = foreignCoins.map(
    (coin) => coin.zrc20_contract_address
  );
  return [...zrc20Addresses, zetaTokenAddress];
};

/**
 * Creates unique token pairs from a list of token addresses
 */
export const generateUniquePairs = (tokenAddresses: string[]): Pair[] => {
  const uniquePairs: Pair[] = [];

  for (let i = 0; i < tokenAddresses.length; i++) {
    const tokenA = tokenAddresses[i];
    for (let j = i + 1; j < tokenAddresses.length; j++) {
      const tokenB = tokenAddresses[j];
      const pairKey = [tokenA, tokenB].sort().join("-");
      if (!uniquePairs.some((p) => p.key === pairKey)) {
        uniquePairs.push({ key: pairKey, tokenA, tokenB });
      }
    }
  }

  return uniquePairs;
};

/**
 * Create a multicall contract instance
 */
const createMulticallContract = (
  provider: ethers.JsonRpcProvider
): MulticallContract => {
  const multicallContract = new ethers.Contract(
    MULTICALL_ADDRESS,
    MULTICALL3_ABI,
    provider
  ) as MulticallContract;

  if (!multicallContract.aggregate) {
    throw new Error("aggregate method not available on Multicall Contract");
  }

  return multicallContract;
};

/**
 * Find valid UniswapV2 pair contracts for token pairs
 */
export const findValidPairContracts = async (
  provider: ethers.JsonRpcProvider,
  systemContract: ethers.Contract,
  uniquePairs: Pair[],
  systemContractAddress: string,
  uniswapV2FactoryAddress: string
): Promise<string[]> => {
  const multicallContract = createMulticallContract(provider);

  const calls = uniquePairs.map(({ tokenA, tokenB }) => ({
    callData: systemContract.interface.encodeFunctionData("uniswapv2PairFor", [
      uniswapV2FactoryAddress,
      tokenA,
      tokenB,
    ]),
    target: systemContractAddress,
  }));

  if (!multicallContract.aggregate) {
    throw new Error("aggregate method not available on Multicall Contract");
  }

  const [, returnData] = await multicallContract.aggregate.staticCall(calls);

  return returnData
    .map((data: string) => {
      try {
        const pair = systemContract.interface.decodeFunctionResult(
          "uniswapv2PairFor",
          data
        )[0] as string;
        return pair !== ethers.ZeroAddress ? pair : null;
      } catch (error) {
        return null;
      }
    })
    .filter((pair: string | null): pair is string => pair !== null);
};

/**
 * Get pool data (token0, token1, reserves) for valid pairs
 */
export const getPoolData = async (
  provider: ethers.JsonRpcProvider,
  validPairs: string[]
): Promise<Pool[]> => {
  const multicallContract = createMulticallContract(provider);
  const uniswapInterface = new ethers.Interface(UniswapV2Pair.abi);

  // Create calls for each pair to get token0, token1, and reserves
  const pairCalls = validPairs
    .map((pair: string) => [
      {
        callData: uniswapInterface.encodeFunctionData("token0"),
        target: pair,
      },
      {
        callData: uniswapInterface.encodeFunctionData("token1"),
        target: pair,
      },
      {
        callData: uniswapInterface.encodeFunctionData("getReserves"),
        target: pair,
      },
    ])
    .flat();

  if (!multicallContract.aggregate) {
    throw new Error("aggregate method not available on Multicall Contract");
  }

  const [, pairReturnData] = await multicallContract.aggregate.staticCall(
    pairCalls
  );

  const pools: Pool[] = [];

  for (let i = 0; i < pairReturnData.length; i += 3) {
    const pairIndex = Math.floor(i / 3);
    const pair = validPairs[pairIndex];

    if (
      !pairReturnData[i] ||
      !pairReturnData[i + 1] ||
      !pairReturnData[i + 2]
    ) {
      console.warn(`Missing data for pair ${pair}`);
      continue;
    }

    try {
      const token0 = uniswapInterface.decodeFunctionResult(
        "token0",
        pairReturnData[i]
      )[0] as string;

      const token1 = uniswapInterface.decodeFunctionResult(
        "token1",
        pairReturnData[i + 1]
      )[0] as string;

      const decodedReserves = uniswapInterface.decodeFunctionResult(
        "getReserves",
        pairReturnData[i + 2]
      );

      const reserves: Reserves = {
        _blockTimestampLast: decodedReserves[2] as number,
        _reserve0: decodedReserves[0] as bigint,
        _reserve1: decodedReserves[1] as bigint,
      };

      pools.push({
        pair,
        t0: { address: token0, reserve: reserves._reserve0 },
        t1: { address: token1, reserve: reserves._reserve1 },
      });
    } catch (error) {
      /**
       * @todo (Hernan): We could add a log here to track these errors
       */
      continue;
    }
  }

  return pools;
};

/**
 * Fetch missing token details from contracts
 */
const fetchMissingTokenDetails = async (
  provider: ethers.JsonRpcProvider,
  pools: Pool[]
): Promise<Pool[]> => {
  const IERC20 = [
    "function symbol() view returns (string)",
    "function decimals() view returns (uint8)",
  ];

  const poolsWithDetails = await Promise.all(
    pools.map(async (pool) => {
      const t0NeedsDetails = !pool.t0.symbol || pool.t0.decimals === undefined;
      const t1NeedsDetails = !pool.t1.symbol || pool.t1.decimals === undefined;

      if (!t0NeedsDetails && !t1NeedsDetails) {
        return pool;
      }

      const fetchDetails = async (address: string) => {
        try {
          const contract = new ethers.Contract(address, IERC20, provider);
          const [symbol, decimals] = await Promise.all([
            contract.symbol() as Promise<string>,
            contract.decimals() as Promise<number>,
          ]);
          return { decimals: Number(decimals), symbol };
        } catch (error) {
          console.warn(`Failed to fetch details for token ${address}:`, error);
          return { decimals: 18, symbol: "UNKNOWN" };
        }
      };

      const [t0Details, t1Details] = await Promise.all([
        t0NeedsDetails ? fetchDetails(pool.t0.address) : Promise.resolve({}),
        t1NeedsDetails ? fetchDetails(pool.t1.address) : Promise.resolve({}),
      ]);

      return {
        ...pool,
        t0: { ...pool.t0, ...t0Details },
        t1: { ...pool.t1, ...t1Details },
      };
    })
  );

  return poolsWithDetails;
};

/**
 * Format pools with token details (symbols and decimals)
 */
export const formatPoolsWithTokenDetails = async (
  pools: Pool[],
  foreignCoins: ForeignCoin[],
  zetaTokenAddress: string,
  provider: ethers.JsonRpcProvider
): Promise<Pool[]> => {
  // Create a mapping of ZRC20 details for quick lookup
  const zrc20Details = foreignCoins.reduce((acc: Zrc20Details, coin) => {
    const address = coin.zrc20_contract_address.toLowerCase();
    acc[address] = {
      decimals: coin.decimals,
      symbol: coin.symbol,
    };
    return acc;
  }, {} as Zrc20Details);

  const zetaAddressLower = zetaTokenAddress.toLowerCase();

  const poolsWithBasicDetails = pools.map((pool) => {
    const t0AddressLower = pool.t0.address.toLowerCase();
    const t1AddressLower = pool.t1.address.toLowerCase();

    // Get token details from the ZRC20 details mapping
    const t0Details = zrc20Details[t0AddressLower];
    const t1Details = zrc20Details[t1AddressLower];

    return {
      ...pool,
      t0: {
        ...pool.t0,
        ...t0Details,
      },
      t1: {
        ...pool.t1,
        ...t1Details,
      },
    };
  });

  // Fetch missing details from contracts for any tokens not found in foreignCoins
  const poolsWithCompleteDetails = await fetchMissingTokenDetails(
    provider,
    poolsWithBasicDetails
  );
  return poolsWithCompleteDetails;
};
