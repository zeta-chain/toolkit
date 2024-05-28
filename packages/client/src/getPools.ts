import UniswapV2Factory from "@uniswap/v2-core/build/UniswapV2Factory.json";
import UniswapV2Pair from "@uniswap/v2-core/build/UniswapV2Pair.json";
import { getAddress, ParamChainName } from "@zetachain/protocol-contracts";
import SystemContract from "@zetachain/protocol-contracts/abi/zevm/SystemContract.sol/SystemContract.json";
import { ethers } from "ethers";

import { ZetaChainClient } from "./client";

export const getPools = async function (this: ZetaChainClient) {
  const rpc = this.getEndpoint("evm", `zeta_${this.network}`);
  const provider = new ethers.providers.StaticJsonRpcProvider(rpc);
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

  const foreignCoins = await this.getForeignCoins();
  const tokenAddresses = foreignCoins.map(
    (coin: any) => coin.zrc20_contract_address
  );
  tokenAddresses.push(zetaTokenAddress);

  const uniquePairs = tokenAddresses.reduce(
    (pairs: any, tokenA: string, i: any) => {
      tokenAddresses.slice(i + 1).forEach((tokenB: any) => {
        const pairKey = [tokenA, tokenB].sort().join("-");
        if (!pairs.some((p: any) => p.key === pairKey)) {
          pairs.push({ key: pairKey, tokenA, tokenB });
        }
      });
      return pairs;
    },
    []
  );

  const poolPromises = uniquePairs.map(async ({ tokenA, tokenB }: any) => {
    const pair = await systemContract.uniswapv2PairFor(
      uniswapV2FactoryAddress,
      tokenA,
      tokenB
    );

    if (pair === ethers.constants.AddressZero) return null;

    try {
      const pairContract = new ethers.Contract(
        pair,
        UniswapV2Pair.abi,
        provider
      );
      const [token0, token1] = await Promise.all([
        pairContract.token0(),
        pairContract.token1(),
      ]);
      const reserves = await pairContract.getReserves();

      return {
        pair,
        t0: { address: token0, reserve: reserves[0] },
        t1: { address: token1, reserve: reserves[1] },
      };
    } catch (error) {
      return null;
    }
  });

  let pools = (await Promise.all(poolPromises)).filter((pool) => pool !== null);

  const zrc20Details = foreignCoins.reduce((acc: any, coin: any) => {
    acc[coin.zrc20_contract_address.toLowerCase()] = {
      decimals: coin.decimals,
      symbol: coin.symbol,
    };
    return acc;
  }, {});

  pools = pools.map((t: any) => {
    const zeta = { decimals: 18, symbol: "WZETA" };
    const t0 = t.t0.address.toLowerCase();
    const t1 = t.t1.address.toLowerCase();
    const t0ZETA = t0 === zetaTokenAddress.toLowerCase() && zeta;
    const t1ZETA = t1 === zetaTokenAddress.toLowerCase() && zeta;
    return {
      ...t,
      t0: {
        ...t.t0,
        ...(zrc20Details[t0] || t0ZETA),
      },
      t1: {
        ...t.t1,
        ...(zrc20Details[t1] || t1ZETA),
      },
    };
  });

  return pools;
};
