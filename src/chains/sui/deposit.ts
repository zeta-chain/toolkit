import { Transaction } from "@mysten/sui/transactions";
import { z } from "zod";

import {
  GAS_BUDGET,
  getCoin,
  getSuiGatewayAndClient,
  signAndExecuteTransaction,
  SUI_GAS_COIN_TYPE,
  toSmallestUnit,
} from "../../../utils/sui";
import { suiDepositParamsSchema, suiOptionsSchema } from "../../schemas/sui";

type suiDepositParams = z.infer<typeof suiDepositParamsSchema>;
type suiOptions = z.infer<typeof suiOptionsSchema>;

/**
 * Deposits tokens from Sui to ZetaChain.
 *
 * This function allows you to transfer tokens from Sui to ZetaChain.
 * It supports both native SUI and other coin types. The function automatically
 * handles coin splitting and transaction construction.
 *
 * @param params - The deposit parameters including amount, receiver, and optional coin type
 * @param options - Configuration options including chain ID, gas limit, gateway settings, and signer
 * @returns Promise that resolves when the transaction is executed
 */
export const suiDeposit = async (
  params: suiDepositParams,
  options: suiOptions
) => {
  const { gatewayPackage, gatewayObject, client } = getSuiGatewayAndClient(
    options.chainId,
    options.gatewayPackage,
    options.gatewayObject
  );

  const gasBudget = BigInt(options.gasLimit || GAS_BUDGET);
  const tx = new Transaction();

  const target = `${gatewayPackage}::gateway::deposit`;
  const receiver = tx.pure.string(params.receiver);
  const gateway = tx.object(gatewayObject);

  if (params.token && params.token !== SUI_GAS_COIN_TYPE) {
    const coinObjectId = await getCoin(
      client,
      options.signer.toSuiAddress(),
      params.token
    );

    const [splitCoin] = tx.splitCoins(tx.object(coinObjectId), [
      toSmallestUnit(params.amount),
    ]);

    tx.moveCall({
      arguments: [gateway, splitCoin, receiver],
      target,
      typeArguments: [params.token],
    });
  } else {
    const [splitCoin] = tx.splitCoins(tx.gas, [toSmallestUnit(params.amount)]);

    tx.moveCall({
      arguments: [gateway, splitCoin, receiver],
      target,
      typeArguments: ["0x2::sui::SUI"],
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
