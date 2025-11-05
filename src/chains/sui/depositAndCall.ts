import { Transaction } from "@mysten/sui/transactions";
import { AbiCoder, ethers } from "ethers";
import { z } from "zod";

import {
  chainIds,
  GAS_BUDGET,
  getCoin,
  getSuiGatewayAndClient,
  signAndExecuteTransaction,
  toSmallestUnit,
} from "../../../utils/sui";
import { validateAndParseSchema } from "../../../utils/validateAndParseSchema";
import {
  suiBrowserOptionsSchema,
  suiDepositAndCallParamsSchema,
  suiOptionsSchema,
} from "../../schemas/sui";

type suiDepositAndCallParams = z.infer<typeof suiDepositAndCallParamsSchema>;
type suiOptions = z.infer<typeof suiOptionsSchema>;
type suiBrowserOptions = z.infer<typeof suiBrowserOptionsSchema>;

/**
 * Builds a Sui deposit and call transaction (shared logic for CLI and browser).
 *
 * @internal
 * @param validatedParams - Validated deposit and call parameters
 * @param validatedOptions - Validated options (either CLI or browser)
 * @param signerAddress - Optional signer address (required for non-native tokens)
 * @returns Object containing the SuiClient and unsigned Transaction
 */
const buildSuiDepositAndCallTransaction = async (
  validatedParams: z.infer<typeof suiDepositAndCallParamsSchema>,
  validatedOptions: {
    chainId: (typeof chainIds)[number];
    gasLimit?: string;
    gatewayObject?: string;
    gatewayPackage?: string;
  },
  signerAddress?: string
): Promise<{
  client: ReturnType<typeof getSuiGatewayAndClient>["client"];
  transaction: Transaction;
}> => {
  const { gatewayPackage, gatewayObject, client } = getSuiGatewayAndClient(
    validatedOptions.chainId,
    validatedOptions.gatewayPackage,
    validatedOptions.gatewayObject
  );

  const gasBudget = BigInt(validatedOptions.gasLimit || GAS_BUDGET);
  const tx = new Transaction();
  const abiCoder = AbiCoder.defaultAbiCoder();
  const payloadABI = abiCoder.encode(
    validatedParams.types,
    validatedParams.values
  );
  const payloadBytes = ethers.getBytes(payloadABI);

  const target = `${gatewayPackage}::gateway::deposit_and_call`;
  const gateway = tx.object(gatewayObject);
  const receiver = tx.pure.string(validatedParams.receiver);
  const payload = tx.pure.vector("u8", payloadBytes);

  if (!validatedParams.token || validatedParams.token === "0x2::sui::SUI") {
    // Native SUI transfer - no need for signerAddress
    const [splitCoin] = tx.splitCoins(tx.gas, [
      toSmallestUnit(validatedParams.amount),
    ]);

    tx.moveCall({
      arguments: [gateway, splitCoin, receiver, payload],
      target,
      typeArguments: ["0x2::sui::SUI"],
    });
  } else {
    // Non-native token transfer - requires signerAddress
    if (!signerAddress) {
      throw new Error(
        "signerAddress is required when transferring non-native tokens"
      );
    }

    const coinObjectId = await getCoin(
      client,
      signerAddress,
      validatedParams.token
    );

    const [splitCoin] = tx.splitCoins(tx.object(coinObjectId), [
      toSmallestUnit(validatedParams.amount),
    ]);

    tx.moveCall({
      arguments: [gateway, splitCoin, receiver, payload],
      target,
      typeArguments: [validatedParams.token],
    });
  }

  tx.setGasBudget(gasBudget);

  return { client, transaction: tx };
};

/**
 * Deposits tokens and makes a cross-chain call from Sui to a universal contract on ZetaChain.
 *
 * This function combines token deposit with a contract call in a single transaction.
 * It allows you to transfer tokens from Sui to ZetaChain and immediately
 * execute a function call on the universal contract. Supports both native SUI
 * and other coin types.
 *
 * @param params - The deposit and call parameters including amount, receiver, coin type, function types/values
 * @param options - Configuration options including chain ID, gas limit, gateway settings, and signer
 * @returns Promise that resolves when the transaction is executed
 */
export const suiDepositAndCall = async (
  params: suiDepositAndCallParams,
  options: suiOptions
) => {
  const validatedParams = validateAndParseSchema(
    params,
    suiDepositAndCallParamsSchema
  );
  const validatedOptions = validateAndParseSchema(options, suiOptionsSchema);

  const { client, transaction } = await buildSuiDepositAndCallTransaction(
    validatedParams,
    validatedOptions,
    validatedOptions.signer.toSuiAddress()
  );

  const gasBudget = BigInt(validatedOptions.gasLimit || GAS_BUDGET);

  await signAndExecuteTransaction({
    client,
    gasBudget,
    keypair: validatedOptions.signer,
    tx: transaction,
  });
};

/**
 * Prepares a Sui deposit and call transaction for browser wallet signing.
 *
 * This function is designed for browser environments where wallet adapters
 * (like Slush, Sui Wallet, etc.) handle transaction signing. It builds the
 * same transaction as suiDepositAndCall but returns the unsigned Transaction
 * object instead of executing it.
 *
 * @param params - The deposit and call parameters including amount, receiver, coin type, function types/values
 * @param options - Configuration options including chain ID, gas limit, gateway settings, and optional signer address
 * @returns Object containing the unsigned Transaction and SuiClient
 *
 * @example
 * ```typescript
 * // In a browser with wallet adapter
 * const { transaction, client } = await prepareSuiDepositAndCall(
 *   {
 *     amount: "0.1",
 *     receiver: "0x123...",
 *     types: ["string"],
 *     values: ["hello"]
 *   },
 *   {
 *     chainId: "105",
 *     signerAddress: "0xabc..." // Current wallet address
 *   }
 * );
 *
 * // Sign and execute with wallet adapter
 * const result = await walletAdapter.signAndExecuteTransaction({
 *   transaction,
 *   options: { showEffects: true }
 * });
 * ```
 */
export const prepareSuiDepositAndCall = async (
  params: suiDepositAndCallParams,
  options: suiBrowserOptions
): Promise<{
  client: ReturnType<typeof getSuiGatewayAndClient>["client"];
  transaction: Transaction;
}> => {
  const validatedParams = validateAndParseSchema(
    params,
    suiDepositAndCallParamsSchema
  );
  const validatedOptions = validateAndParseSchema(
    options,
    suiBrowserOptionsSchema
  );

  const { client, transaction } = await buildSuiDepositAndCallTransaction(
    validatedParams,
    validatedOptions,
    validatedOptions.signerAddress
  );

  return { client, transaction };
};
