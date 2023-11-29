import UniswapV2Factory from "@uniswap/v2-core/build/UniswapV2Factory.json";
import UniswapV2Pair from "@uniswap/v2-core/build/UniswapV2Pair.json";
import { getEndpoints } from "@zetachain/networks/dist/src/getEndpoints";
import { getAddress } from "@zetachain/protocol-contracts";
import { ethers } from "ethers";
import fetch from "isomorphic-fetch";

export const getPools = async () => {
  const api = getEndpoints("cosmos-http", "zeta_testnet")[0]?.url;
  const endpoint = `${api}/zeta-chain/zetacore/fungible/foreign_coins`;
  const response = await fetch(endpoint);
  const data = await response.json();

  const rpc = getEndpoints("evm", "zeta_testnet")[0]?.url;
  const provider = new ethers.providers.StaticJsonRpcProvider(rpc);

  const uniswapV2FactoryAddress = getAddress(
    "uniswapv2Factory",
    "zeta_testnet"
  );

  const zetaTokenAddress = getAddress(
    "zetaToken",
    "zeta_testnet"
  ).toLowerCase();

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
      t0: {},
      t1: {},
      pair,
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
