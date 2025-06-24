import { Command } from "commander";
import { z } from "zod";

import { evmCall } from "../../../../src/lib/evm/call";
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
  confirmEvmTransaction,
  prepareRevertOptions,
  prepareTxOptions,
  setupEvmTransaction,
} from "../../../../utils/evm.command.helpers";
import { getAddress } from "../../../../utils/getAddress";
import { parseAbiValues } from "../../../../utils/parseAbiValues";

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
    const { signer, chainId } = setupEvmTransaction(options);

    await printEvmTransactionDetails(signer, chainId, {
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

    const isConfirmed = await confirmEvmTransaction(options);

    if (!isConfirmed) return;

    const values = parseAbiValues(stringifiedTypes, options.values);

    const gateway = options.gateway || getAddress("gateway", chainId);
    if (!gateway) {
      throw new Error("Gateway address not found");
    }

    const tx = await evmCall(
      {
        receiver: options.receiver,
        revertOptions: prepareRevertOptions(options, signer),
        types: options.types,
        values,
      },
      {
        gateway,
        signer,
        txOptions: prepareTxOptions(options),
      }
    );
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
