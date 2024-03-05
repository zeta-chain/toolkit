import UniswapV2Factory from "@uniswap/v2-core/build/UniswapV2Factory.json";
import UniswapV2Pair from "@uniswap/v2-core/build/UniswapV2Pair.json";
import { getAddress, ParamChainName } from "@zetachain/protocol-contracts";
import { ethers } from "ethers";

import { ZetaChainClient } from "./client";

export const getPools = async function (this: ZetaChainClient) {
  const rpc = this.getEndpoint("evm", "zeta_testnet");
  const provider = new ethers.providers.StaticJsonRpcProvider(rpc);

  const uniswapV2FactoryAddress = getAddress(
    "uniswapV2Factory",
    `zeta_${this.network}` as ParamChainName
  );

  if (!uniswapV2FactoryAddress) {
    throw new Error("uniswapV2Factory is not defined");
  }

  const UniswapV2FactoryContract = new ethers.Contract(
    uniswapV2FactoryAddress,
    UniswapV2Factory.abi,
    provider
  );

  const totalPairs = await UniswapV2FactoryContract.allPairsLength();
  let pairs = [];
  for (let i = 0; i < totalPairs; i++) {
    pairs.push(await UniswapV2FactoryContract.allPairs(i));
  }

  const poolPromises = pairs.map(async (pair: any) => {
    let pool = {
      pair,
      t0: {},
      t1: {},
    } as any;
    const pairContract = new ethers.Contract(pair, UniswapV2Pair.abi, provider);

    pool.t0.address = await pairContract.token0();
    pool.t1.address = await pairContract.token1();

    const reserves = await pairContract.getReserves();
    pool.t0.reserve = reserves[0];
    pool.t1.reserve = reserves[1];

    return pool;
  });

  const pools = await Promise.all(poolPromises);
  return pools;
};
