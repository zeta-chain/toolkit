import { Transaction } from "@mysten/sui/transactions";
import { AbiCoder, ethers } from "ethers";
import { z } from "zod";

import {
  GAS_BUDGET,
  getCoin,
  getSuiGatewayAndClient,
  signAndExecuteTransaction,
  toSmallestUnit,
} from "../../../utils/sui";
import {
  suiDepositAndCallParamsSchema,
  suiOptionsSchema,
} from "../../schemas/sui";

type suiDepositAndCallParams = z.infer<typeof suiDepositAndCallParamsSchema>;
type suiOptions = z.infer<typeof suiOptionsSchema>;

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
  const { gatewayPackage, gatewayObject, client } = getSuiGatewayAndClient(
    options.chainId,
    options.gatewayPackage,
    options.gatewayObject
  );

  const gasBudget = BigInt(options.gasLimit || GAS_BUDGET);
  const tx = new Transaction();

  const abiCoder = AbiCoder.defaultAbiCoder();
  const payloadABI = abiCoder.encode(params.types, params.values);
  const payloadBytes = ethers.getBytes(payloadABI);

  const target = `${gatewayPackage}::gateway::deposit_and_call`;
  const gateway = tx.object(gatewayObject);
  const receiver = tx.pure.string(params.receiver);
  const payload = tx.pure.vector("u8", payloadBytes);

  if (!params.token || params.token === "0x2::sui::SUI") {
    const [splitCoin] = tx.splitCoins(tx.gas, [toSmallestUnit(params.amount)]);

    tx.moveCall({
      arguments: [gateway, splitCoin, receiver, payload],
      target,
      typeArguments: ["0x2::sui::SUI"],
    });
  } else {
    const coinObjectId = await getCoin(
      client,
      options.signer.toSuiAddress(),
      params.token
    );

    const [splitCoin] = tx.splitCoins(tx.object(coinObjectId), [
      toSmallestUnit(params.amount),
    ]);

    tx.moveCall({
      arguments: [gateway, splitCoin, receiver, payload],
      target,
      typeArguments: [params.token],
    });
  }

  tx.setGasBudget(gasBudget);

  await signAndExecuteTransaction({
    client,
    gasBudget,
    keypair: options.signer,
    tx,
  });
};
