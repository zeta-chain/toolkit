import { task, types } from "hardhat/config";
import type { HardhatRuntimeEnvironment } from "hardhat/types";
import { z } from "zod";

import {
  bigNumberStringSchema,
  evmAddressSchema,
  stringArraySchema,
  validJsonStringSchema,
} from "../../../types/shared.schema";
import { parseJson, validateTaskArgs } from "../../../utils";
import { parseAbiValues } from "../../../utils/parseAbiValues";
import { ZetaChainClient } from "../../client/src/";

const zetachainCallArgsSchema = z.object({
  abortAddress: evmAddressSchema,
  callOnRevert: z.boolean().optional(),
  callOptionsGasLimit: bigNumberStringSchema,
  callOptionsIsArbitraryCall: z.boolean().optional(),
  function: z.string(),
  gatewayZetaChain: evmAddressSchema.optional(),
  onRevertGasLimit: bigNumberStringSchema,
  receiver: z.string(),
  revertAddress: evmAddressSchema,
  revertMessage: z.string(),
  txOptionsGasLimit: bigNumberStringSchema,
  txOptionsGasPrice: bigNumberStringSchema,
  types: validJsonStringSchema,
  values: z.array(z.string()).min(1, "At least one value is required"),
  zrc20: z.string(),
});

type ZetachainCallArgs = z.infer<typeof zetachainCallArgsSchema>;

export const zetachainCall = async (
  args: ZetachainCallArgs,
  hre: HardhatRuntimeEnvironment
) => {
  const parsedArgs = validateTaskArgs(args, zetachainCallArgsSchema);

  const callOptions = {
    gasLimit: parsedArgs.callOptionsGasLimit,
    isArbitraryCall: parsedArgs.callOptionsIsArbitraryCall || false,
  };

  try {
    const values = parseAbiValues(parsedArgs.types, parsedArgs.values);

    const [signer] = await hre.ethers.getSigners();
    const network = hre.network.name;
    const client = new ZetaChainClient({ network, signer });
    const parsedTypes = parseJson(parsedArgs.types, stringArraySchema);

    const response = await client.zetachainCall({
      callOptions,
      function: parsedArgs.function,
      gatewayZetaChain: parsedArgs.gatewayZetaChain,
      receiver: parsedArgs.receiver,
      revertOptions: {
        abortAddress: parsedArgs.abortAddress,
        callOnRevert: parsedArgs.callOnRevert || false,
        onRevertGasLimit: parsedArgs.onRevertGasLimit,
        revertAddress: parsedArgs.revertAddress,
        revertMessage: parsedArgs.revertMessage,
      },
      txOptions: {
        gasLimit: parsedArgs.txOptionsGasLimit,
        gasPrice: parsedArgs.txOptionsGasPrice,
      },
      types: parsedTypes,
      values,
      zrc20: parsedArgs.zrc20,
    });
    const receipt = await response.tx.wait();
    console.log("Transaction hash:", receipt?.hash);
  } catch (e) {
    console.error("Transaction error:", e);
  }
};

task("zetachain-call", "Call a contract on a connected chain", zetachainCall)
  .addOptionalParam(
    "gatewayZetaChain",
    "contract address of gateway on ZetaChain"
  )
  .addParam("zrc20", "The address of ZRC-20 to pay fees")
  .addFlag("callOnRevert", "Whether to call on revert")
  .addOptionalParam(
    "revertAddress",
    "Revert address",
    "0x0000000000000000000000000000000000000000"
  )
  .addOptionalParam(
    "abortAddress",
    "Abort address",
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
  .addFlag("callOptionsIsArbitraryCall", "Call any function")
  .addOptionalParam(
    "callOptionsGasLimit",
    "The gas limit for the call",
    7000000,
    types.int
  )
  .addParam("function", `Function to call (example: "hello(string)")`)
  .addParam("types", `The types of the parameters (example: '["string"]')`)
  .addVariadicPositionalParam("values", "The values of the parameters");
