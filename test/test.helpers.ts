import { MaxUint256 } from "@ethersproject/constants";
import { parseEther, parseUnits } from "@ethersproject/units";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { ethers } from "hardhat";

import {
  MockZRC20,
  MockZRC20__factory,
  SystemContract,
  SystemContract__factory,
  TestUniswapRouter,
  TestUniswapRouter__factory,
  UniswapV2Factory,
  UniswapV2Factory__factory,
  WZETA,
  WZETA__factory,
} from "../typechain-types";

export const deployWZETA = async (): Promise<WZETA> => {
  const WZETAFactory = (await ethers.getContractFactory(
    "WZETA"
  )) as WZETA__factory;
  const wZETAContract = await WZETAFactory.deploy();
  await wZETAContract.waitForDeployment();
  await wZETAContract.deposit({ value: parseEther("10") });
  return wZETAContract;
};

interface UniswapDeployResult {
  uniswapFactory: UniswapV2Factory;
  uniswapRouter: TestUniswapRouter;
}

export const deployUniswap = async (
  signer: SignerWithAddress,
  wZETA: string
): Promise<UniswapDeployResult> => {
  const UniswapV2Factory = (await ethers.getContractFactory(
    "UniswapV2Factory"
  )) as UniswapV2Factory__factory;
  const uniswapFactory = await UniswapV2Factory.deploy(signer.address);
  await uniswapFactory.waitForDeployment();

  const UniswapRouter = (await ethers.getContractFactory(
    "TestUniswapRouter"
  )) as TestUniswapRouter__factory;
  const uniswapRouter = await UniswapRouter.deploy(
    uniswapFactory.target,
    wZETA
  );
  await uniswapRouter.waitForDeployment();

  return { uniswapFactory, uniswapRouter };
};

const addZetaEthLiquidity = async (
  signer: SignerWithAddress,
  token: MockZRC20,
  uniswapRouterAddr: string
) => {
  const block = await ethers.provider.getBlock("latest");

  const tx1 = await token.approve(uniswapRouterAddr, MaxUint256);
  await tx1.wait();

  const uniswapRouterFork = TestUniswapRouter__factory.connect(
    uniswapRouterAddr,
    signer
  );

  const tx2 = await uniswapRouterFork.addLiquidityETH(
    token.target,
    parseUnits("2000"),
    0,
    0,
    signer.address,
    BigNumber.from(block.timestamp + 360),
    {
      gasLimit: 10_000_000,
      value: parseUnits("1000"),
    }
  );
  await tx2.wait();
};

interface EvmSetupResult {
  ZRC20Contracts: MockZRC20[];
  systemContract: SystemContract;
}

export const evmSetup = async (
  gasTokenAddr: string,
  uniswapFactoryAddr: string,
  uniswapRouterAddr: string
): Promise<EvmSetupResult> => {
  const [signer] = await ethers.getSigners();

  const ZRC20Factory = (await ethers.getContractFactory(
    "MockZRC20"
  )) as MockZRC20__factory;

  const token1Contract = await ZRC20Factory.deploy(
    parseUnits("1000000"),
    "tBNB",
    "tBNB"
  );
  const token2Contract = await ZRC20Factory.deploy(
    parseUnits("1000000"),
    "gETH",
    "gETH"
  );
  const token3Contract = await ZRC20Factory.deploy(
    parseUnits("1000000"),
    "tMATIC",
    "tMATIC"
  );
  const token4Contract = await ZRC20Factory.deploy(
    parseUnits("1000000"),
    "USDC",
    "USDC"
  );
  const token5Contract = await ZRC20Factory.deploy(
    parseUnits("1000000"),
    "tBTC",
    "tBTC"
  );

  const ZRC20Contracts = [
    token1Contract,
    token2Contract,
    token3Contract,
    token4Contract,
    token5Contract,
  ];

  const SystemContractFactory = (await ethers.getContractFactory(
    "MockSystemContract"
  )) as SystemContract__factory;

  const systemContract = await SystemContractFactory.deploy(
    gasTokenAddr,
    uniswapFactoryAddr,
    uniswapRouterAddr
  );

  await systemContract.setGasCoinZRC20(97, ZRC20Contracts[0].target);
  await systemContract.setGasCoinZRC20(5, ZRC20Contracts[1].target);
  await systemContract.setGasCoinZRC20(80001, ZRC20Contracts[2].target);
  await systemContract.setGasCoinZRC20(18332, ZRC20Contracts[4].target);

  await ZRC20Contracts[0].setGasFeeAddress(ZRC20Contracts[0].target);
  await ZRC20Contracts[0].setGasFee(parseEther("0.01"));

  await ZRC20Contracts[1].setGasFeeAddress(ZRC20Contracts[1].target);
  await ZRC20Contracts[1].setGasFee(parseEther("0.01"));

  await ZRC20Contracts[2].setGasFeeAddress(ZRC20Contracts[2].target);
  await ZRC20Contracts[2].setGasFee(parseEther("0.01"));

  await ZRC20Contracts[3].setGasFeeAddress(ZRC20Contracts[1].target);
  await ZRC20Contracts[3].setGasFee(parseEther("0.01"));

  await ZRC20Contracts[4].setGasFeeAddress(ZRC20Contracts[4].target);
  await ZRC20Contracts[4].setGasFee(parseEther("0.01"));

  await addZetaEthLiquidity(signer, ZRC20Contracts[0], uniswapRouterAddr);
  await addZetaEthLiquidity(signer, ZRC20Contracts[1], uniswapRouterAddr);
  await addZetaEthLiquidity(signer, ZRC20Contracts[2], uniswapRouterAddr);
  await addZetaEthLiquidity(signer, ZRC20Contracts[3], uniswapRouterAddr);
  await addZetaEthLiquidity(signer, ZRC20Contracts[4], uniswapRouterAddr);

  return { ZRC20Contracts, systemContract };
};
