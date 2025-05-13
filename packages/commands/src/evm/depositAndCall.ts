import { Command } from "commander";
import { z } from "zod";

import {
  namePkRefineRule,
  stringArraySchema,
  validJsonStringSchema,
} from "../../../../types/shared.schema";
import { handleError } from "../../../../utils";
import { parseAbiValues } from "../../../../utils/parseAbiValues";
import { parseJson } from "../../../../utils/parseJson";
import {
  addCommonEvmDepositCommandOptions,
  baseEvmDepositOptionsSchema,
  confirmTransaction,
  prepareRevertOptions,
  prepareTxOptions,
  setupTransaction,
} from "./common";

const depositAndCallOptionsSchema = baseEvmDepositOptionsSchema
  .extend({
    types: validJsonStringSchema,
    values: z.array(z.string()).min(1, "At least one value is required"),
  })
  .refine(namePkRefineRule);

type DepositAndCallOptions = z.infer<typeof depositAndCallOptionsSchema>;

const main = async (options: DepositAndCallOptions) => {
  try {
    const { client, signer } = await setupTransaction(options);

    console.log(`Contract call details:
Function parameters: ${options.values.join(", ")}
Parameter types: ${options.types}
`);

    await confirmTransaction(options);

    const values = parseAbiValues(options.types, options.values);
    const parsedTypes = parseJson(options.types, stringArraySchema);

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
    "--types <types>",
    'JSON string array of parameter types (e.g. \'["uint256","address"]\')'
  )
  .requiredOption(
    "--values <values...>",
    "Parameter values for the function call"
  )
  .action(async (options) => {
    const validatedOptions = depositAndCallOptionsSchema.parse(options);
    await main(validatedOptions);
  });
