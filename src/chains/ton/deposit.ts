import { toNano, TonClient } from "@ton/ton";
import { Gateway } from "@zetachain/protocol-contracts-ton/dist/wrappers";

import { tonOptions } from "../../../types/ton.types";
import {
  getGatewayAddress,
  getWalletAndKeyPair,
} from "../../../utils/ton.command.helpers";

type tonDepositParams = {
  amount: string;
  receiver: string;
};

export const tonDeposit = async (
  params: tonDepositParams,
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

  await gateway.sendDeposit(sender, toNano(params.amount), params.receiver);
};
