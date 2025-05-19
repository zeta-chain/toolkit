import { getFullnodeUrl, SuiClient } from "@mysten/sui/client";
import { Transaction } from "@mysten/sui/transactions";
import { Command, Option } from "commander";
import { z } from "zod";
import { DEFAULT_ACCOUNT_NAME } from "../../../../types/shared.constants";
import {
  GAS_BUDGET,
  getCoin,
  getKeypair,
  signAndExecuteTransaction,
  getNetwork,
  chainIds,
  toSmallestUnit,
  networks,
  commonDepositOptionsSchema,
} from "../../../../utils/sui";
import { addCommonSuiCommandOptions } from "../../../../utils/sui.command.helpers";

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

  await signAndExecuteTransaction({ client, keypair, tx, gasBudget });
};

export const depositCommand = new Command("deposit").description(
  "Deposit tokens from Sui"
);

addCommonSuiCommandOptions(depositCommand).action(async (options) => {
  const validatedOptions = commonDepositOptionsSchema.parse(options);
  await main(validatedOptions);
});
