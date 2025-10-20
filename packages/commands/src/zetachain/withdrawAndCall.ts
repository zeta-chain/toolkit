import { Command, Option } from "commander";
import { ethers } from "ethers";
import { z } from "zod";

import { zetachainWithdrawAndCall } from "../../../../src/chains/zetachain/withdrawAndCall";
import {
  functionTypesValuesConsistencyRule,
  hexStringSchema,
  namePkRefineRule,
  rpcOrChainIdRefineRule,
  stringArraySchema,
  typesAndValuesLengthRefineRule,
} from "../../../../types/shared.schema";
import { handleError, validateAndParseSchema } from "../../../../utils";
import { getGatewayAddressFromChainId } from "../../../../utils/getAddress";
import { parseAbiValues } from "../../../../utils/parseAbiValues";
import {
  addCommonZetachainCommandOptions,
  baseZetachainOptionsSchema,
  confirmZetachainTransaction,
  getZRC20WithdrawFee,
  prepareCallOptions,
  prepareRevertOptions,
  prepareTxOptions,
  setupZetachainTransaction,
} from "../../../../utils/zetachain.command.helpers";

const withdrawAndCallOptionsSchema = baseZetachainOptionsSchema
  .extend({
    amount: z.string(),
    data: hexStringSchema.optional(),
    function: z.string().optional(),
    types: stringArraySchema.optional(),
    values: stringArraySchema.optional(),
  })
  .refine(typesAndValuesLengthRefineRule.rule, {
    message: typesAndValuesLengthRefineRule.message,
    path: typesAndValuesLengthRefineRule.path,
  })
  .refine(functionTypesValuesConsistencyRule.rule, {
    message: functionTypesValuesConsistencyRule.message,
    path: functionTypesValuesConsistencyRule.path,
  })
  .refine(namePkRefineRule)
  .refine(rpcOrChainIdRefineRule.rule, {
    message: rpcOrChainIdRefineRule.message,
  });

type WithdrawAndCallOptions = z.infer<typeof withdrawAndCallOptionsSchema>;

const main = async (options: WithdrawAndCallOptions) => {
  try {
    const { signer } = setupZetachainTransaction(options);

    const gatewayAddress = getGatewayAddressFromChainId(
      options.gateway,
      options.chainId
    );

    const { gasFee, gasSymbol, zrc20Symbol } = await getZRC20WithdrawFee(
      signer as ethers.ContractRunner,
      options.zrc20,
      options.callOptionsGasLimit
    );

    if (options.data) {
      console.log(`Withdraw and call details:
Amount: ${options.amount} ${zrc20Symbol}
Withdraw Gas Fee: ${gasFee} ${gasSymbol}
Raw data: ${options.data}
ZetaChain Gateway: ${gatewayAddress}
`);

      const isConfirmed = await confirmZetachainTransaction(options);
      if (!isConfirmed) return;

      const response = await zetachainWithdrawAndCall(
        {
          amount: options.amount,
          callOptions: prepareCallOptions(options),
          data: options.data,
          receiver: options.receiver,
          revertOptions: prepareRevertOptions(options),
          zrc20: options.zrc20,
        },
        {
          gateway: gatewayAddress,
          signer,
          txOptions: prepareTxOptions(options),
        }
      );

      const receipt = await response.tx.wait();
      console.log("Transaction hash:", receipt?.hash);
    } else if (options.function && options.types && options.values) {
      const stringifiedTypes = JSON.stringify(options.types);
      console.log(`Withdraw and call details:
Amount: ${options.amount} ${zrc20Symbol}
Withdraw Gas Fee: ${gasFee} ${gasSymbol}
Function: ${options.function}
Function parameters: ${options.values.join(", ")}
Parameter types: ${stringifiedTypes}
ZetaChain Gateway: ${gatewayAddress}
`);

      const isConfirmed = await confirmZetachainTransaction(options);
      if (!isConfirmed) return;

      const values = parseAbiValues(stringifiedTypes, options.values);

      const response = await zetachainWithdrawAndCall(
        {
          amount: options.amount,
          callOptions: prepareCallOptions(options),
          function: options.function,
          receiver: options.receiver,
          revertOptions: prepareRevertOptions(options),
          types: options.types,
          values,
          zrc20: options.zrc20,
        },
        {
          gateway: gatewayAddress,
          signer,
          txOptions: prepareTxOptions(options),
        }
      );

      const receipt = await response.tx.wait();
      console.log("Transaction hash:", receipt?.hash);
    } else {
      handleError({
        context: "Missing required parameters",
        error: new Error(
          "Either provide 'data' OR provide all three of 'function', 'types', and 'values'"
        ),
        shouldThrow: false,
      });
      process.exit(1);
    }
  } catch (error) {
    handleError({
      context: "Error during zetachain withdraw and call",
      error,
      shouldThrow: false,
    });
    process.exit(1);
  }
};

export const withdrawAndCallCommand = new Command("withdraw-and-call").summary(
  "Withdraw tokens and call a contract on a connected chain"
);

addCommonZetachainCommandOptions(withdrawAndCallCommand)
  .description(
    "Combines token withdrawal from ZetaChain with a contract call on the connected chain in a single transaction. Supports full control over function parameters, gas settings, and revert handling."
  )
  .requiredOption("--amount <amount>", "The amount of tokens to withdraw")
  .option(
    "--function <function>",
    `Function signature to call (example: "hello(string)")`
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
      withdrawAndCallOptionsSchema,
      {
        exitOnError: true,
      }
    );
    await main(validatedOptions);
  });
