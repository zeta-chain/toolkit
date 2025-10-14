import * as bitcoin from "bitcoinjs-lib";
import { z } from "zod";

import { memoDepositAndCallOptionsSchema } from "../../../../../types/bitcoin.types";
import { handleError } from "../../../../../utils";
import {
  broadcastBtcTransaction,
  createBitcoinMemoCommandWithCommonOptions,
  displayAndConfirmMemoTransaction,
  setupBitcoinKeyPair,
} from "../../../../../utils/bitcoin.command.helpers";
import { safeParseBitcoinAmount } from "../../../../../utils/bitcoin.inscription.helpers";
import {
  bitcoinBuildUnsignedPsbtWithMemo,
  bitcoinSignAndFinalizeTransactionWithMemo,
  constructMemo,
  getDepositFee,
} from "../../../../../utils/bitcoin.memo.helpers";
import { fetchUtxos } from "../../../../../utils/bitcoin.utxo.helpers";
import { validateAndParseSchema } from "../../../../../utils/validateAndParseSchema";

type DepositAndCallOptions = z.infer<typeof memoDepositAndCallOptionsSchema>;

/**
 * Main function that executes the deposit-and-call operation.
 * Creates and broadcasts both commit and reveal transactions to perform a cross-chain call.
 *
 * @param options - Command options including amounts, addresses, and contract parameters
 */
const main = async (options: DepositAndCallOptions) => {
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

    const amount = safeParseBitcoinAmount(options.amount);
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
      context: "Error making a Bitcoin memo deposit and call",
      error,
      shouldThrow: false,
    });
    process.exit(1);
  }
};

/**
 * Command definition for deposit-and-call
 * This allows users to deposit BTC and call a contract on ZetaChain using Bitcoin inscriptions
 */
export const depositAndCallCommand = createBitcoinMemoCommandWithCommonOptions(
  "deposit-and-call"
)
  .summary("Deposit BTC and call a contract on ZetaChain")
  .requiredOption("-a, --amount <btcAmount>", "BTC amount to send (in BTC)")
  .action(async (opts) => {
    const validated = validateAndParseSchema(
      opts,
      memoDepositAndCallOptionsSchema,
      {
        exitOnError: true,
      }
    );
    await main(validated);
  });
