import { Pool } from "../../../types/pools.types";
import {
  findValidPairContracts,
  formatPoolsWithTokenDetails,
  generateUniquePairs,
  getPoolData,
  getTokenAddresses,
  initializeProviderAndContracts,
} from "../../../utils/uniswap";
import { ZetaChainClient } from "./client";

export const getPools = async function (
  this: ZetaChainClient
): Promise<Pool[]> {
  // Step 1: Initialize provider and contracts
  const { provider, systemContract, addresses } =
    initializeProviderAndContracts.call(this);

  // Step 2: Get token addresses including ZETA and ZRC20s
  const tokenAddresses = await getTokenAddresses.call(
    this,
    addresses.zetaTokenAddress
  );

  // Step 3: Generate unique token pairs
  const uniquePairs = generateUniquePairs(tokenAddresses);

  // Step 4: Find valid pair contracts
  const validPairs = await findValidPairContracts(
    provider,
    systemContract,
    uniquePairs,
    addresses.systemContractAddress,
    addresses.uniswapV2FactoryAddress
  );

  // Step 5: Get pool data for valid pairs
  const pools = await getPoolData(provider, validPairs);

  // Step 6: Format pools with token details
  const foreignCoins = await this.getForeignCoins();
  return await formatPoolsWithTokenDetails(
    pools,
    foreignCoins,
    addresses.zetaTokenAddress,
    provider
  );
};
