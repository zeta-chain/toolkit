import { Command } from "commander";
import { z } from "zod";

import { evmDepositAndCall } from "../../../../src/lib/evm/depositAndCall";
import {
  evmAddressSchema,
  namePkRefineRule,
  stringArraySchema,
  typesAndValuesLengthRefineRule,
  validAmountSchema,
} from "../../../../types/shared.schema";
import {
  handleError,
  printEvmTransactionDetails,
  validateAndParseSchema,
} from "../../../../utils";
import {
  addCommonEvmCommandOptions,
  baseEvmOptionsSchema,
  checkSufficientEvmBalance,
  confirmEvmTransaction,
  prepareRevertOptions,
  prepareTxOptions,
  setupEvmTransaction,
} from "../../../../utils/evm.command.helpers";
import { getAddress } from "../../../../utils/getAddress";
import { parseAbiValues } from "../../../../utils/parseAbiValues";

const depositAndCallOptionsSchema = baseEvmOptionsSchema
  .extend({
    amount: validAmountSchema,
    erc20: evmAddressSchema.optional(),
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
    const { provider, signer, chainId } = setupEvmTransaction(options);

    await checkSufficientEvmBalance(
      provider,
      signer,
      options.amount,
      options.erc20
    );

    await printEvmTransactionDetails(signer, chainId, {
      amount: options.amount,
      callOnRevert: options.callOnRevert,
      erc20: options.erc20,
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

    const tx = await evmDepositAndCall(
      {
        amount: options.amount,
        receiver: options.receiver,
        revertOptions: prepareRevertOptions(options, signer),
        token: options.erc20,
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

addCommonEvmCommandOptions(depositAndCallCommand)
  .requiredOption("--amount <amount>", "Amount of tokens to deposit")
  .option(
    "--erc20 <address>",
    "ERC20 token address (optional for native token deposits)"
  )
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
      depositAndCallOptionsSchema,
      {
        exitOnError: true,
      }
    );
    await main(validatedOptions);
  });
