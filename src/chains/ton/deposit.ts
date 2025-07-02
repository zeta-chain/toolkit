import { toNano, TonClient } from "@ton/ton";
import { Gateway } from "@zetachain/protocol-contracts-ton/dist/wrappers";
import { z } from "zod";

import { tonOptions } from "../../../types/ton.types";
import {
  getGatewayAddress,
  getWalletAndKeyPair,
} from "../../../utils/ton.command.helpers";
import { tonDepositParamsSchema } from "../../schemas/ton";

type tonDepositParams = z.infer<typeof tonDepositParamsSchema>;

/**
 * Deposits tokens from TON to ZetaChain.
 *
 * This function allows you to transfer TON tokens from TON blockchain to ZetaChain.
 * It automatically handles wallet connection and transaction signing.
 *
 * @param params - The deposit parameters including amount and receiver address
 * @param options - Configuration options including chain ID, RPC endpoint, wallet, and API key
 * @returns Promise that resolves when the transaction is sent
 */
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
