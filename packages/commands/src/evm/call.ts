import { Command } from "commander";
import { z } from "zod";

import {
  namePkRefineRule,
  stringArraySchema,
  typesAndValuesLengthRefineRule,
} from "../../../../types/shared.schema";
import {
  handleError,
  printEvmTransactionDetails,
  validateAndParseSchema,
} from "../../../../utils";
import {
  addCommonEvmCommandOptions,
  baseEvmOptionsSchema,
  confirmTransaction,
  prepareRevertOptions,
  prepareTxOptions,
  setupTransaction,
} from "../../../../utils/evm.command.helpers";
import { parseAbiValues } from "../../../../utils/parseAbiValues";
import { parseJson } from "../../../../utils/parseJson";

const callOptionsSchema = baseEvmOptionsSchema
  .extend({
    types: stringArraySchema,
    values: stringArraySchema.min(1, "At least one value is required"),
  })
  .refine(typesAndValuesLengthRefineRule.rule, {
    message: typesAndValuesLengthRefineRule.message,
    path: typesAndValuesLengthRefineRule.path,
  })
  .refine(namePkRefineRule);

type CallOptions = z.infer<typeof callOptionsSchema>;

const main = async (options: CallOptions) => {
  try {
    const { client, signer, chainId } = setupTransaction(options);

    await printEvmTransactionDetails(signer, chainId, {
      amount: "",
      callOnRevert: options.callOnRevert,
      onRevertGasLimit: options.onRevertGasLimit,
      receiver: options.receiver,
      revertMessage: options.revertMessage,
    });

    const stringifiedTypes = JSON.stringify(options.types);

    console.log(`Contract call details:
Function parameters: ${options.values.join(", ")}
Parameter types: ${stringifiedTypes}
`);

    const isConfirmed = await confirmTransaction(options);

    if (!isConfirmed) return;

    const values = parseAbiValues(stringifiedTypes, options.values);
    const parsedTypes = parseJson(stringifiedTypes, stringArraySchema);

    const tx = await client.evmCall({
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
      context: "Error during call to EVM",
      error,
      shouldThrow: false,
    });
    process.exit(1);
  }
};

export const callCommand = new Command("call").description(
  "Call a contract on ZetaChain from an EVM-compatible chain"
);

addCommonEvmCommandOptions(callCommand)
  .requiredOption(
    "--types <types...>",
    "List of parameter types (e.g. uint256 address)"
  )
  .requiredOption(
    "--values <values...>",
    "Parameter values for the function call"
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
