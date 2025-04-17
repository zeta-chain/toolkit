import { Command } from "commander";
import * as UniswapV3Factory from "@uniswap/v3-core/artifacts/contracts/UniswapV3Factory.sol/UniswapV3Factory.json";
import * as UniswapV3Pool from "@uniswap/v3-core/artifacts/contracts/UniswapV3Pool.sol/UniswapV3Pool.json";
import * as NonfungiblePositionManager from "@uniswap/v3-periphery/artifacts/contracts/NonfungiblePositionManager.sol/NonfungiblePositionManager.json";
import * as SwapRouter from "@uniswap/v3-periphery/artifacts/contracts/SwapRouter.sol/SwapRouter.json";
import { ethers } from "ethers";

const deployOpts = {
  gasLimit: 8000000,
};

async function estimateGas(
  contractFactory: ethers.ContractFactory,
  args: any[] = []
) {
  try {
    const deployment = await contractFactory.getDeployTransaction(...args);
    const gasEstimate = await contractFactory.runner?.provider?.estimateGas(
      deployment
    );
    console.log("Estimated gas:", gasEstimate?.toString());
    return gasEstimate;
  } catch (error) {
    console.error("Gas estimation failed:", error);
    return null;
  }
}

async function main(options: {
  privateKey: string;
  rpc: string;
  wzeta: string;
}) {
  try {
    // Initialize provider and signer
    const provider = new ethers.JsonRpcProvider(options.rpc);
    const signer = new ethers.Wallet(options.privateKey, provider);

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
    const uniswapV3Factory = new ethers.ContractFactory(
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
    const swapRouter = new ethers.ContractFactory(
      SwapRouter.abi,
      SwapRouter.bytecode,
      signer
    );

    // Estimate gas for router deployment
    const routerGasEstimate = await estimateGas(swapRouter, [
      await uniswapV3FactoryInstance.getAddress(),
      options.wzeta,
    ]);
    if (routerGasEstimate) {
      deployOpts.gasLimit = Number(routerGasEstimate * 2n);
    }

    console.log("Using gas limit:", deployOpts.gasLimit.toString());

    const swapRouterInstance = await swapRouter.deploy(
      await uniswapV3FactoryInstance.getAddress(),
      options.wzeta,
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
    const nonfungiblePositionManager = new ethers.ContractFactory(
      NonfungiblePositionManager.abi,
      NonfungiblePositionManager.bytecode,
      signer
    );

    // Estimate gas for position manager deployment
    const positionManagerGasEstimate = await estimateGas(
      nonfungiblePositionManager,
      [
        await uniswapV3FactoryInstance.getAddress(),
        options.wzeta,
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
        options.wzeta,
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
  } catch (error: any) {
    console.error("\nDeployment failed with error:");
    console.error("Error message:", error.message);
    if (error.receipt) {
      console.error("Transaction receipt:", error.receipt);
    }
    if (error.transaction) {
      console.error("Transaction details:", error.transaction);
    }
    process.exit(1);
  }
}

export const deployCommand = new Command("deploy")
  .description("Deploy Uniswap V3 contracts")
  .requiredOption("--private-key <privateKey>", "Private key for deployment")
  .option(
    "--rpc <rpc>",
    "RPC URL for the network",
    "https://zetachain-athens-evm.blockpi.network/v1/rpc/public"
  )
  .option(
    "--wzeta <wzeta>",
    "WZETA token address",
    "0x5F0b1a82749cb4E2278EC87F8BF6B618dC71a8bf"
  )
  .action(main);
