import { getFullnodeUrl, SuiClient } from "@mysten/sui/client";
import { Transaction } from "@mysten/sui/transactions";
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
import { createSuiCommandWithCommonOptions } from "../../../../utils/sui.command.helpers";
import { getAddress } from "../../../../utils/getAddress";

const depositAndCallOptionsSchema = commonDepositObjectSchema
  .extend({
    types: z.array(z.string()),
    values: z.array(z.string()),
  })
  .refine((options) => options.types.length === options.values.length, {
    message: "`types` and `values` must have equal length",
  });

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

  const gatewayAddress = getAddress("gateway", Number(options.chainId));
  if (!gatewayAddress) {
    throw new Error("Gateway address not found");
  }
  const gatewayPackage = options.gatewayPackage || gatewayAddress.split(",")[0];
  const gatewayObject = options.gatewayObject || gatewayAddress.split(",")[1];

  const target = `${gatewayPackage}::gateway::deposit_and_call`;
  const gateway = tx.object(gatewayObject);
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
export const depositAndCallCommand = createSuiCommandWithCommonOptions(
  "deposit-and-call"
)
  .description("Deposit tokens from Sui and call a contract on ZetaChain")
  .option("--values <values...>", "Parameter values for the function call")
  .option(
    "--types <types...>",
    "List of parameter types (e.g. uint256 address)"
  )
  .action(async (options: DepositAndCallOptions) => {
    const validatedOptions = depositAndCallOptionsSchema.parse(options);
    await main(validatedOptions);
  });
