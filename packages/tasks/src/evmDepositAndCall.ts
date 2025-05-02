import { task, types } from "hardhat/config";
import type { HardhatRuntimeEnvironment } from "hardhat/types";
import { z } from "zod";

import {
  bigNumberStringSchema,
  evmAddressSchema,
  stringArraySchema,
  validJsonStringSchema,
} from "../../../types/shared.schema";
import { parseJson, validateAndParseSchema } from "../../../utils";
import { parseAbiValues } from "../../../utils/parseAbiValues";
import { ZetaChainClient } from "../../client/src/";

const evmDepositAndCallArgsSchema = z.object({
  abortAddress: evmAddressSchema,
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
  types: validJsonStringSchema,
  values: z.array(z.string()).min(1, "At least one value is required"),
});

type EvmDepositAndCallArgs = z.infer<typeof evmDepositAndCallArgsSchema>;

export const evmDepositAndCall = async (
  args: EvmDepositAndCallArgs,
  hre: HardhatRuntimeEnvironment
) => {
  const parsedArgs = validateAndParseSchema(args, evmDepositAndCallArgsSchema);

  try {
    const [signer] = await hre.ethers.getSigners();
    const network = hre.network.name;
    const client = new ZetaChainClient({ network, signer });

    const values = parseAbiValues(parsedArgs.types, parsedArgs.values);

    const tx = await client.evmDepositAndCall({
      amount: parsedArgs.amount,
      erc20: parsedArgs.erc20,
      gatewayEvm: parsedArgs.gatewayEvm,
      receiver: parsedArgs.receiver,
      revertOptions: {
        abortAddress: parsedArgs.abortAddress,
        callOnRevert: parsedArgs.callOnRevert || false,
        onRevertGasLimit: parsedArgs.onRevertGasLimit,
        revertAddress: parsedArgs.revertAddress,
        revertMessage: parsedArgs.revertMessage,
      },
      txOptions: {
        gasLimit: parsedArgs.gasLimit,
        gasPrice: parsedArgs.gasPrice,
      },
      types: parseJson(parsedArgs.types, stringArraySchema),
      values,
    });
    if (tx) {
      const receipt = await tx.wait();
      console.log("Transaction hash:", receipt?.hash);
    }
  } catch (e) {
    console.error("Transaction error:", e);
  }
};

task("evm-deposit-and-call", "Deposit tokens", evmDepositAndCall)
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
    "abortAddress",
    "Abort address",
    "0x0000000000000000000000000000000000000000"
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
  .addOptionalParam("erc20", "ERC-20 token address")
  .addParam("types", `The types of the parameters (example: '["string"]')`)
  .addVariadicPositionalParam("values", "The values of the parameters");
