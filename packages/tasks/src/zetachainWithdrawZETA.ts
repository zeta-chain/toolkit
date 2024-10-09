import { task, types } from "hardhat/config";
import type { HardhatRuntimeEnvironment } from "hardhat/types";

import { ZetaChainClient } from "../../client/src/";

export const zetachainWithdrawZETA = async (
  args: any,
  hre: HardhatRuntimeEnvironment
) => {
  try {
    const [signer] = await hre.ethers.getSigners();
    const client = new ZetaChainClient({ network: "testnet", signer });
    const response = await client.zetachainWithdrawZETA({
      amount: args.amount,
      gatewayZetaChain: args.gatewayZetaChain,
      receiver: args.receiver,
      chainId: args.chainId,
      revertOptions: {
        callOnRevert: args.callOnRevert,
        onRevertGasLimit: args.onRevertGasLimit,
        revertAddress: args.revertAddress,
        revertMessage: args.revertMessage,
      },
      txOptions: {
        gasLimit: args.txOptionsGasLimit,
        gasPrice: args.txOptionsGasPrice,
      },
    });

    const receipt = await response.tx.wait();
    console.log("Transaction hash:", receipt.transactionHash);
  } catch (e) {
    console.error("Transaction error:", e);
  }
};

task(
  "zetachain-withdraw-zeta",
  "Withdraw tokens from ZetaChain",
  zetachainWithdrawZETA
)
  .addOptionalParam(
    "gatewayZetaChain",
    "contract address of gateway on ZetaChain",
    "0xA51c1fc2f0D1a1b8494Ed1FE312d7C3a78Ed91C0"
  )
  .addOptionalParam("chainId", "The chain ID of the connected chain")
  .addFlag("callOnRevert", "Whether to call on revert")
  .addOptionalParam(
    "revertAddress",
    "Revert address",
    "0x0000000000000000000000000000000000000000"
  )
  .addOptionalParam(
    "txOptionsGasPrice",
    "The gas price for the transaction",
    10000000000,
    types.int
  )
  .addOptionalParam(
    "txOptionsGasLimit",
    "The gas limit for the transaction",
    7000000,
    types.int
  )
  .addOptionalParam("revertMessage", "Revert message", "0x")
  .addParam(
    "receiver",
    "The address of the receiver contract on a connected chain"
  )
  .addOptionalParam(
    "onRevertGasLimit",
    "The gas limit for the revert transaction",
    7000000,
    types.int
  )
  .addParam("amount", "The amount of tokens to send");
