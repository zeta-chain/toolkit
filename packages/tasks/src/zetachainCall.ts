import { task, types } from "hardhat/config";
import type { HardhatRuntimeEnvironment } from "hardhat/types";
import { ZetaChainClient } from "../../client/src/";

export const zetachainCall = async (
  args: any,
  hre: HardhatRuntimeEnvironment
) => {
  const { ethers } = hre as any;
  const [signer] = await ethers.getSigners();
  const client = new ZetaChainClient({ network: "testnet", signer });
  try {
    const tx = await client.zetachainCall({
      amount: args.amount,
      zrc20: args.zrc20,
      receiver: args.receiver,
      function: args.function,
      types: args.types,
      values: args.values,
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

task("zetachain-call", "Call a contract on a connected chain", zetachainCall)
  .addOptionalParam(
    "gatewayZetaChain",
    "contract address of gateway on ZetaChain",
    "0xA51c1fc2f0D1a1b8494Ed1FE312d7C3a78Ed91C0"
  )
  .addParam("zrc20", "The address of ZRC-20 to pay fees")
  .addFlag("callOnRevert", "Whether to call on revert")
  .addOptionalParam(
    "revertAddress",
    "Revert address",
    "0x0000000000000000000000000000000000000000"
  )
  .addOptionalParam(
    "callGasLimit",
    "The gas limit for the transaction",
    7000000,
    types.int
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
  .addParam("function", "Function to call (example: 'hello(string)')")
  .addParam("types", "The types of the parameters (example: ['string'])")
  .addVariadicPositionalParam("values", "The values of the parameters");
