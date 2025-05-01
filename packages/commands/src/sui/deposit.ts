import { getFullnodeUrl, SuiClient } from "@mysten/sui/client";
import { Transaction } from "@mysten/sui/transactions";
import { Command, Option } from "commander";
import { z } from "zod";

import {
  GAS_BUDGET,
  getCoin,
  getKeypairFromMnemonic,
  getKeypairFromPrivateKey,
} from "../../../../utils/sui";

const depositOptionsSchema = z
  .object({
    amount: z.string(),
    coinType: z.string().optional(),
    gatewayObject: z.string(),
    gatewayPackage: z.string(),
    mnemonic: z.string().optional(),
    privateKey: z.string().optional(),
    receiver: z.string(),
    network: z.enum(["localnet", "testnet", "mainnet"]),
  })
  .refine((data) => data.mnemonic || data.privateKey, {
    message: "Either mnemonic or private key must be provided",
  });

export type DepositOptions = z.infer<typeof depositOptionsSchema>;

const main = async (options: DepositOptions) => {
  const {
    mnemonic,
    privateKey,
    gatewayObject,
    gatewayPackage,
    receiver,
    amount,
    coinType,
    network,
  } = options;
  const client = new SuiClient({ url: getFullnodeUrl(network) });

  if (!gatewayObject || !gatewayPackage) {
    throw new Error(
      "Gateway object ID and module ID must be provided either as parameters or in localnet.json"
    );
  }

  const keypair = mnemonic
    ? getKeypairFromMnemonic(mnemonic)
    : getKeypairFromPrivateKey(privateKey!);
  const address = keypair.toSuiAddress();
  console.log(`Using Address: ${address}`);

  const fullCoinType = coinType || "0x2::sui::SUI";
  console.log(`Using Coin Type: ${fullCoinType}`);

  const coinObjectId = await getCoin(client, address, fullCoinType);
  console.log(`Using Coin Object: ${coinObjectId}`);

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
  console.log(`Actual Coin Type: ${actualCoinType}`);

  if (!actualCoinType.includes(fullCoinType)) {
    throw new Error(
      `Coin type mismatch. Expected: ${fullCoinType}, Got: ${actualCoinType}`
    );
  }

  const tx = new Transaction();

  // If we're depositing SUI, we need a different coin for gas payment
  if (fullCoinType === "0x2::sui::SUI") {
    const coins = await client.getCoins({
      coinType: fullCoinType,
      owner: address,
    });

    console.log("\nAvailable SUI coins:");
    coins.data.forEach((coin) => {
      console.log(
        `Coin ID: ${coin.coinObjectId}, Balance: ${coin.balance} MIST (${
          Number(coin.balance) / 1_000_000_000
        } SUI)`
      );
    });
    console.log(
      `Required gas budget: ${GAS_BUDGET} MIST (${
        Number(GAS_BUDGET) / 1_000_000_000
      } SUI)\n`
    );

    // Find a coin with sufficient balance for gas
    const gasCoin = coins.data.find(
      (coin) => BigInt(coin.balance) >= BigInt(GAS_BUDGET)
    );
    if (!gasCoin) {
      throw new Error(
        "No SUI coins found with sufficient balance for gas payment"
      );
    }

    // Use the other coin for deposit
    const depositCoin = coins.data.find(
      (coin) => coin.coinObjectId !== gasCoin.coinObjectId
    );
    if (!depositCoin) {
      throw new Error("No other SUI coins found for deposit");
    }

    // Split the deposit coin if needed
    const [splitCoin] = tx.splitCoins(tx.object(depositCoin.coinObjectId), [
      amount,
    ]);

    tx.setGasPayment([
      {
        digest: gasCoin.digest,
        objectId: gasCoin.coinObjectId,
        version: gasCoin.version,
      },
    ]);

    tx.moveCall({
      arguments: [
        tx.object(gatewayObject),
        splitCoin,
        tx.pure.string(receiver),
      ],
      target: `${gatewayPackage}::gateway::deposit`,
      typeArguments: [fullCoinType],
    });
  } else {
    // For non-SUI coins, we need to use SUI for gas payment
    const suiCoins = await client.getCoins({
      coinType: "0x2::sui::SUI",
      owner: address,
    });

    console.log("\nAvailable SUI coins for gas:");
    suiCoins.data.forEach((coin) => {
      console.log(
        `Coin ID: ${coin.coinObjectId}, Balance: ${coin.balance} MIST (${
          Number(coin.balance) / 1_000_000_000
        } SUI)`
      );
    });
    console.log(
      `Required gas budget: ${GAS_BUDGET} MIST (${
        Number(GAS_BUDGET) / 1_000_000_000
      } SUI)\n`
    );

    // Find a SUI coin with sufficient balance for gas
    const gasCoin = suiCoins.data.find(
      (coin) => BigInt(coin.balance) >= BigInt(GAS_BUDGET)
    );
    if (!gasCoin) {
      throw new Error(
        "No SUI coins found with sufficient balance for gas payment"
      );
    }

    tx.setGasPayment([
      {
        digest: gasCoin.digest,
        objectId: gasCoin.coinObjectId,
        version: gasCoin.version,
      },
    ]);

    // Split the coin for deposit
    const [splitCoin] = tx.splitCoins(tx.object(coinObjectId), [amount]);

    tx.moveCall({
      arguments: [
        tx.object(gatewayObject),
        splitCoin,
        tx.pure.string(receiver),
      ],
      target: `${gatewayPackage}::gateway::deposit`,
      typeArguments: [fullCoinType],
    });
  }

  tx.setGasBudget(GAS_BUDGET);

  const result = await client.signAndExecuteTransaction({
    options: {
      showEffects: true,
      showEvents: true,
      showObjectChanges: true,
    },
    requestType: "WaitForLocalExecution",
    signer: keypair,
    transaction: tx,
  });

  if (result.effects?.status.status === "failure") {
    console.error("Transaction failed:", result.effects.status.error);
    return;
  }

  const event = result.events?.find((evt) =>
    evt.type.includes("gateway::DepositEvent")
  );
  if (event) {
    console.log("Event:", event.parsedJson);
  } else {
    console.log("No Deposit Event found.");
    console.log("Transaction result:", JSON.stringify(result, null, 2));
  }
};

export const depositCommand = new Command("deposit")
  .description("Deposit tokens from Sui")
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
  .requiredOption("--amount <amount>", "Amount to deposit")
  .option("--coin-type <coinType>", "Coin type to deposit")
  .option("--network <network>", "Network to use", "testnet")
  .action(main);
