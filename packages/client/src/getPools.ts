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

  const poolPromises = [];

  for (let i = 0; i < tokenAddresses.length; i++) {
    for (let j = i + 1; j < tokenAddresses.length; j++) {
      const tokenA = tokenAddresses[i];
      const tokenB = tokenAddresses[j];

      const poolPromise = (async () => {
        const pair = await systemContract.uniswapv2PairFor(
          uniswapV2FactoryAddress,
          tokenA,
          tokenB
        );

        if (pair === ethers.constants.AddressZero) {
          return null;
        }

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
      })();

      poolPromises.push(poolPromise);
    }
  }

  const pools = (await Promise.all(poolPromises)).filter(
    (pool) => pool !== null
  );

  return pools;
};
