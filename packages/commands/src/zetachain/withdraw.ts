import { Command } from "commander";
import { ethers } from "ethers";
import { z } from "zod";

import { zetachainWithdraw } from "../../../../src/chains/zetachain/withdraw";
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
    const { signer } = setupZetachainTransaction(options);

    let gateway;
    if (options.gateway) {
      gateway = options.gateway;
    } else if (options.chainId) {
      gateway = getZevmGatewayAddress(options.chainId, options.gateway);
    } else {
      handleError({
        context: "Failed to retrieve gateway",
        error: new Error("Gateway not found"),
        shouldThrow: true,
      });
    }

    const { gasFee, gasSymbol, zrc20Symbol } = await getZRC20WithdrawFee(
      signer as ethers.ContractRunner,
      options.zrc20
    );

    console.log(`Withdraw details:
Amount: ${options.amount} ${zrc20Symbol}
Withdraw Gas Fee: ${gasFee} ${gasSymbol}
Receiver: ${options.receiver}
ZRC20: ${options.zrc20}
ZetaChain Gateway: ${gateway}
`);

    const isConfirmed = await confirmZetachainTransaction(options);
    if (!isConfirmed) return;

    const response = await zetachainWithdraw(
      {
        amount: options.amount,
        receiver: options.receiver,
        revertOptions: prepareRevertOptions(options),
        zrc20: options.zrc20,
      },
      {
        gateway,
        signer,
        txOptions: prepareTxOptions(options),
      }
    );

    // const receipt = await response.tx.wait();
    // console.log("Transaction hash:", receipt?.hash);
  } catch (error) {
    handleError({
      context: "Error during zetachain withdraw",
      error,
      shouldThrow: false,
    });
    process.exit(1);
  }
};

export const withdrawCommand = new Command("withdraw").description(
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
