import { getFullnodeUrl, SuiClient } from "@mysten/sui/client";
import { Transaction } from "@mysten/sui/transactions";
import { Command, Option } from "commander";
import { AbiCoder, ethers } from "ethers";
import { z } from "zod";

import { DEFAULT_ACCOUNT_NAME } from "../../../../types/shared.constants";
import {
  GAS_BUDGET,
  getCoin,
  getKeypair,
  chainIdToNetwork,
  signAndExecuteTransaction,
} from "../../../../utils/sui";

// Convert decimal amount to smallest unit (e.g., SUI to MIST)
const toSmallestUnit = (amount: string, decimals = 9): bigint => {
  if (!/^\d+(\.\d+)?$/.test(amount)) {
    throw new Error("Invalid decimal amount");
  }
  const [whole = "0", fraction = ""] = amount.split(".");
  const paddedFraction = (fraction + "0".repeat(decimals)).slice(0, decimals);
  const multiplier = BigInt(10) ** BigInt(decimals);
  return BigInt(whole) * multiplier + BigInt(paddedFraction);
};

const depositAndCallOptionsSchema = z
  .object({
    amount: z.string(),
    chainId: z.enum(["101", "103", "0103"]).optional(),
    coinType: z.string().default("0x2::sui::SUI"),
    gasBudget: z.string(),
    gatewayObject: z.string(),
    gatewayPackage: z.string(),
    mnemonic: z.string().optional(),
    name: z.string().optional(),
    network: z.enum(["localnet", "testnet", "mainnet"]).optional(),
    privateKey: z.string().optional(),
    receiver: z.string(),
    types: z.array(z.string()),
    values: z.array(z.string()),
  })
  .refine((data) => data.mnemonic || data.privateKey || data.name, {
    message: "Either mnemonic, private key or name must be provided",
  });

export type DepositOptions = z.infer<typeof depositAndCallOptionsSchema>;

const main = async (options: DepositOptions) => {
  const resolvedNetwork =
    options.network ||
    (options.chainId ? chainIdToNetwork[options.chainId] : undefined);
  if (!resolvedNetwork) {
    throw new Error("Either network or chainId must be provided");
  }
  const client = new SuiClient({ url: getFullnodeUrl(resolvedNetwork) });

  const gasBudgetValue = BigInt(options.gasBudget);

  if (!options.gatewayObject || !options.gatewayPackage) {
    throw new Error(
      "Gateway object ID and module ID must be provided either as parameters or in localnet.json"
    );
  }

  const keypair = getKeypair(options);

  const address = keypair.toSuiAddress();

  const coinObjectId = await getCoin(client, address, options.coinType);

  const coinObject = await client.getObject({
    id: coinObjectId,
    options: { showContent: true },
  });
  if (
    !coinObject.data?.content ||
    coinObject.data.content.dataType !== "moveObject"
  ) {
    throw new Error(`Failed to get coin object data for ${coinObjectId}`);
  }
  const actualCoinType = coinObject.data.content.type;

  if (!actualCoinType.includes(options.coinType)) {
    throw new Error(
      `Coin type mismatch. Expected: ${options.coinType}, Got: ${actualCoinType}`
    );
  }

  const tx = new Transaction();

  const abiCoder = AbiCoder.defaultAbiCoder();
  const payload = abiCoder.encode(options.types, options.values);
  const payloadBytes = ethers.getBytes(payload);

  if (options.coinType === "0x2::sui::SUI") {
    const [splitCoin] = tx.splitCoins(tx.gas, [toSmallestUnit(options.amount)]);

    tx.moveCall({
      arguments: [
        tx.object(options.gatewayObject),
        splitCoin,
        tx.pure.string(options.receiver),
        tx.pure.vector("u8", payloadBytes),
      ],
      target: `${options.gatewayPackage}::gateway::deposit_and_call`,
      typeArguments: [options.coinType],
    });
  } else {
    const [splitCoin] = tx.splitCoins(tx.object(coinObjectId), [
      toSmallestUnit(options.amount),
    ]);

    tx.moveCall({
      arguments: [
        tx.object(options.gatewayObject),
        splitCoin,
        tx.pure.string(options.receiver),
        tx.pure.vector("u8", payloadBytes),
      ],
      target: `${options.gatewayPackage}::gateway::deposit_and_call`,
      typeArguments: [options.coinType],
    });
  }

  tx.setGasBudget(gasBudgetValue);

  await signAndExecuteTransaction({
    client,
    keypair,
    transaction: tx,
    gasBudget: gasBudgetValue,
  });
};

export const depositAndCallCommand = new Command("deposit-and-call")
  .description("Deposit tokens from Sui and call a contract on ZetaChain")
  .addOption(
    new Option("--mnemonic <mnemonic>", "Mnemonic for the account").conflicts(
      "private-key"
    )
  )
  .addOption(
    new Option(
      "--private-key <privateKey>",
      "Private key for the account"
    ).conflicts("mnemonic")
  )
  .requiredOption("--gateway-object <gatewayObject>", "Gateway object ID")
  .requiredOption("--gateway-package <gatewayPackage>", "Gateway package ID")
  .requiredOption("--receiver <receiver>", "Receiver address on ZetaChain")
  .requiredOption("--amount <amount>", "Amount to deposit in decimal format")
  .addOption(
    new Option("--chain-id <chainId>", "Chain ID")
      .choices(["101", "103", "0103"])
      .default("103")
      .conflicts(["network"])
  )
  .option("--coin-type <coinType>", "Coin type to deposit", "0x2::sui::SUI")
  .addOption(
    new Option("--network <network>", "Network to use")
      .choices(["localnet", "testnet", "mainnet"])
      .conflicts(["chain-id"])
  )
  .option(
    "--gas-budget <gasBudget>",
    "Gas budget in MIST",
    GAS_BUDGET.toString()
  )
  .option(
    "--types <types...>",
    "JSON string array of parameter types (e.g. uint256 address)"
  )
  .option("--values <values...>", "Parameter values for the function call")
  .addOption(
    new Option("--name <name>", "Account name")
      .default(DEFAULT_ACCOUNT_NAME)
      .conflicts(["private-key"])
  )
  .action(async (options) => {
    const validatedOptions = depositAndCallOptionsSchema.parse(options);
    await main(validatedOptions);
  });
