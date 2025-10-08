import { AbiCoder, getBytes, hexlify } from "ethers";
import { z } from "zod";

import { suiDepositAndCall } from "../../../../src/chains/sui/depositAndCall";
import { confirmTransaction } from "../../../../utils/common.command.helpers";
import {
  commonDepositObjectSchema,
  getKeypair,
  getSuiRpcByChainId,
} from "../../../../utils/sui";
import { createSuiCommandWithCommonOptions } from "../../../../utils/sui.command.helpers";

const depositAndCallOptionsSchema = commonDepositObjectSchema
  .extend({
    types: z.array(z.string()),
    values: z.array(z.string()),
  })
  .refine((options) => options.types.length === options.values.length, {
    message: "`types` and `values` must have equal length",
  });

type DepositAndCallOptions = z.infer<typeof depositAndCallOptionsSchema>;

const main = async (options: DepositAndCallOptions) => {
  const keypair = getKeypair(options);

  const abiCoder = AbiCoder.defaultAbiCoder();
  const payloadABI = abiCoder.encode(options.types, options.values);
  const message = hexlify(getBytes(payloadABI));

  const isConfirmed = await confirmTransaction({
    amount: options.amount,
    message,
    receiver: options.receiver,
    rpc: getSuiRpcByChainId(Number(options.chainId)),
    sender: keypair.toSuiAddress(),
  });
  if (!isConfirmed) return;
  await suiDepositAndCall(
    {
      amount: options.amount,
      receiver: options.receiver,
      token: options.coinType,
      types: options.types,
      values: options.values,
    },
    {
      chainId: options.chainId,
      gasLimit: options.gasBudget,
      gatewayObject: options.gatewayObject,
      gatewayPackage: options.gatewayPackage,
      signer: keypair,
    }
  );
};

export const depositAndCallCommand = createSuiCommandWithCommonOptions(
  "deposit-and-call"
)
  .summary("Deposit tokens from Sui and call a contract on ZetaChain")
  .option("--values <values...>", "Parameter values for the function call")
  .option(
    "--types <types...>",
    "List of parameter types (e.g. uint256 address)"
  )
  .action(async (options: DepositAndCallOptions) => {
    const validatedOptions = depositAndCallOptionsSchema.parse(options);
    await main(validatedOptions);
  });
