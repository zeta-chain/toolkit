import { toNano, TonClient } from "@ton/ton";
import { Gateway } from "@zetachain/protocol-contracts-ton/dist/wrappers";
import { z } from "zod";

import {
  getGatewayAddress,
  getWalletAndKeyPair,
} from "../../../utils/ton.command.helpers";
import { validateAndParseSchema } from "../../../utils/validateAndParseSchema";
import { tonDepositParamsSchema, tonOptionsSchema } from "../../schemas/ton";

type tonDepositParams = z.infer<typeof tonDepositParamsSchema>;
type tonOptions = z.infer<typeof tonOptionsSchema>;

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
  const validatedParams = validateAndParseSchema(
    params,
    tonDepositParamsSchema
  );
  const validatedOptions = validateAndParseSchema(options, tonOptionsSchema);

  const gatewayAddress = getGatewayAddress(
    validatedOptions.chainId,
    validatedOptions.gateway
  );

  const { wallet, keyPair } = await getWalletAndKeyPair(
    validatedOptions.wallet,
    validatedOptions.keyPair,
    validatedOptions.signer
  );

  const client = new TonClient({
    endpoint: validatedOptions.rpc,
    ...(validatedOptions.apiKey && { apiKey: validatedOptions.apiKey }),
  });

  const openedWallet = client.open(wallet);
  const sender = openedWallet.sender(keyPair.secretKey);

  const gateway = client.open(Gateway.createFromAddress(gatewayAddress));

  await gateway.sendDeposit(
    sender,
    toNano(validatedParams.amount),
    validatedParams.receiver
  );
};
