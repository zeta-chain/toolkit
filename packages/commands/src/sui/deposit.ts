import { z } from "zod";

import { suiDeposit } from "../../../../src/chains/sui/deposit";
import { confirmTransaction } from "../../../../utils/common.command.helpers";
import {
  commonDepositOptionsSchema,
  getKeypair,
  getSuiRpcByChainId,
} from "../../../../utils/sui";
import { createSuiCommandWithCommonOptions } from "../../../../utils/sui.command.helpers";

type DepositOptions = z.infer<typeof commonDepositOptionsSchema>;

const main = async (options: DepositOptions) => {
  const keypair = getKeypair(options);
  const isConfirmed = await confirmTransaction({
    amount: options.amount,
    receiver: options.receiver,
    rpc: getSuiRpcByChainId(options.chainId),
    sender: keypair.toSuiAddress(),
  });
  if (!isConfirmed) return;
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
      signer: keypair,
    }
  );
};

export const depositCommand = createSuiCommandWithCommonOptions("deposit")
  .description("Deposit tokens from Sui")
  .action(async (options: DepositOptions) => {
    const validatedOptions = commonDepositOptionsSchema.parse(options);
    await main(validatedOptions);
  });
