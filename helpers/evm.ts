import { MaxUint256 } from "@ethersproject/constants";
import { parseUnits } from "@ethersproject/units";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { ethers } from "hardhat";

import {
  TestSystemContract,
  TestSystemContract__factory,
  TestZRC20,
  TestZRC20__factory,
  UniswapV2Router02__factory,
} from "../typechain-types";

interface EvmSetupResult {
  ZRC20Contracts: TestZRC20[];
  systemContract: TestSystemContract;
}

export const prepareData = (contract: string, types: string[], args: any[]) => {
  const params = prepareParams(types, args);
  return `${contract}${params.slice(2)}`;
};

export const prepareParams = (types: string[], args: any[]) => {
  const abiCoder = ethers.utils.defaultAbiCoder;
  for (let i = 0; i < args.length; i++) {
    if (types[i] === "bytes32" && typeof args[i] === "string") {
      args[i] = ethers.utils.hexlify(ethers.utils.zeroPad(args[i], 32));
    }
  }
  return abiCoder.encode(types, args);
};

export const addZetaEthLiquidity = async (
  signer: SignerWithAddress,
  token: TestZRC20,
  uniswapRouterAddr: string
) => {
  const block = await ethers.provider.getBlock("latest");

  const tx1 = await token.approve(uniswapRouterAddr, MaxUint256);
  await tx1.wait();

  const uniswapRouterFork = UniswapV2Router02__factory.connect(
    uniswapRouterAddr,
    signer
  );

  const tx2 = await uniswapRouterFork.addLiquidityETH(
    token.address,
    parseUnits("1000"),
    0,
    0,
    signer.address,
    block.timestamp + 360,
    { value: parseUnits("1000") }
  );
  await tx2.wait();
};

export const evmSetup = async (
  wGasToken: string,
  uniswapFactoryAddr: string,
  uniswapRouterAddr: string
): Promise<EvmSetupResult> => {
  const [signer] = await ethers.getSigners();

  const ZRC20Factory = (await ethers.getContractFactory(
    "TestZRC20"
  )) as TestZRC20__factory;

  const token1Contract = (await ZRC20Factory.deploy(
    parseUnits("1000000"),
    "tBNB",
    "tBNB"
  )) as TestZRC20;
  const token2Contract = (await ZRC20Factory.deploy(
    parseUnits("1000000"),
    "gETH",
    "gETH"
  )) as TestZRC20;
  const token3Contract = (await ZRC20Factory.deploy(
    parseUnits("1000000"),
    "tMATIC",
    "tMATIC"
  )) as TestZRC20;

  const ZRC20Contracts = [token1Contract, token2Contract, token3Contract];

  const SystemContractFactory = (await ethers.getContractFactory(
    "TestSystemContract"
  )) as TestSystemContract__factory;

  const systemContract = (await SystemContractFactory.deploy(
    wGasToken,
    uniswapFactoryAddr,
    uniswapRouterAddr
  )) as TestSystemContract;

  await systemContract.setGasCoinZRC20(97, ZRC20Contracts[0].address);
  await systemContract.setGasCoinZRC20(5, ZRC20Contracts[1].address);
  await systemContract.setGasCoinZRC20(80001, ZRC20Contracts[2].address);

  await addZetaEthLiquidity(signer, ZRC20Contracts[0], uniswapRouterAddr);
  await addZetaEthLiquidity(signer, ZRC20Contracts[1], uniswapRouterAddr);
  await addZetaEthLiquidity(signer, ZRC20Contracts[2], uniswapRouterAddr);

  return { ZRC20Contracts, systemContract };
};
