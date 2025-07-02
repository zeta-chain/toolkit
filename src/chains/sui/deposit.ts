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
import { validateAndParseSchema } from "../../../utils/validateAndParseSchema";
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
  const validatedParams = validateAndParseSchema(
    params,
    suiDepositParamsSchema
  );
  const validatedOptions = validateAndParseSchema(options, suiOptionsSchema);

  const { gatewayPackage, gatewayObject, client } = getSuiGatewayAndClient(
    validatedOptions.chainId,
    validatedOptions.gatewayPackage,
    validatedOptions.gatewayObject
  );

  const gasBudget = BigInt(validatedOptions.gasLimit || GAS_BUDGET);
  const tx = new Transaction();

  const target = `${gatewayPackage}::gateway::deposit`;
  const receiver = tx.pure.string(validatedParams.receiver);
  const gateway = tx.object(gatewayObject);

  if (validatedParams.token && validatedParams.token !== SUI_GAS_COIN_TYPE) {
    const coinObjectId = await getCoin(
      client,
      validatedOptions.signer.toSuiAddress(),
      validatedParams.token
    );

    const [splitCoin] = tx.splitCoins(tx.object(coinObjectId), [
      toSmallestUnit(validatedParams.amount),
    ]);

    tx.moveCall({
      arguments: [gateway, splitCoin, receiver],
      target,
      typeArguments: [validatedParams.token],
    });
  } else {
    const [splitCoin] = tx.splitCoins(tx.gas, [
      toSmallestUnit(validatedParams.amount),
    ]);

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
    keypair: validatedOptions.signer,
    tx,
  });
};
