import { getFullnodeUrl, SuiClient } from "@mysten/sui/client";
import { Transaction } from "@mysten/sui/transactions";
import { Command } from "commander";
import { AbiCoder, ethers } from "ethers";
import { z } from "zod";

import {
  commonDepositObjectSchema,
  getCoin,
  getKeypair,
  getNetwork,
  signAndExecuteTransaction,
  toSmallestUnit,
} from "../../../../utils/sui";

const depositAndCallOptionsSchema = commonDepositObjectSchema
  .extend({
    types: z.array(z.string()),
    values: z.array(z.string()),
  })
  .refine(
    (data: { mnemonic?: string; name?: string; privateKey?: string }) =>
      data.mnemonic || data.privateKey || data.name,
    {
      message: "Either mnemonic, private key or name must be provided",
    }
  );

type DepositAndCallOptions = z.infer<typeof depositAndCallOptionsSchema>;

const main = async (options: DepositAndCallOptions) => {
  const network = getNetwork(options.network, options.chainId);
  const client = new SuiClient({ url: getFullnodeUrl(network) });
  const gasBudget = BigInt(options.gasBudget);
  const keypair = getKeypair(options);
  const tx = new Transaction();

  const abiCoder = AbiCoder.defaultAbiCoder();
  const payloadABI = abiCoder.encode(options.types, options.values);
  const payloadBytes = ethers.getBytes(payloadABI);

  const target = `${options.gatewayPackage}::gateway::deposit_and_call`;
  const gateway = tx.object(options.gatewayObject);
  const receiver = tx.pure.string(options.receiver);
  const payload = tx.pure.vector("u8", payloadBytes);

  if (options.coinType === "0x2::sui::SUI") {
    const [splitCoin] = tx.splitCoins(tx.gas, [toSmallestUnit(options.amount)]);

    tx.moveCall({
      arguments: [gateway, splitCoin, receiver, payload],
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
      arguments: [gateway, splitCoin, receiver, payload],
      target,
      typeArguments: [options.coinType],
    });
  }

  tx.setGasBudget(gasBudget);

  await signAndExecuteTransaction({ client, gasBudget, keypair, tx });
};

export const depositAndCallCommand = new Command("deposit-and-call")
  .description("Deposit tokens from Sui and call a contract on ZetaChain")
  .addCommonSuiCommandOptions()
  .option("--values <values...>", "Parameter values for the function call")
  .option(
    "--types <types...>",
    "JSON string array of parameter types (e.g. uint256 address)"
  )
  .action(async (options) => {
    const validatedOptions = depositAndCallOptionsSchema.parse(options);
    await main(validatedOptions);
  });
