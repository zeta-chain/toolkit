import { Command, Option } from "commander";
import { z } from "zod";

import {
  functionTypesValuesConsistencyRule,
  hexStringSchema,
  namePkRefineRule,
  stringArraySchema,
  typesAndDataExclusivityRefineRule,
  typesAndValuesLengthRefineRule,
} from "../../../../types/shared.schema";
import { handleError, validateAndParseSchema } from "../../../../utils";
import { parseAbiValues } from "../../../../utils/parseAbiValues";
import {
  addCommonZetachainCommandOptions,
  baseZetachainOptionsSchema,
  confirmZetachainTransaction,
  prepareCallOptions,
  prepareRevertOptions,
  prepareTxOptions,
  setupZetachainTransaction,
} from "../../../../utils/zetachain.command.helpers";

const callOptionsSchema = baseZetachainOptionsSchema
  .extend({
    data: hexStringSchema.optional(),
    function: z.string().optional(),
    types: stringArraySchema.optional(),
    values: stringArraySchema.optional(),
  })
  .refine(typesAndValuesLengthRefineRule.rule, {
    message: typesAndValuesLengthRefineRule.message,
    path: typesAndValuesLengthRefineRule.path,
  })
  .refine(typesAndDataExclusivityRefineRule.rule, {
    message: typesAndDataExclusivityRefineRule.message,
    path: typesAndDataExclusivityRefineRule.path,
  })
  .refine(functionTypesValuesConsistencyRule.rule, {
    message: functionTypesValuesConsistencyRule.message,
    path: functionTypesValuesConsistencyRule.path,
  })
  .refine(namePkRefineRule);

type CallOptions = z.infer<typeof callOptionsSchema>;

const main = async (options: CallOptions) => {
  try {
    const { client } = setupZetachainTransaction(options);

    if (options.data) {
      console.log(`Contract call details:
Raw data: ${options.data}
`);

      const response = await client.zetachainCall({
        callOptions: prepareCallOptions(options),
        data: options.data,
        gatewayZetaChain: options.gatewayZetachain,
        receiver: options.receiver,
        revertOptions: prepareRevertOptions(options),
        txOptions: prepareTxOptions(options),
        zrc20: options.zrc20,
      });

      const receipt = await response.tx.wait();
      console.log("Transaction hash:", receipt?.hash);
    } else {
      const stringifiedTypes = JSON.stringify(options.types);
      console.log(`Contract call details:
Function: ${options.function}
Function parameters: ${options.values?.join(", ")}
Parameter types: ${stringifiedTypes}
`);

      const isConfirmed = await confirmZetachainTransaction(options);
      if (!isConfirmed) return;

      const values = parseAbiValues(stringifiedTypes, options.values || []);

      const response = await client.zetachainCall({
        callOptions: prepareCallOptions(options),
        function: options.function,
        gatewayZetaChain: options.gatewayZetachain,
        receiver: options.receiver,
        revertOptions: prepareRevertOptions(options),
        txOptions: prepareTxOptions(options),
        types: options.types,
        values,
        zrc20: options.zrc20,
      });

      const receipt = await response.tx.wait();
      console.log("Transaction hash:", receipt?.hash);
    }
  } catch (error) {
    handleError({
      context: "Error during zetachain call",
      error,
      shouldThrow: false,
    });
    process.exit(1);
  }
};

export const callCommand = new Command("call").description(
  "Call a contract on a connected chain from ZetaChain"
);

addCommonZetachainCommandOptions(callCommand)
  .option(
    "--function <function>",
    `Function to call (example: "hello(string)")`
  )
  .option(
    "--types <types...>",
    "List of parameter types (e.g. uint256 address)"
  )
  .option("--values <values...>", "Parameter values for the function call")
  .addOption(
    new Option(
      "--data <data>",
      "Raw data for non-EVM chains like Solana"
    ).conflicts(["types", "values", "function"])
  )
  .action(async (options) => {
    const validatedOptions = validateAndParseSchema(
      options,
      callOptionsSchema,
      {
        exitOnError: true,
      }
    );
    await main(validatedOptions);
  });
