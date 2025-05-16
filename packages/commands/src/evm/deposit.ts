import { Command } from "commander";
import { z } from "zod";

import { namePkRefineRule } from "../../../../types/shared.schema";
import { handleError, validateAndParseSchema } from "../../../../utils";
import {
  addCommonEvmDepositCommandOptions,
  baseEvmDepositOptionsSchema,
  confirmTransaction,
  prepareRevertOptions,
  prepareTxOptions,
  setupTransaction,
} from "../../../../utils/evm.command.helpers";

const depositOptionsSchema =
  baseEvmDepositOptionsSchema.refine(namePkRefineRule);

type DepositOptions = z.infer<typeof depositOptionsSchema>;

const main = async (options: DepositOptions) => {
  try {
    const { client, signer } = await setupTransaction(options);

    await confirmTransaction(options);

    const tx = await client.evmDeposit({
      amount: options.amount,
      erc20: options.erc20,
      receiver: options.receiver,
      revertOptions: prepareRevertOptions(options, signer),
      txOptions: prepareTxOptions(options),
    });
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

addCommonEvmDepositCommandOptions(depositCommand).action(async (options) => {
  const validatedOptions = validateAndParseSchema(
    options,
    depositOptionsSchema,
    {
      exitOnError: true,
    }
  );
  await main(validatedOptions);
});
