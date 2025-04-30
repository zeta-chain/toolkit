import { getFullnodeUrl, SuiClient } from "@mysten/sui/client";
import { Transaction } from "@mysten/sui/transactions";
import { Command } from "commander";
import { z } from "zod";

import {
  GAS_BUDGET,
  getCoin,
  getKeypairFromMnemonic,
} from "../../../../utils/sui";

const depositOptionsSchema = z.object({
  amount: z.string(),
  coinType: z.string().optional(),
  gatewayObject: z.string(),
  gatewayPackage: z.string(),
  mnemonic: z.string(),
  receiver: z.string(),
});

export type DepositOptions = z.infer<typeof depositOptionsSchema>;

const main = async (options: DepositOptions) => {
  const {
    mnemonic,
    gatewayObject,
    gatewayPackage,
    receiver,
    amount,
    coinType,
  } = options;
  const client = new SuiClient({ url: getFullnodeUrl("localnet") });

  if (!gatewayObject || !gatewayPackage) {
    throw new Error(
      "Gateway object ID and module ID must be provided either as parameters or in localnet.json"
    );
  }

  const keypair = getKeypairFromMnemonic(mnemonic);
  const address = keypair.toSuiAddress();

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
  const splittedCoin = tx.splitCoins(tx.object(coinObjectId), [amount]);

  // If we're depositing SUI, we need a different coin for gas payment
  if (fullCoinType === "0x2::sui::SUI") {
    const coins = await client.getCoins({
      coinType: fullCoinType,
      owner: address,
    });

    // Find a different SUI coin for gas payment
    const gasCoin = coins.data.find(
      (coin) => coin.coinObjectId !== coinObjectId
    );
    if (!gasCoin) {
      throw new Error("No other SUI coins found for gas payment");
    }

    tx.setGasPayment([
      {
        digest: gasCoin.digest,
        objectId: gasCoin.coinObjectId,
        version: gasCoin.version,
      },
    ]);
  } else {
    // For non-SUI coins, we need to use SUI for gas payment
    const suiCoins = await client.getCoins({
      coinType: "0x2::sui::SUI",
      owner: address,
    });
    if (!suiCoins.data.length) {
      throw new Error("No SUI coins found for gas payment");
    }
    tx.setGasPayment([
      {
        digest: suiCoins.data[0].digest,
        objectId: suiCoins.data[0].coinObjectId,
        version: suiCoins.data[0].version,
      },
    ]);
  }

  tx.moveCall({
    arguments: [
      tx.object(gatewayObject),
      splittedCoin,
      tx.pure.string(receiver),
    ],
    target: `${gatewayPackage}::gateway::deposit`,
    typeArguments: [fullCoinType],
  });

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
  .requiredOption("--mnemonic <mnemonic>", "Mnemonic for the account")
  .requiredOption("--gateway-object <gatewayObject>", "Gateway object ID")
  .requiredOption("--gateway-package <gatewayPackage>", "Gateway package ID")
  .requiredOption("--receiver <receiver>", "Receiver address on ZetaChain")
  .requiredOption("--amount <amount>", "Amount to deposit")
  .option("--coin-type <coinType>", "Coin type to deposit")
  .action(main);
