import { getFullnodeUrl, SuiClient } from "@mysten/sui/client";
import { Transaction } from "@mysten/sui/transactions";
import { z } from "zod";

import {
  commonDepositOptionsSchema,
  getCoin,
  getKeypair,
  getNetwork,
  signAndExecuteTransaction,
  toSmallestUnit,
} from "../../../../utils/sui";
import { createSuiCommandWithCommonOptions } from "../../../../utils/sui.command.helpers";

type DepositOptions = z.infer<typeof commonDepositOptionsSchema>;

const main = async (options: DepositOptions) => {
  const network = getNetwork(options.network, options.chainId);
  const client = new SuiClient({ url: getFullnodeUrl(network) });
  const gasBudget = BigInt(options.gasBudget);
  const keypair = getKeypair(options);
  const tx = new Transaction();

  const target = `${options.gatewayPackage}::gateway::deposit`;
  const receiver = tx.pure.string(options.receiver);
  const gateway = tx.object(options.gatewayObject);

  if (options.coinType === "0x2::sui::SUI") {
    const [splitCoin] = tx.splitCoins(tx.gas, [toSmallestUnit(options.amount)]);

    tx.moveCall({
      arguments: [gateway, splitCoin, receiver],
      target,
      typeArguments: [options.coinType],
    });
  } else {
    const coinObjectId = await getCoin(
      client,
      keypair.toSuiAddress(),
      options.coinType
    );

    const [splitCoin] = tx.splitCoins(tx.object(coinObjectId), [
      toSmallestUnit(options.amount),
    ]);

    tx.moveCall({
      arguments: [gateway, splitCoin, receiver],
      target,
      typeArguments: [options.coinType],
    });
  }

  tx.setGasBudget(gasBudget);

  await signAndExecuteTransaction({ client, gasBudget, keypair, tx });
};

export const depositCommand = createSuiCommandWithCommonOptions("deposit")
  .description("Deposit tokens from Sui")
  .action(async (options: DepositOptions) => {
    const validatedOptions = commonDepositOptionsSchema.parse(options);
    await main(validatedOptions);
  });
