import { Command } from "commander";
import { z } from "zod";

import {
  namePkRefineRule,
  stringArraySchema,
  typesAndValuesLengthRefineRule,
} from "../../../../types/shared.schema";
import { handleError } from "../../../../utils";
import {
  addCommonEvmDepositCommandOptions,
  baseEvmDepositOptionsSchema,
  confirmTransaction,
  prepareRevertOptions,
  prepareTxOptions,
  setupTransaction,
} from "../../../../utils/evm.command.helpers";
import { parseAbiValues } from "../../../../utils/parseAbiValues";
import { parseJson } from "../../../../utils/parseJson";

const depositAndCallOptionsSchema = baseEvmDepositOptionsSchema
  .extend({
    types: stringArraySchema,
    values: stringArraySchema.min(1, "At least one value is required"),
  })
  .refine(typesAndValuesLengthRefineRule.rule, {
    message: typesAndValuesLengthRefineRule.message,
    path: typesAndValuesLengthRefineRule.path,
  })
  .refine(namePkRefineRule);

type DepositAndCallOptions = z.infer<typeof depositAndCallOptionsSchema>;

const main = async (options: DepositAndCallOptions) => {
  try {
    const { client, signer } = await setupTransaction(options);

    const stringifiedTypes = JSON.stringify(options.types);

    console.log(`Contract call details:
Function parameters: ${options.values.join(", ")}
Parameter types: ${stringifiedTypes}
`);

    await confirmTransaction(options);

    const values = parseAbiValues(stringifiedTypes, options.values);
    const parsedTypes = parseJson(stringifiedTypes, stringArraySchema);

    const tx = await client.evmDepositAndCall({
      amount: options.amount,
      erc20: options.erc20,
      gatewayEvm: options.gateway,
      receiver: options.receiver,
      revertOptions: prepareRevertOptions(options, signer),
      txOptions: prepareTxOptions(options),
      types: parsedTypes,
      values,
    });
    console.log("Transaction hash:", tx.hash);
  } catch (error) {
    handleError({
      context: "Error during depositAndCall to EVM",
      error,
      shouldThrow: false,
    });
    process.exit(1);
  }
};

export const depositAndCallCommand = new Command(
  "deposit-and-call"
).description(
  "Deposit tokens and call a contract on ZetaChain from an EVM-compatible chain"
);

addCommonEvmDepositCommandOptions(depositAndCallCommand)
  .requiredOption(
    "--types <types...>",
    "JSON string array of parameter types (e.g. uint256 address)"
  )
  .requiredOption(
    "--values <values...>",
    "Parameter values for the function call"
  )
  .action(async (options) => {
    const validatedOptions = depositAndCallOptionsSchema.parse(options);
    await main(validatedOptions);
  });
