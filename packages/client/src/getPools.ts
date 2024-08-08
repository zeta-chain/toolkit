import UniswapV2Factory from "@uniswap/v2-core/build/UniswapV2Factory.json";
import UniswapV2Pair from "@uniswap/v2-core/build/UniswapV2Pair.json";
import { getAddress, ParamChainName } from "@zetachain/protocol-contracts";
import SystemContract from "@zetachain/protocol-contracts/abi/zevm/SystemContract.sol/SystemContract.json";
import { ethers } from "ethers";

import { ZetaChainClient } from "./client";
import MULTICALL3_ABI from "./multicall3.json";

type Pair = {
  key: string;
  tokenA: string;
  tokenB: string;
};

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

  const uniquePairs: Pair[] = tokenAddresses.reduce(
    (pairs: Pair[], tokenA: string, i: number) => {
      tokenAddresses.slice(i + 1).forEach((tokenB: string) => {
        const pairKey = [tokenA, tokenB].sort().join("-");
        if (!pairs.some((p: Pair) => p.key === pairKey)) {
          pairs.push({ key: pairKey, tokenA, tokenB });
        }
      });
      return pairs;
    },
    []
  );

  const multicallAddress = "0xca11bde05977b3631167028862be2a173976ca11";
  const multicallContract = new ethers.Contract(
    multicallAddress,
    MULTICALL3_ABI,
    provider
  );

  const calls = uniquePairs.map(({ tokenA, tokenB }) => ({
    callData: systemContract.interface.encodeFunctionData("uniswapv2PairFor", [
      uniswapV2FactoryAddress,
      tokenA,
      tokenB,
    ]),
    target: systemContractAddress,
  }));

  const { returnData } = await multicallContract.callStatic.aggregate(calls);

  const validPairs = returnData
    .map((data: any, index: number) => {
      try {
        const pair = systemContract.interface.decodeFunctionResult(
          "uniswapv2PairFor",
          data
        )[0];
        return pair !== ethers.constants.AddressZero ? pair : null;
      } catch {
        return null;
      }
    })
    .filter((pair: string | null) => pair !== null);

  const pairCalls = validPairs
    .map((pair: string) => [
      {
        callData: new ethers.utils.Interface(
          UniswapV2Pair.abi
        ).encodeFunctionData("token0"),
        target: pair,
      },
      {
        callData: new ethers.utils.Interface(
          UniswapV2Pair.abi
        ).encodeFunctionData("token1"),
        target: pair,
      },
      {
        callData: new ethers.utils.Interface(
          UniswapV2Pair.abi
        ).encodeFunctionData("getReserves"),
        target: pair,
      },
    ])
    .flat();

  const pairReturnData = await multicallContract.callStatic.aggregate(
    pairCalls
  );

  const pools = [];
  const uniswapInterface = new ethers.utils.Interface(UniswapV2Pair.abi);

  for (let i = 0; i < pairReturnData.returnData.length; i += 3) {
    const pairIndex = Math.floor(i / 3);
    const pair = validPairs[pairIndex];

    if (
      !pairReturnData.returnData[i] ||
      !pairReturnData.returnData[i + 1] ||
      !pairReturnData.returnData[i + 2]
    ) {
      console.warn(`Missing data for pair ${pair} at index ${i}`);
      continue;
    }

    const token0Data = pairReturnData.returnData[i];
    const token1Data = pairReturnData.returnData[i + 1];
    const reservesData = pairReturnData.returnData[i + 2];

    // Check if data can be decoded
    let token0, token1, reserves;
    try {
      token0 = uniswapInterface.decodeFunctionResult("token0", token0Data)[0];
      token1 = uniswapInterface.decodeFunctionResult("token1", token1Data)[0];
      reserves = uniswapInterface.decodeFunctionResult(
        "getReserves",
        reservesData
      );
    } catch {
      continue;
    }
    pools.push({
      pair,
      t0: { address: token0, reserve: reserves._reserve0 },
      t1: { address: token1, reserve: reserves._reserve1 },
    });
  }

  const zrc20Details = foreignCoins.reduce((acc: any, coin: any) => {
    acc[coin.zrc20_contract_address.toLowerCase()] = {
      decimals: coin.decimals,
      symbol: coin.symbol,
    };
    return acc;
  }, {});

  const formattedPools = pools.map((t: any) => {
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

  return formattedPools;
};
