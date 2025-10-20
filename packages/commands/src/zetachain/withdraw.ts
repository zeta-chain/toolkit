import { Command } from "commander";
import { ethers } from "ethers";
import { z } from "zod";

import { zetachainWithdraw } from "../../../../src/chains/zetachain/withdraw";
import {
  namePkRefineRule,
  rpcOrChainIdRefineRule,
} from "../../../../types/shared.schema";
import { handleError, validateAndParseSchema } from "../../../../utils";
import { getGatewayAddressFromChainId } from "../../../../utils/getAddress";
import {
  addCommonZetachainCommandOptions,
  baseZetachainOptionsSchema,
  confirmZetachainTransaction,
  getZRC20WithdrawFee,
  prepareRevertOptions,
  prepareTxOptions,
  setupZetachainTransaction,
} from "../../../../utils/zetachain.command.helpers";

const withdrawOptionsSchema = baseZetachainOptionsSchema
  .extend({
    amount: z.string(),
  })
  .refine(namePkRefineRule)
  .refine(rpcOrChainIdRefineRule.rule, {
    message: rpcOrChainIdRefineRule.message,
  });

type WithdrawOptions = z.infer<typeof withdrawOptionsSchema>;

const main = async (options: WithdrawOptions) => {
  try {
    const { signer } = setupZetachainTransaction(options);

    const gatewayAddress = getGatewayAddressFromChainId(
      options.gateway,
      options.chainId
    );

    const { gasFee, gasSymbol, zrc20Symbol } = await getZRC20WithdrawFee(
      signer as ethers.ContractRunner,
      options.zrc20
    );

    console.log(`Withdraw details:
Amount: ${options.amount} ${zrc20Symbol}
Withdraw Gas Fee: ${gasFee} ${gasSymbol}
Receiver: ${options.receiver}
ZRC20: ${options.zrc20}
ZetaChain Gateway: ${gatewayAddress}
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
        gateway: gatewayAddress,
        signer,
        txOptions: prepareTxOptions(options),
      }
    );

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
  .description(
    "Send tokens from ZetaChain to a connected chain without making a contract call. Specify the receiver address, token amount, and advanced execution options."
  )
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
