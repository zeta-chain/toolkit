import UniswapV2Factory from "@uniswap/v2-core/build/UniswapV2Factory.json";
import UniswapV2Pair from "@uniswap/v2-core/build/UniswapV2Pair.json";
import { getAddress } from "@zetachain/protocol-contracts";
import { ethers } from "ethers";
import { getEndpoints } from "@zetachain/networks/dist/src/getEndpoints";
import fetch from "isomorphic-fetch";

export const getPools = async () => {
  const api = getEndpoints("cosmos-http", "zeta_testnet")[0]?.url;
  const endpoint = `${api}/zeta-chain/zetacore/fungible/foreign_coins`;
  const response = await fetch(endpoint);
  const data = await response.json();

  const rpc = getEndpoints("evm", "zeta_testnet")[0]?.url;
  const provider = new ethers.providers.JsonRpcProvider(rpc);

  const uniswapV2FactoryAddress = getAddress(
    "uniswapv2Factory",
    "zeta_testnet"
  );
  const zetaTokenAddress = getAddress("zetaToken", "zeta_testnet");

  const UniswapV2FactoryContract = new ethers.Contract(
    uniswapV2FactoryAddress,
    UniswapV2Factory.abi,
    provider
  );

  const poolPromises = data.foreignCoins.map(async (token: any) => {
    const zrc20Address = token.zrc20_contract_address;
    const pair = await UniswapV2FactoryContract.getPair(
      zrc20Address,
      zetaTokenAddress
    );

    let reservesZRC20 = "0";
    let reservesZETA = "0";

    if (pair !== ethers.constants.AddressZero) {
      const uniswapPairContract = new ethers.Contract(
        pair,
        UniswapV2Pair.abi,
        provider
      );
      const reserves = await uniswapPairContract.getReserves();
      reservesZRC20 = ethers.utils.formatEther(reserves[0]);
      reservesZETA = ethers.utils.formatEther(reserves[1]);
    }
    return { ...token, reservesZRC20, reservesZETA };
  });

  const pools = await Promise.all(poolPromises);
  return pools;
};
