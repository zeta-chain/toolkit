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
  const provider = new ethers.providers.JsonRpcProvider(rpc);

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

  const poolPromises = data.foreignCoins.map(async (token: any) => {
    const zrc20Address = token.zrc20_contract_address.toLowerCase();
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
      const [r0, r1] = reserves;
      [reservesZRC20, reservesZETA] =
        zrc20Address < zetaTokenAddress ? [r0, r1] : [r1, r0];

      reservesZRC20 = ethers.utils.formatUnits(reservesZRC20, token.decimals);
      reservesZETA = ethers.utils.formatUnits(reservesZETA);
    }
    return { ...token, pair, reservesZETA, reservesZRC20 };
  });

  const pools = await Promise.all(poolPromises);
  return pools;
};
