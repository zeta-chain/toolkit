import { Command } from "commander";
import { ethers } from "ethers";
import { z } from "zod";

import { namePkRefineRule } from "../../../../types/shared.schema";
import { handleError, validateAndParseSchema } from "../../../../utils";
import {
  addCommonZetachainCommandOptions,
  baseZetachainOptionsSchema,
  confirmZetachainTransaction,
  getZevmGatewayAddress,
  getZRC20WithdrawFee,
  prepareRevertOptions,
  prepareTxOptions,
  setupZetachainTransaction,
} from "../../../../utils/zetachain.command.helpers";

const withdrawOptionsSchema = baseZetachainOptionsSchema
  .extend({
    amount: z.string(),
  })
  .refine(namePkRefineRule);

type WithdrawOptions = z.infer<typeof withdrawOptionsSchema>;

const main = async (options: WithdrawOptions) => {
  try {
    const { client } = setupZetachainTransaction(options);

    const gatewayZetaChain = getZevmGatewayAddress(
      options.network,
      options.gatewayZetachain
    );

    const { gasFee, gasSymbol, zrc20Symbol } = await getZRC20WithdrawFee(
      client.signer as ethers.ContractRunner,
      options.zrc20
    );

    console.log(`Withdraw details:
Amount: ${options.amount} ${zrc20Symbol}
Withdraw Gas Fee: ${gasFee} ${gasSymbol}
Receiver: ${options.receiver}
ZRC20: ${options.zrc20}
ZetaChain Gateway: ${gatewayZetaChain}
`);

    const isConfirmed = await confirmZetachainTransaction(options);
    if (!isConfirmed) return;

    const response = await client.zetachainWithdraw({
      amount: options.amount,
      gatewayZetaChain,
      receiver: options.receiver,
      revertOptions: prepareRevertOptions(options),
      txOptions: prepareTxOptions(options),
      zrc20: options.zrc20,
    });

    const receipt = await response.tx.wait();
    console.log("Transaction hash:", receipt?.hash);
  } catch (error) {
    handleError({
      context: "Error during zetachain withdraw",
      error,
      shouldThrow: false,
    });
    process.exit(1);
  }
};

export const withdrawCommand = new Command("withdraw").summary(
  "Withdraw tokens from ZetaChain to a connected chain"
);

addCommonZetachainCommandOptions(withdrawCommand)
  .requiredOption("--amount <amount>", "The amount of tokens to withdraw")
  .action(async (options) => {
    const validatedOptions = validateAndParseSchema(
      options,
      withdrawOptionsSchema,
      {
        exitOnError: true,
      }
    );
    await main(validatedOptions);
  });
