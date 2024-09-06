import { task, types } from "hardhat/config";
import type { HardhatRuntimeEnvironment } from "hardhat/types";
import { ZetaChainClient } from "../../client/src/";

export const zetachainWithdraw = async (
  args: any,
  hre: HardhatRuntimeEnvironment
) => {
  const { ethers } = hre as any;
  const [signer] = await ethers.getSigners();
  const client = new ZetaChainClient({ network: "testnet", signer });
  try {
    const tx = await client.zetachainWithdraw({
      amount: args.amount,
      zrc20: args.zrc20,
      receiver: args.receiver,
      gasLimit: args.gasLimit,
      gasPrice: args.gasPrice,
      gatewayZetaChain: args.gatewayZetaChain,
      callOnRevert: args.callOnRevert,
      onRevertGasLimit: args.onRevertGasLimit,
      revertAddress: args.revertAddress,
      revertMessage: args.revertMessage,
    });

    const receipt = await tx.wait();
    console.log("Transaction hash:", receipt.transactionHash);
  } catch (e) {
    console.error("Transaction error:", e);
  }
};

task("zetachain-withdraw", "Withdraw tokens from ZetaChain", zetachainWithdraw)
  .addOptionalParam(
    "gatewayZetaChain",
    "contract address of gateway on ZetaChain",
    "0xA51c1fc2f0D1a1b8494Ed1FE312d7C3a78Ed91C0"
  )
  .addOptionalParam("zrc20", "The address of the ZRC20 token")
  .addFlag("callOnRevert", "Whether to call on revert")
  .addOptionalParam(
    "revertAddress",
    "Revert address",
    "0x0000000000000000000000000000000000000000"
  )
  .addOptionalParam(
    "gasPrice",
    "The gas price for the transaction",
    10000000000,
    types.int
  )
  .addOptionalParam(
    "gasLimit",
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
