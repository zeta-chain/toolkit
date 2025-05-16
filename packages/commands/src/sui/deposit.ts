import { getFullnodeUrl, SuiClient } from "@mysten/sui/client";
import { Transaction } from "@mysten/sui/transactions";
import { Ed25519Keypair } from "@mysten/sui/keypairs/ed25519";
import { Command, Option } from "commander";
import { z } from "zod";

import {
  GAS_BUDGET,
  getCoin,
  getKeypairFromMnemonic,
  getKeypairFromPrivateKey,
} from "../../../../utils/sui";
import { DEFAULT_ACCOUNT_NAME } from "../../../../types/shared.constants";
import { SuiAccountData } from "../../../../types/accounts.types";
import { getAccountData } from "../../../../utils/accounts";
// Convert decimal amount to smallest unit (e.g., SUI to MIST)
const toSmallestUnit = (amount: string, decimals = 9): bigint => {
  if (!/^\d+(\.\d+)?$/.test(amount)) {
    throw new Error("Invalid decimal amount");
  }
  const [whole = "0", fraction = ""] = amount.split(".");
  const paddedFraction = (fraction + "0".repeat(decimals)).slice(0, decimals);
  return BigInt(whole) * BigInt(10 ** decimals) + BigInt(paddedFraction);
};

const depositOptionsSchema = z
  .object({
    amount: z.string(),
    coinType: z.string().optional(),
    gasBudget: z.string(),
    gatewayObject: z.string(),
    gatewayPackage: z.string(),
    mnemonic: z.string().optional(),
    network: z.enum(["localnet", "testnet", "mainnet"]),
    privateKey: z.string().optional(),
    receiver: z.string(),
    name: z.string().optional(),
  })
  .refine((data) => data.mnemonic || data.privateKey || data.name, {
    message: "Either mnemonic, private key or name must be provided",
  });

export type DepositOptions = z.infer<typeof depositOptionsSchema>;

const main = async (options: DepositOptions) => {
  const client = new SuiClient({ url: getFullnodeUrl(options.network) });

  // Convert gas budget to BigInt or use default
  const gasBudgetValue = BigInt(options.gasBudget);

  if (!options.gatewayObject || !options.gatewayPackage) {
    throw new Error(
      "Gateway object ID and module ID must be provided either as parameters or in localnet.json"
    );
  }

  let keypair: Ed25519Keypair;

  if (options.mnemonic) {
    keypair = getKeypairFromMnemonic(options.mnemonic);
  } else if (options.privateKey) {
    keypair = getKeypairFromPrivateKey(options.privateKey);
  } else if (options.name) {
    const account = getAccountData<SuiAccountData>("sui", options.name);
    if (!account?.privateKey) {
      throw new Error("No private key found for the specified account");
    }
    keypair = getKeypairFromPrivateKey(account.privateKey);
  } else {
    throw new Error("Either mnemonic or private key must be provided");
  }

  const address = keypair.toSuiAddress();

  const fullCoinType = options.coinType || "0x2::sui::SUI";
  console.log(`Using Coin Type: ${fullCoinType}`);

  // Convert amount to smallest unit (e.g., SUI to MIST)
  const amountInSmallestUnit = toSmallestUnit(options.amount);
  console.log(`Amount in smallest unit: ${amountInSmallestUnit}`);

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
      `Required gas budget: ${gasBudgetValue} MIST (${
        Number(gasBudgetValue) / 1_000_000_000
      } SUI)\n`
    );

    // Find a coin with sufficient balance for gas
    const gasCoin = coins.data.find(
      (coin) => BigInt(coin.balance) >= gasBudgetValue
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
      amountInSmallestUnit,
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
        tx.object(options.gatewayObject),
        splitCoin,
        tx.pure.string(options.receiver),
      ],
      target: `${options.gatewayPackage}::gateway::deposit`,
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
      `Required gas budget: ${gasBudgetValue} MIST (${
        Number(gasBudgetValue) / 1_000_000_000
      } SUI)\n`
    );

    // Find a SUI coin with sufficient balance for gas
    const gasCoin = suiCoins.data.find(
      (coin) => BigInt(coin.balance) >= gasBudgetValue
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
    const [splitCoin] = tx.splitCoins(tx.object(coinObjectId), [
      amountInSmallestUnit,
    ]);

    tx.moveCall({
      arguments: [
        tx.object(options.gatewayObject),
        splitCoin,
        tx.pure.string(options.receiver),
      ],
      target: `${options.gatewayPackage}::gateway::deposit`,
      typeArguments: [fullCoinType],
    });
  }

  tx.setGasBudget(gasBudgetValue);

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

  console.log("\nTransaction successful!");
  console.log(`Transaction hash: ${result.digest}`);

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
  .requiredOption("--amount <amount>", "Amount to deposit in decimal format")
  .option("--coin-type <coinType>", "Coin type to deposit")
  .option("--network <network>", "Network to use", "testnet")
  .option(
    "--gas-budget <gasBudget>",
    "Gas budget in MIST",
    GAS_BUDGET.toString()
  )
  .addOption(
    new Option("--name <name>", "Account name")
      .default(DEFAULT_ACCOUNT_NAME)
      .conflicts(["private-key"])
  )
  .action(async (options) => {
    const validatedOptions = depositOptionsSchema.parse(options);
    await main(validatedOptions);
  });
