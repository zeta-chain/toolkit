import { task, types } from "hardhat/config";
import type { HardhatRuntimeEnvironment } from "hardhat/types";
import { z } from "zod";

import {
  bigNumberStringSchema,
  evmAddressSchema,
  validJsonStringSchema,
} from "../../../types/shared.schema";
import { parseAbiValues } from "../../../utils/parseAbiValues";
import { ZetaChainClient } from "../../client/src/";

const zetachainWithdrawAndCallArgsSchema = z.object({
  amount: z.string(),
  callOnRevert: z.boolean().optional(),
  callOptionsGasLimit: bigNumberStringSchema,
  callOptionsIsArbitraryCall: z.boolean().optional(),
  function: z.string(),
  gatewayZetaChain: evmAddressSchema.optional(),
  onRevertGasLimit: bigNumberStringSchema,
  receiver: z.string(),
  revertAddress: z.string(),
  revertMessage: z.string(),
  txOptionsGasLimit: bigNumberStringSchema,
  txOptionsGasPrice: bigNumberStringSchema,
  types: validJsonStringSchema,
  values: z.array(z.string()).min(1, "At least one value is required"),
  zrc20: z.string(),
});

type ZetachainWithdrawAndCallArgs = z.infer<
  typeof zetachainWithdrawAndCallArgsSchema
>;

export const zetachainWithdrawAndCall = async (
  args: ZetachainWithdrawAndCallArgs,
  hre: HardhatRuntimeEnvironment
) => {
  const {
    success,
    error,
    data: parsedArgs,
  } = zetachainWithdrawAndCallArgsSchema.safeParse(args);

  if (!success) {
    console.error("Invalid arguments:", error?.message);
    return;
  }

  const callOptions = {
    gasLimit: parsedArgs.callOptionsGasLimit,
    isArbitraryCall: parsedArgs.callOptionsIsArbitraryCall || false,
  };

  try {
    const values = parseAbiValues(parsedArgs.types, parsedArgs.values);
    const [signer] = await hre.ethers.getSigners();
    const network = hre.network.name;
    const client = new ZetaChainClient({ network, signer });
    const parsedTypes = z.array(z.string()).parse(JSON.parse(parsedArgs.types));

    const response = await client.zetachainWithdrawAndCall({
      amount: parsedArgs.amount,
      callOptions,
      function: parsedArgs.function,
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
      types: parsedTypes,
      values,
      zrc20: parsedArgs.zrc20,
    });

    const receipt = await response.tx.wait();
    console.log("Transaction hash:", receipt.transactionHash);
  } catch (e) {
    console.error("Transaction error:", e);
  }
};

task(
  "zetachain-withdraw-and-call",
  "Withdraw tokens from ZetaChain and call a contract",
  zetachainWithdrawAndCall
)
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
  .addFlag("callOptionsIsArbitraryCall", "Call any function")
  .addOptionalParam(
    "callOptionsGasLimit",
    "The gas limit for the call",
    7000000,
    types.int
  )
  .addParam("amount", "The amount of tokens to send")
  .addOptionalParam("function", `Function to call (example: "hello(string)")`)
  .addParam("types", `The types of the parameters (example: '["string"]')`)
  .addVariadicPositionalParam("values", "The values of the parameters");
