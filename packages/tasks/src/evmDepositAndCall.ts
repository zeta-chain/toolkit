import { task, types } from "hardhat/config";
import type { HardhatRuntimeEnvironment } from "hardhat/types";

import { ZetaChainClient } from "../../client/src/";

export const evmDepositAndCall = async (
  args: any,
  hre: HardhatRuntimeEnvironment
) => {
  try {
    const [signer] = await hre.ethers.getSigners();
    const client = new ZetaChainClient({ network: "testnet", signer });
    const tx = await client.evmDepositAndCall({
      amount: args.amount,
      callOnRevert: args.callOnRevert,
      erc20: args.erc20,
      gasLimit: args.gasLimit,
      gasPrice: args.gasPrice,
      gatewayEvm: args.gatewayEvm,
      onRevertGasLimit: args.onRevertGasLimit,
      receiver: args.receiver,
      revertAddress: args.revertAddress,
      revertMessage: args.revertMessage,
      types: args.types,
      values: args.values,
    });
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