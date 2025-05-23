import { Command, Option } from "commander";
import { ethers } from "ethers";
import { z } from "zod";

import { memoDepositAndCallOptionsSchema } from "../../../../../types/bitcoin.types";
import {
  addCommonOptions,
  broadcastBtcTransaction,
  constructMemo,
  displayAndConfirmMemoTransaction,
  fetchUtxos,
  setupBitcoinKeyPair,
} from "../../../../../utils/bitcoin.command.helpers";
import {
  bitcoinMakeTransactionWithMemo,
  getDepositFee,
} from "../../../../../utils/bitcoinMemo.helpers";
import { validateAndParseSchema } from "../../../../../utils/validateAndParseSchema";

type DepositAndCallOptions = z.infer<typeof memoDepositAndCallOptionsSchema>;

/**
 * Main function that executes the deposit-and-call operation.
 * Creates and broadcasts both commit and reveal transactions to perform a cross-chain call.
 *
 * @param options - Command options including amounts, addresses, and contract parameters
 */
const main = async (options: DepositAndCallOptions) => {
  const { key, address } = setupBitcoinKeyPair(
    options.privateKey,
    options.name
  );
  const utxos = await fetchUtxos(address, options.bitcoinApi);

  const memo = constructMemo(options.receiver, options.data);

  const amount = Number(ethers.parseUnits(options.amount, 8));
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

  const tx = await bitcoinMakeTransactionWithMemo(
    options.gateway,
    key,
    amount,
    depositFee,
    networkFee,
    utxos,
    address,
    options.bitcoinApi,
    memo
  );
  const txid = await broadcastBtcTransaction(tx, options.bitcoinApi);
  console.log(`Transaction hash: ${txid}`);
};

/**
 * Command definition for deposit-and-call
 * This allows users to deposit BTC and call a contract on ZetaChain using Bitcoin inscriptions
 */
export const depositAndCallCommand = new Command()
  .name("deposit-and-call")
  .description("Deposit BTC and call a contract on ZetaChain")
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
    const validated = validateAndParseSchema(
      opts,
      memoDepositAndCallOptionsSchema,
      {
        exitOnError: true,
      }
    );
    await main(validated);
  });

addCommonOptions(depositAndCallCommand);
