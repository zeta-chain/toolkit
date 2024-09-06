import ERC20_ABI from "@openzeppelin/contracts/build/contracts/ERC20.json";
import { task, types } from "hardhat/config";
import type { HardhatRuntimeEnvironment } from "hardhat/types";

import GatewayABI from "./abi/GatewayEVM.sol/GatewayEVM.json";

export const evmDepositAndCall = async (
  args: any,
  hre: HardhatRuntimeEnvironment
) => {
  const [signer] = await hre.ethers.getSigners();
  const { utils } = hre.ethers;

  const gateway = new hre.ethers.Contract(
    args.gatewayEvm,
    GatewayABI.abi,
    signer
  );

  const revertOptions = {
    abortAddress: "0x0000000000000000000000000000000000000000",
    callOnRevert: args.callOnRevert,
    onRevertGasLimit: args.onRevertGasLimit,
    revertAddress: args.revertAddress,
    // not used
    revertMessage: utils.hexlify(utils.toUtf8Bytes(args.revertMessage)),
  };

  const txOptions = {
    gasLimit: args.gasLimit,
    gasPrice: args.gasPrice,
  };

  const encodedParameters = utils.defaultAbiCoder.encode(
    JSON.parse(args.types),
    args.values
  );

  try {
    let tx;
    if (args.erc20) {
      const erc20Contract = new hre.ethers.Contract(
        args.erc20,
        ERC20_ABI.abi,
        signer
      );
      const decimals = await erc20Contract.decimals();
      const value = utils.parseUnits(args.amount, decimals);
      await erc20Contract.connect(signer).approve(args.gatewayEvm, value);
      const method =
        "depositAndCall(address,uint256,address,bytes,(address,bool,address,bytes,uint256))";
      tx = await gateway[method](
        args.receiver,
        value,
        args.erc20,
        encodedParameters,
        revertOptions,
        txOptions
      );
    } else {
      const value = utils.parseEther(args.amount);
      const method =
        "depositAndCall(address,bytes,(address,bool,address,bytes,uint256))";
      tx = await gateway[method](
        args.receiver,
        encodedParameters,
        revertOptions,
        {
          ...txOptions,
          value,
        }
      );
    }
    if (tx) {
      const receipt = await tx.wait();
      console.log("Transaction hash:", receipt.transactionHash);
    }
  } catch (e) {
    console.error("Transaction error:", e);
  }
};

task("evm-deposit-and-call", "Deposit tokens", evmDepositAndCall)
  .addParam("receiver", "Receiver address on ZetaChain")
  .addOptionalParam(
    "gatewayEvm",
    "contract address of gateway on EVM",
    "0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0"
  )
  .addFlag("callOnRevert", "Whether to call on revert")
  .addOptionalParam(
    "revertAddress",
    "Revert address",
    "0x0000000000000000000000000000000000000000",
    types.string
  )
  .addOptionalParam(
    "gasPrice",
    "The gas price for the transaction",
    50000000000,
    types.int
  )
  .addOptionalParam(
    "gasLimit",
    "The gas limit for the transaction",
    7000000,
    types.int
  )
  .addOptionalParam(
    "onRevertGasLimit",
    "The gas limit for the revert transaction",
    7000000,
    types.int
  )
  .addOptionalParam("revertMessage", "Revert message", "0x")
  .addParam("amount", "amount of ETH to send with the transaction")
  .addOptionalParam("erc20", "ERC-20 token address")
  .addParam("types", "The types of the parameters (example: ['string'])")
  .addVariadicPositionalParam("values", "The values of the parameters");
