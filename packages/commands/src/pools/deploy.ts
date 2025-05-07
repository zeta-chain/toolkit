import * as UniswapV3Factory from "@uniswap/v3-core/artifacts/contracts/UniswapV3Factory.sol/UniswapV3Factory.json";
import * as NonfungiblePositionManager from "@uniswap/v3-periphery/artifacts/contracts/NonfungiblePositionManager.sol/NonfungiblePositionManager.json";
import * as SwapRouter from "@uniswap/v3-periphery/artifacts/contracts/SwapRouter.sol/SwapRouter.json";
import { Command } from "commander";
import { ContractFactory, ethers, JsonRpcProvider, Wallet } from "ethers";

import {
  DeploymentError,
  type DeployOptions,
  deployOptionsSchema,
} from "../../../../types/pools";
import { DEFAULT_RPC, DEFAULT_WZETA } from "./constants";

const deployOpts = {
  gasLimit: 8000000,
};

const estimateGas = async (
  contractFactory: ContractFactory,
  args: unknown[] = []
): Promise<bigint | null> => {
  try {
    const deployment = await contractFactory.getDeployTransaction(...args);
    const gasEstimate = await contractFactory.runner?.provider?.estimateGas(
      deployment
    );
    console.log("Estimated gas:", gasEstimate?.toString());
    return gasEstimate ?? null;
  } catch (error) {
    console.error("Gas estimation failed:", error);
    return null;
  }
};

const main = async (options: DeployOptions): Promise<void> => {
  try {
    // Validate options
    const validatedOptions = deployOptionsSchema.parse(options);

    // Initialize provider and signer
    const provider = new JsonRpcProvider(validatedOptions.rpc);
    const signer = new Wallet(validatedOptions.privateKey, provider);

    console.log("Deploying Uniswap V3 contracts...");
    console.log("Deployer address:", await signer.getAddress());
    console.log("Network:", (await provider.getNetwork()).name);
    console.log(
      "Balance:",
      ethers.formatEther(await provider.getBalance(await signer.getAddress())),
      "ZETA"
    );

    // Deploy Uniswap V3 Factory
    console.log("\nDeploying Uniswap V3 Factory...");
    const uniswapV3Factory = new ContractFactory(
      UniswapV3Factory.abi,
      UniswapV3Factory.bytecode,
      signer
    );

    // Estimate gas for factory deployment
    const factoryGasEstimate = await estimateGas(uniswapV3Factory);
    if (factoryGasEstimate) {
      deployOpts.gasLimit = Number(factoryGasEstimate * 2n);
    }

    console.log("Using gas limit:", deployOpts.gasLimit.toString());

    const uniswapV3FactoryInstance = await uniswapV3Factory.deploy(deployOpts);
    console.log(
      "Factory deployment transaction hash:",
      uniswapV3FactoryInstance.deploymentTransaction()?.hash
    );

    await uniswapV3FactoryInstance.waitForDeployment();
    console.log(
      "Uniswap V3 Factory deployed at:",
      await uniswapV3FactoryInstance.getAddress()
    );

    // Deploy Swap Router
    console.log("\nDeploying Swap Router...");
    const swapRouter = new ContractFactory(
      SwapRouter.abi,
      SwapRouter.bytecode,
      signer
    );

    // Estimate gas for router deployment
    const routerGasEstimate = await estimateGas(swapRouter, [
      await uniswapV3FactoryInstance.getAddress(),
      validatedOptions.wzeta,
    ]);
    if (routerGasEstimate) {
      deployOpts.gasLimit = Number(routerGasEstimate * 2n);
    }

    console.log("Using gas limit:", deployOpts.gasLimit.toString());

    const swapRouterInstance = await swapRouter.deploy(
      await uniswapV3FactoryInstance.getAddress(),
      validatedOptions.wzeta,
      deployOpts
    );
    console.log(
      "Router deployment transaction hash:",
      swapRouterInstance.deploymentTransaction()?.hash
    );

    await swapRouterInstance.waitForDeployment();
    console.log(
      "Swap Router deployed at:",
      await swapRouterInstance.getAddress()
    );

    // Deploy Nonfungible Position Manager
    console.log("\nDeploying Nonfungible Position Manager...");
    const nonfungiblePositionManager = new ContractFactory(
      NonfungiblePositionManager.abi,
      NonfungiblePositionManager.bytecode,
      signer
    );

    // Estimate gas for position manager deployment
    const positionManagerGasEstimate = await estimateGas(
      nonfungiblePositionManager,
      [
        await uniswapV3FactoryInstance.getAddress(),
        validatedOptions.wzeta,
        await swapRouterInstance.getAddress(),
      ]
    );
    if (positionManagerGasEstimate) {
      deployOpts.gasLimit = Number(positionManagerGasEstimate * 2n);
    }

    console.log("Using gas limit:", deployOpts.gasLimit.toString());

    const nonfungiblePositionManagerInstance =
      await nonfungiblePositionManager.deploy(
        await uniswapV3FactoryInstance.getAddress(),
        validatedOptions.wzeta,
        await swapRouterInstance.getAddress(),
        deployOpts
      );
    console.log(
      "Position Manager deployment transaction hash:",
      nonfungiblePositionManagerInstance.deploymentTransaction()?.hash
    );

    await nonfungiblePositionManagerInstance.waitForDeployment();
    console.log(
      "Nonfungible Position Manager deployed at:",
      await nonfungiblePositionManagerInstance.getAddress()
    );

    console.log("\nDeployment completed successfully!");
    console.log("\nContract addresses:");
    console.log(
      "Uniswap V3 Factory:",
      await uniswapV3FactoryInstance.getAddress()
    );
    console.log("Swap Router:", await swapRouterInstance.getAddress());
    console.log(
      "Nonfungible Position Manager:",
      await nonfungiblePositionManagerInstance.getAddress()
    );
  } catch (error) {
    const deploymentError = error as DeploymentError;
    console.error("\nDeployment failed with error:");
    console.error("Error message:", deploymentError.message);
    if (deploymentError.receipt) {
      console.error("Transaction receipt:", deploymentError.receipt);
    }
    if (deploymentError.transaction) {
      console.error("Transaction details:", deploymentError.transaction);
    }
    process.exit(1);
  }
};

export const deployCommand = new Command("deploy")
  .description("Deploy Uniswap V3 contracts")
  .requiredOption("--private-key <privateKey>", "Private key for deployment")
  .option("--rpc <rpc>", "RPC URL for the network", DEFAULT_RPC)
  .option("--wzeta <wzeta>", "WZETA token address", DEFAULT_WZETA)
  .action(main);
