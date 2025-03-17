import { BigNumber } from "ethers";
import { task, types } from "hardhat/config";
import type { HardhatRuntimeEnvironment } from "hardhat/types";
import { z } from "zod";

import {
  evmAddressSchema,
  validJsonStringSchema,
} from "../../../types/shared.schema";
import { parseAbiValues } from "../../../utils/parseAbiValues";
import { ZetaChainClient } from "../../client/src/";

const evmCallArgsSchema = z.object({
  callOnRevert: z.boolean().optional(),
  gasLimit: z.number().int().min(0),
  gasPrice: z.number().int().min(0),
  gatewayEvm: evmAddressSchema.optional(),
  onRevertGasLimit: z.number().int().min(0),
  receiver: evmAddressSchema,
  revertAddress: evmAddressSchema,
  revertMessage: z.string(),
  types: validJsonStringSchema,
  values: z.array(z.string()).min(1, "At least one value is required"),
});

type EvmCallArgs = z.infer<typeof evmCallArgsSchema>;

export const evmCall = async (
  args: EvmCallArgs,
  hre: HardhatRuntimeEnvironment
) => {
  try {
    const {
      success,
      error,
      data: parsedArgs,
    } = evmCallArgsSchema.safeParse(args);

    if (!success) {
      console.error("Invalid arguments:", error?.message);
      return;
    }

    // Parse the ABI values
    const values = parseAbiValues(parsedArgs.types, parsedArgs.values);

    const [signer] = await hre.ethers.getSigners();
    const network = hre.network.name;
    const client = new ZetaChainClient({ network, signer });

    // Make the EVM call
    const tx = await client.evmCall({
      gatewayEvm: parsedArgs.gatewayEvm,
      receiver: parsedArgs.receiver,
      revertOptions: {
        callOnRevert: parsedArgs.callOnRevert || false,
        onRevertGasLimit: parsedArgs.onRevertGasLimit,
        revertAddress: parsedArgs.revertAddress,
        revertMessage: parsedArgs.revertMessage,
      },
      txOptions: {
        gasLimit: parsedArgs.gasLimit,
        gasPrice: BigNumber.from(parsedArgs.gasPrice),
      },
      types: JSON.parse(parsedArgs.types) as string[],
      values,
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
