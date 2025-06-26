import { z } from "zod";

import { suiDeposit } from "../../../../src/chains/sui/deposit";
import { commonDepositOptionsSchema, getKeypair } from "../../../../utils/sui";
import { createSuiCommandWithCommonOptions } from "../../../../utils/sui.command.helpers";

type DepositOptions = z.infer<typeof commonDepositOptionsSchema>;

const main = async (options: DepositOptions) => {
  await suiDeposit(
    {
      amount: options.amount,
      receiver: options.receiver,
      token: options.coinType,
    },
    {
      chainId: options.chainId,
      gasLimit: options.gasBudget,
      gatewayObject: options.gatewayObject,
      gatewayPackage: options.gatewayPackage,
      signer: getKeypair(options),
    }
  );
};

export const depositCommand = createSuiCommandWithCommonOptions("deposit")
  .description("Deposit tokens from Sui")
  .action(async (options: DepositOptions) => {
    const validatedOptions = commonDepositOptionsSchema.parse(options);
    await main(validatedOptions);
  });
