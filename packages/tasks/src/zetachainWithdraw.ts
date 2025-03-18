import { task, types } from "hardhat/config";
import type { HardhatRuntimeEnvironment } from "hardhat/types";
import { z } from "zod";

import {
  bigNumberStringSchema,
  evmAddressSchema,
} from "../../../types/shared.schema";
import { ZetaChainClient } from "../../client/src/";

const zetachainWithdrawArgsSchema = z.object({
  amount: z.string(),
  callOnRevert: z.boolean().optional(),
  gatewayZetaChain: evmAddressSchema.optional(),
  onRevertGasLimit: bigNumberStringSchema,
  receiver: z.string(),
  revertAddress: z.string(),
  revertMessage: z.string(),
  txOptionsGasLimit: bigNumberStringSchema,
  txOptionsGasPrice: bigNumberStringSchema,
  zrc20: z.string(),
});

type ZetachainWithdrawArgs = z.infer<typeof zetachainWithdrawArgsSchema>;

export const zetachainWithdraw = async (
  args: ZetachainWithdrawArgs,
  hre: HardhatRuntimeEnvironment
) => {
  const {
    success,
    error,
    data: parsedArgs,
  } = zetachainWithdrawArgsSchema.safeParse(args);

  if (!success) {
    console.error("Invalid arguments:", error?.message);
    return;
  }

  try {
    const [signer] = await hre.ethers.getSigners();
    const network = hre.network.name;
    const client = new ZetaChainClient({ network, signer });
    const response = await client.zetachainWithdraw({
      amount: parsedArgs.amount,
      gatewayZetaChain: parsedArgs.gatewayZetaChain,
      receiver: parsedArgs.receiver,
      revertOptions: {
        callOnRevert: parsedArgs.callOnRevert || false,
        onRevertGasLimit: parsedArgs.onRevertGasLimit,
        revertAddress: parsedArgs.revertAddress,
        revertMessage: parsedArgs.revertMessage,
      },
      txOptions: {
        gasLimit: parsedArgs.txOptionsGasLimit,
        gasPrice: parsedArgs.txOptionsGasPrice,
      },
      zrc20: parsedArgs.zrc20,
    });

    const receipt = await response.tx.wait();
    console.log("Transaction hash:", receipt.transactionHash);
  } catch (e) {
    console.error("Transaction error:", e);
  }
};

task("zetachain-withdraw", "Withdraw tokens from ZetaChain", zetachainWithdraw)
  .addOptionalParam(
    "gatewayZetaChain",
    "contract address of gateway on ZetaChain"
  )
  .addOptionalParam("zrc20", "The address of the ZRC20 token")
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
