import { task, types } from "hardhat/config";
import type { HardhatRuntimeEnvironment } from "hardhat/types";
import { z } from "zod";

import {
  bigNumberStringSchema,
  evmAddressSchema,
} from "../../../types/shared.schema";
import { ZetaChainClient } from "../../client/src/";

const evmDepositArgsSchema = z.object({
  amount: z.string(),
  callOnRevert: z.boolean().optional(),
  erc20: z.string().optional(),
  gasLimit: bigNumberStringSchema,
  gasPrice: bigNumberStringSchema,
  gatewayEvm: evmAddressSchema.optional(),
  onRevertGasLimit: bigNumberStringSchema,
  receiver: evmAddressSchema,
  revertAddress: evmAddressSchema,
  revertMessage: z.string(),
});

type EvmDepositArgs = z.infer<typeof evmDepositArgsSchema>;

export const evmDeposit = async (
  args: EvmDepositArgs,
  hre: HardhatRuntimeEnvironment
) => {
  try {
    const {
      success,
      error,
      data: parsedArgs,
    } = evmDepositArgsSchema.safeParse(args);

    if (!success) {
      throw new Error(`Invalid arguments: ${error?.message}`);
    }

    const [signer] = await hre.ethers.getSigners();
    const network = hre.network.name;
    const client = new ZetaChainClient({ network, signer });
    const tx = await client.evmDeposit({
      amount: parsedArgs.amount,
      erc20: parsedArgs.erc20,
      gatewayEvm: parsedArgs.gatewayEvm,
      receiver: parsedArgs.receiver,
      revertOptions: {
        callOnRevert: Boolean(parsedArgs.callOnRevert),
        onRevertGasLimit: parsedArgs.onRevertGasLimit,
        revertAddress: parsedArgs.revertAddress,
        revertMessage: parsedArgs.revertMessage,
      },
      txOptions: {
        gasLimit: parsedArgs.gasLimit,
        gasPrice: parsedArgs.gasPrice,
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
