import * as bitcoin from "bitcoinjs-lib";
import { z } from "zod";

import { memoDepositOptionsSchema } from "../../../../../types/bitcoin.types";
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

type DepositOptions = z.infer<typeof memoDepositOptionsSchema>;

const main = async (options: DepositOptions) => {
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

    const memo = constructMemo(options.receiver);

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
      context: "Error making a Bitcoin memo deposit",
      error,
      shouldThrow: false,
    });
    process.exit(1);
  }
};

/**
 * Command definition for deposit
 * This allows users to deposit BTC to EOAs and contracts on ZetaChain
 */
export const depositCommand = createBitcoinMemoCommandWithCommonOptions(
  "deposit"
)
  .summary("Deposit BTC to ZetaChain")
  .requiredOption("-a, --amount <btcAmount>", "BTC amount to send (in BTC)")
  .action(async (opts) => {
    const validated = validateAndParseSchema(opts, memoDepositOptionsSchema, {
      exitOnError: true,
    });
    await main(validated);
  });
