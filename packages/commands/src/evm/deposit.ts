import { Command } from "commander";
import { z } from "zod";

import { evmDeposit } from "../../../../src/chains/evm/deposit";
import {
  evmAddressSchema,
  namePkRefineRule,
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

const depositOptionsSchema = baseEvmOptionsSchema
  .extend({
    amount: validAmountSchema,
    erc20: evmAddressSchema.optional(),
  })
  .refine(namePkRefineRule);

type DepositOptions = z.infer<typeof depositOptionsSchema>;

const main = async (options: DepositOptions) => {
  try {
    const { provider, signer } = setupEvmTransaction(options);

    await checkSufficientEvmBalance(
      provider,
      signer,
      options.amount,
      options.erc20
    );

    await printEvmTransactionDetails(signer, parseInt(options.chainId), {
      amount: options.amount,
      callOnRevert: options.callOnRevert,
      erc20: options.erc20,
      onRevertGasLimit: options.onRevertGasLimit,
      receiver: options.receiver,
      revertMessage: options.revertMessage,
    });

    const isConfirmed = await confirmEvmTransaction(options);

    if (!isConfirmed) return;

    const gateway =
      options.gateway || getAddress("gateway", parseInt(options.chainId));
    if (!gateway) {
      throw new Error("Gateway address not found");
    }

    const tx = await evmDeposit(
      {
        amount: options.amount,
        receiver: options.receiver,
        revertOptions: prepareRevertOptions(options, signer),
        token: options.erc20,
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
      context: "Error depositing to EVM",
      error,
      shouldThrow: false,
    });
    process.exit(1);
  }
};

export const depositCommand = new Command("deposit").description(
  "Deposit tokens to ZetaChain from an EVM-compatible chain"
);

addCommonEvmCommandOptions(depositCommand)
  .requiredOption("--amount <amount>", "Amount of tokens to deposit")
  .option(
    "--erc20 <address>",
    "ERC20 token address (optional for native token deposits)"
  )
  .action(async (options) => {
    const validatedOptions = validateAndParseSchema(
      options,
      depositOptionsSchema,
      {
        exitOnError: true,
      }
    );
    await main(validatedOptions);
  });
