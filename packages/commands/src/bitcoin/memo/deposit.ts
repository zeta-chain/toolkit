import { Command, Option } from "commander";
import { handleError } from "utils";
import { z } from "zod";

import { memoDepositOptionsSchema } from "../../../../../types/bitcoin.types";
import {
  addCommonOptions,
  broadcastBtcTransaction,
  constructMemo,
  displayAndConfirmMemoTransaction,
  fetchUtxos,
  setupBitcoinKeyPair,
} from "../../../../../utils/bitcoin.command.helpers";
import { safeParseBitcoinAmount } from "../../../../../utils/bitcoin.helpers";
import {
  bitcoinMakeTransactionWithMemo,
  getDepositFee,
} from "../../../../../utils/bitcoinMemo.helpers";
import { validateAndParseSchema } from "../../../../../utils/validateAndParseSchema";

type DepositOptions = z.infer<typeof memoDepositOptionsSchema>;

const main = async (options: DepositOptions) => {
  try {
    const { key, address } = setupBitcoinKeyPair(
      options.privateKey,
      options.name
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
      memo || ""
    );

    const tx = await bitcoinMakeTransactionWithMemo({
      address,
      amount,
      api: options.bitcoinApi,
      depositFee,
      gateway: options.gateway,
      key,
      memo,
      networkFee,
      utxos,
    });
    const txid = await broadcastBtcTransaction(tx, options.bitcoinApi);
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
export const depositCommand = new Command()
  .name("deposit")
  .description("Deposit BTC to ZetaChain")
  .requiredOption("-r, --receiver <address>", "ZetaChain receiver address")
  .requiredOption(
    "-g, --gateway <address>",
    "Bitcoin gateway (TSS) address",
    "tb1qy9pqmk2pd9sv63g27jt8r657wy0d9ueeh0nqur"
  )
  .requiredOption("--amount <btcAmount>", "BTC amount to send (in BTC)")
  .addOption(new Option("--data <data>", "Pass raw data"))
  .option("--network-fee <fee>", "Network fee (in sats)", "1750")
  .action(async (opts) => {
    const validated = validateAndParseSchema(opts, memoDepositOptionsSchema, {
      exitOnError: true,
    });
    await main(validated);
  });

addCommonOptions(depositCommand);
