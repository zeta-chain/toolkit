import { Ed25519Keypair } from "@mysten/sui/keypairs/ed25519";
import { Transaction } from "@mysten/sui/transactions";
import { AbiCoder, ethers } from "ethers";

import { ParseAbiValuesReturnType } from "../../../types/parseAbiValues.types";
import {
  chainIds,
  GAS_BUDGET,
  getCoin,
  getSuiGatewayAndClient,
  signAndExecuteTransaction,
  toSmallestUnit,
} from "../../../utils/sui";

type suiDepositAndCallParams = {
  amount: string;
  receiver: string;
  token?: string;
  types: string[];
  values: ParseAbiValuesReturnType;
};

type suiOptions = {
  chainId: (typeof chainIds)[number];
  gasLimit?: string;
  gatewayObject?: string;
  gatewayPackage?: string;
  signer: Ed25519Keypair;
};

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
