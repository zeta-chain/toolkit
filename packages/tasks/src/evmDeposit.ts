import { task, types } from "hardhat/config";
import type { HardhatRuntimeEnvironment } from "hardhat/types";

import { ZetaChainClient } from "../../client/src/";

export const evmDeposit = async (args: any, hre: HardhatRuntimeEnvironment) => {
  try {
    const [signer] = await hre.ethers.getSigners();
    const network = hre.network.name;
    const client = new ZetaChainClient({ network, signer });
    const tx = await client.evmDeposit({
      amount: args.amount,
      erc20: args.erc20,
      gatewayEvm: args.gatewayEvm,
      receiver: args.receiver,
      revertOptions: {
        callOnRevert: args.callOnRevert,
        onRevertGasLimit: args.onRevertGasLimit,
        revertAddress: args.revertAddress,
        revertMessage: args.revertMessage,
      },
      txOptions: {
        gasLimit: args.gasLimit,
        gasPrice: args.gasPrice,
      },
    });
    if (tx) {
      const receipt = await tx.wait();
      console.log("Transaction hash:", receipt.transactionHash);
    }
  } catch (e) {
    console.error("Transaction error:", e);
  }
};

task("evm-deposit", "Deposit tokens", evmDeposit)
  .addParam("receiver", "Receiver address on ZetaChain")
  .addOptionalParam("gatewayEvm", "contract address of gateway on EVM")
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
  .addOptionalParam("erc20", "ERC-20 token address");
