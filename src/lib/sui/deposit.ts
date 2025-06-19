import { getFullnodeUrl, SuiClient } from "@mysten/sui/client";
import { Ed25519Keypair } from "@mysten/sui/keypairs/ed25519";
import { Transaction } from "@mysten/sui/transactions";

import {
  chainIds,
  GAS_BUDGET,
  getCoin,
  networks,
  signAndExecuteTransaction,
  SUI_GAS_COIN_TYPE,
  toSmallestUnit,
} from "../../../utils/sui";
import { getAddress } from "../../../utils/getAddress";

type suiDepositParams = {
  amount: string;
  receiver: string;
  token?: string;
};

type suiOptions = {
  chainId: (typeof chainIds)[number];
  gasLimit?: string;
  gatewayObject?: string;
  gatewayPackage?: string;
  signer: Ed25519Keypair;
};

export const suiDeposit = async (
  params: suiDepositParams,
  options: suiOptions
) => {
  const gatewayAddress = getAddress("gateway", Number(options.chainId));
  if (!gatewayAddress) {
    throw new Error("Gateway address not found");
  }
  const gatewayPackage = options.gatewayPackage || gatewayAddress.split(",")[0];
  const gatewayObject = options.gatewayObject || gatewayAddress.split(",")[1];
  const network = networks[chainIds.indexOf(options.chainId)];
  const client = new SuiClient({ url: getFullnodeUrl(network) });
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
