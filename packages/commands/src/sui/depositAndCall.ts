import { z } from "zod";

import { suiDepositAndCall } from "../../../../src/chains/sui/depositAndCall";
import { commonDepositObjectSchema, getKeypair } from "../../../../utils/sui";
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
      signer: getKeypair(options),
    }
  );
};

export const depositAndCallCommand = createSuiCommandWithCommonOptions(
  "deposit-and-call"
)
  .description("Deposit tokens from Sui and call a contract on ZetaChain")
  .option("--values <values...>", "Parameter values for the function call")
  .option(
    "--types <types...>",
    "List of parameter types (e.g. uint256 address)"
  )
  .action(async (options: DepositAndCallOptions) => {
    const validatedOptions = depositAndCallOptionsSchema.parse(options);
    await main(validatedOptions);
  });
