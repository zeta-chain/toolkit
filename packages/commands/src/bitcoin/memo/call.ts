import * as bitcoin from "bitcoinjs-lib";
import { z } from "zod";

import { memoCallOptionsSchema } from "../../../../../types/bitcoin.types";
import { handleError } from "../../../../../utils";
import {
  broadcastBtcTransaction,
  createBitcoinMemoCommandWithCommonOptions,
  displayAndConfirmMemoTransaction,
  setupBitcoinKeyPair,
} from "../../../../../utils/bitcoin.command.helpers";
import {
  bitcoinBuildUnsignedPsbtWithMemo,
  bitcoinSignAndFinalizeTransactionWithMemo,
  constructMemo,
  getDepositFee,
} from "../../../../../utils/bitcoin.memo.helpers";
import { fetchUtxos } from "../../../../../utils/bitcoin.utxo.helpers";
import { validateAndParseSchema } from "../../../../../utils/validateAndParseSchema";

type CallOptions = z.infer<typeof memoCallOptionsSchema>;

/**
 * Main function that executes the call operation.
 * Creates and broadcasts both commit and reveal transactions to perform a cross-chain call.
 *
 * @param options - Command options including amounts, addresses, and contract parameters
 */
const main = async (options: CallOptions) => {
  try {
    const network =
      options.network === "signet"
        ? bitcoin.networks.testnet
        : bitcoin.networks.bitcoin;

    const { key, address } = setupBitcoinKeyPair(
      options.privateKey,
      options.name,
      network
    );
    const utxos = await fetchUtxos(address, options.bitcoinApi);

    const memo = constructMemo(options.receiver, options.data);

    const amount = 0;
    const networkFee = Number(options.networkFee);
    const depositFee = await getDepositFee(options.gasPriceApi);

    await displayAndConfirmMemoTransaction(
      amount,
      networkFee,
      depositFee,
      options.gateway,
      address,
      memo || "",
      options.network
    );

    const { psbt, pickedUtxos } = await bitcoinBuildUnsignedPsbtWithMemo({
      address,
      amount,
      api: options.bitcoinApi,
      depositFee,
      gateway: options.gateway,
      memo,
      network: options.network,
      networkFee,
      utxos,
    });

    const signedPsbt = bitcoinSignAndFinalizeTransactionWithMemo({
      key,
      pickedUtxos,
      psbt,
    });

    const txid = await broadcastBtcTransaction(signedPsbt, options.bitcoinApi);
    console.log(`Transaction hash: ${txid}`);
  } catch (error) {
    handleError({
      context: "Error making a Bitcoin memo call",
      error,
      shouldThrow: false,
    });
    process.exit(1);
  }
};

/**
 * Command definition for call
 * This allows users to call contracts on ZetaChain
 */
export const callCommand = createBitcoinMemoCommandWithCommonOptions("call")
  .summary("Call a contract on ZetaChain")
  .action(async (opts) => {
    const validated = validateAndParseSchema(opts, memoCallOptionsSchema, {
      exitOnError: true,
    });
    await main(validated);
  });
