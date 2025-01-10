import { task, types } from "hardhat/config";
import type { HardhatRuntimeEnvironment } from "hardhat/types";

import { ZetaChainClient } from "../../client/src/";

export const evmCall = async (args: any, hre: HardhatRuntimeEnvironment) => {
  try {
    const [signer] = await hre.ethers.getSigners();
    const network = hre.network.name;
    const client = new ZetaChainClient({ network, signer });
    const tx = await client.evmCall({
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
      types: JSON.parse(args.types),
      values: args.values,
    });
    const receipt = await tx.wait();
    console.log("Transaction hash:", receipt.transactionHash);
  } catch (e) {
    console.error("Transaction error:", e);
  }
};

task("evm-call", "Call a universal app", evmCall)
  .addParam("receiver", "Receiver address on ZetaChain")
  .addOptionalParam("gatewayEvm", "contract address of gateway on EVM")
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
  .addOptionalParam(
    "onRevertGasLimit",
    "The gas limit for the revert transaction",
    7000000,
    types.int
  )
  .addOptionalParam("revertMessage", "Revert message", "0x")
  .addParam("types", `The types of the parameters (example: '["string"]')`)
  .addVariadicPositionalParam("values", "The values of the parameters");
