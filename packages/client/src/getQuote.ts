import { parseUnits } from "@ethersproject/units";
import UniswapV2RouterABI from "@uniswap/v2-periphery/build/IUniswapV2Router02.json";
import { getAddress } from "@zetachain/protocol-contracts";
import ZRC20 from "@zetachain/protocol-contracts/abi/zevm/ZRC20.sol/ZRC20.json";
import { ethers } from "ethers";

import { ZetaChainClient } from "./client";

/**
 * Retrieves the ZRC20 contract address for a given ERC20 token.
 * @param {string} erc20 - The ERC20 token address.
 * @returns {Promise<string>} - The ZRC20 contract address.
 * @throws Will throw an error if the ERC-20 token is not supported.
 */
export const getZRC20FromERC20 = async function (
  this: ZetaChainClient,
  erc20: string
) {
  const foreignCoins = await this.getForeignCoins();
  const token = foreignCoins.find((t: any) => t.asset === erc20);
  if (!token) {
    throw new Error(`This ERC-20 token is not supported`);
  }
  return token?.zrc20_contract_address;
};

/**
 * Retrieves the ZRC20 contract address for the gas token of a given network.
 * @param {string} network - The network name.
 * @returns {Promise<string>} - The ZRC20 contract address for the gas token.
 */
export const getZRC20GasToken = async function (
  this: ZetaChainClient,
  network: string
) {
  const chainID = await this.getChainId(network)?.toString();
  const foreignCoins = await this.getForeignCoins();
  const token = foreignCoins.find((t: any) => {
    return t.foreign_chain_id === chainID && t.coin_type === "Gas";
  });
  return token?.zrc20_contract_address;
};

/**
 * Retrieves the ZETA token address.
 * @returns {string} - The ZETA token address.
 * @throws Will throw an error if the ZETA token address cannot be retrieved.
 */
const getZetaToken = () => {
  const zetaTokenAddress = getAddress("zetaToken", "zeta_testnet");
  if (!zetaTokenAddress) {
    throw new Error("Cannot get ZETA token address");
  }
  return zetaTokenAddress;
};

/**
 * Calculates the refund fee in the input ZRC20 token.
 * @param {string} inputZRC20 - The input ZRC20 token address.
 * @returns {Promise<Object>} - An object containing the refund fee amount and its decimals.
 */
export const getRefundFee = async function (
  this: ZetaChainClient,
  inputZRC20: string
) {
  const rpc = this.getEndpoint("evm", "zeta_testnet");
  const provider = new ethers.providers.JsonRpcProvider(rpc);
  const zetaToken = getZetaToken();

  const inputContract = new ethers.Contract(inputZRC20, ZRC20.abi, provider);
  const inputDecimals = await inputContract.decimals();
  const [withdrawZRC20, withdrawFee] = await inputContract.withdrawGasFee();
  const isGas = (await inputContract.COIN_TYPE()) === 1;
  if (isGas) {
    return { amount: withdrawFee, decimals: inputDecimals };
  } else {
    const refundFeeInZETA = await getAmounts(
      "in",
      provider,
      withdrawFee,
      zetaToken,
      withdrawZRC20
    );

    const withdrawFeeInInputToken = await getAmounts(
      "in",
      provider,
      refundFeeInZETA[0],
      inputZRC20,
      zetaToken
    );

    return { amount: withdrawFeeInInputToken[0], decimals: inputDecimals };
  }
};

/**
 * Calculates the withdraw fee in the input ZRC20 token for a given output ZRC20 token.
 * @param {string} inputZRC20 - The input ZRC20 token address.
 * @param {string} outputZRC20 - The output ZRC20 token address.
 * @returns {Promise<Object>} - An object containing the withdraw fee amount and its decimals.
 */
export const getWithdrawFeeInInputToken = async function (
  this: ZetaChainClient,
  inputZRC20: string,
  outputZRC20: string
) {
  const rpc = this.getEndpoint("evm", "zeta_testnet");
  const provider = new ethers.providers.JsonRpcProvider(rpc);
  const zetaToken = getZetaToken();

  const inputContract = new ethers.Contract(inputZRC20, ZRC20.abi, provider);
  const outputContract = new ethers.Contract(outputZRC20, ZRC20.abi, provider);

  const inputDecimals = await inputContract.decimals();
  const [gasZRC20, gasFee] = await outputContract.withdrawGasFee();

  const withdrawFeeInZETA = await getAmounts(
    "in",
    provider,
    gasFee,
    zetaToken,
    gasZRC20
  );

  const withdrawFeeInInputToken = await getAmounts(
    "in",
    provider,
    withdrawFeeInZETA[0],
    inputZRC20,
    zetaToken
  );

  return { amount: withdrawFeeInInputToken[0], decimals: inputDecimals };
};

/**
 * Retrieves a quote for swapping input ZRC20 token to output ZRC20 token.
 * @param {string} inputAmount - The amount of input ZRC20 token.
 * @param {string} inputZRC20 - The input ZRC20 token address.
 * @param {string} outputZRC20 - The output ZRC20 token address.
 * @returns {Promise<Object>} - An object containing the output amount and its decimals.
 */
export const getQuote = async function (
  this: ZetaChainClient,
  inputAmount: string,
  inputToken: string,
  outputToken: string
) {
  const rpc = this.getEndpoint("evm", "zeta_testnet");
  const provider = new ethers.providers.JsonRpcProvider(rpc);
  const zetaToken = getZetaToken();

  const inputContract = new ethers.Contract(inputToken, ZRC20.abi, provider);
  const outputContract = new ethers.Contract(outputToken, ZRC20.abi, provider);

  const inputDecimals = await inputContract.decimals();
  const amountIn = parseUnits(inputAmount, inputDecimals).toString();
  const outputDecimals = await outputContract.decimals();

  let out;

  if (inputToken === zetaToken || outputToken === zetaToken) {
    out = await getAmounts("out", provider, amountIn, inputToken, outputToken);
  } else {
    const outInZETA = await getAmounts(
      "out",
      provider,
      amountIn,
      inputToken,
      zetaToken
    );

    out = await getAmounts(
      "out",
      provider,
      outInZETA[1],
      zetaToken,
      outputToken
    );
  }

  return { amount: out[1], decimals: outputDecimals };
};

/**
 * Retrieves the amounts for swapping tokens using UniswapV2.
 * @param {"in" | "out"} direction - The direction of the swap ("in" or "out").
 * @param {any} provider - The ethers provider.
 * @param {any} amount - The amount to swap.
 * @param {string} tokenA - The address of token A.
 * @param {string} tokenB - The address of token B.
 * @returns {Promise<any>} - The amounts for the swap.
 * @throws Will throw an error if the UniswapV2 router address cannot be retrieved.
 */
const getAmounts = async (
  direction: "in" | "out",
  provider: any,
  amount: any,
  tokenA: string,
  tokenB: string
) => {
  const uniswapV2Router02 = getAddress("uniswapV2Router02", "zeta_testnet");
  if (!uniswapV2Router02) {
    throw new Error("Cannot get uniswapV2Router02 address");
  }

  const uniswapRouter = new ethers.Contract(
    uniswapV2Router02,
    UniswapV2RouterABI.abi,
    provider
  );

  const path = [tokenA, tokenB];

  const amounts =
    direction === "in"
      ? await uniswapRouter.getAmountsIn(amount, path)
      : await uniswapRouter.getAmountsOut(amount, path);
  return amounts;
};
