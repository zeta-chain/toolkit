import { beginCell, toNano } from "@ton/core";
import { stringToCell } from "@ton/core/dist/boc/utils/strings";
import { TonClient } from "@ton/ton";
import { Gateway } from "@zetachain/protocol-contracts-ton/dist/wrappers";
import { AbiCoder, ethers } from "ethers";

import { ParseAbiValuesReturnType } from "../../../types/parseAbiValues.types";
import { tonOptions } from "../../../types/ton.types";
import {
  getGatewayAddress,
  getWalletAndKeyPair,
} from "../../../utils/ton.command.helpers";

type tonDepositAndCallParams = {
  amount: string;
  data?: string;
  receiver: string;
  types?: string[];
  values?: ParseAbiValuesReturnType;
};

export const tonDepositAndCall = async (
  params: tonDepositAndCallParams,
  options: tonOptions
) => {
  const gatewayAddress = getGatewayAddress(options.chainId, options.gateway);

  const { wallet, keyPair } = await getWalletAndKeyPair(
    options.wallet,
    options.keyPair,
    options.signer
  );
  const client = new TonClient({
    endpoint: options.rpc,
    ...(options.apiKey && { apiKey: options.apiKey }),
  });

  const openedWallet = client.open(wallet);
  const sender = openedWallet.sender(keyPair.secretKey);

  const gateway = client.open(Gateway.createFromAddress(gatewayAddress));

  let payload;

  if (params.types && params.values) {
    const abiCoder = AbiCoder.defaultAbiCoder();
    const encodedHex = abiCoder.encode(params.types, params.values);
    const encodedBin = ethers.getBytes(encodedHex);

    payload = beginCell().storeBuffer(Buffer.from(encodedBin)).endCell();
  } else if (params.data) {
    payload = stringToCell(params.data);
  } else {
    throw new Error("Either types and values or data must be provided");
  }

  await gateway.sendDepositAndCall(
    sender,
    toNano(params.amount),
    params.receiver,
    payload
  );
};
