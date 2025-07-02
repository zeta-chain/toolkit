import { beginCell, toNano } from "@ton/core";
import { stringToCell } from "@ton/core/dist/boc/utils/strings";
import { TonClient } from "@ton/ton";
import { Gateway } from "@zetachain/protocol-contracts-ton/dist/wrappers";
import { AbiCoder, ethers } from "ethers";
import { z } from "zod";

import {
  getGatewayAddress,
  getWalletAndKeyPair,
} from "../../../utils/ton.command.helpers";
import {
  tonDepositAndCallParamsSchema,
  tonOptionsSchema,
} from "../../schemas/ton";

type tonDepositAndCallParams = z.infer<typeof tonDepositAndCallParamsSchema>;
type tonOptions = z.infer<typeof tonOptionsSchema>;

/**
 * Deposits tokens and makes a cross-chain call from TON to a universal contract on ZetaChain.
 *
 * This function combines token deposit with a contract call in a single transaction.
 * It allows you to transfer TON tokens from TON blockchain to ZetaChain and immediately
 * execute a function call on the universal contract.
 *
 * You can provide either:
 * - `data`: Raw data string for non-EVM chains
 * - `types` and `values`: For EVM chains, to encode function parameters
 *
 * @param params - The deposit and call parameters including amount, receiver, and call data
 * @param options - Configuration options including chain ID, RPC endpoint, wallet, and API key
 * @returns Promise that resolves when the transaction is sent
 */
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
