import { Command, Option } from "commander";
import { ethers } from "ethers";
import { z } from "zod";

import { BITCOIN_LIMITS } from "../../../../types/bitcoin.constants";
import { depositAndCallOptionsSchema } from "../../../../types/bitcoin.types";
import {
  addCommonOptions,
  broadcastBtcTransaction,
  createAndBroadcastTransactions,
  displayAndConfirmTransaction,
  fetchUtxos,
  setupBitcoinKeyPair,
} from "../../../../utils/bitcoin.command.helpers";
import { calculateFees } from "../../../../utils/bitcoin.helpers";
import {
  bitcoinEncode,
  EncodingFormat,
  OpCode,
  trimOx,
} from "../../../../utils/bitcoinEncode";
import { bitcoinMakeTransactionWithMemo } from "../../../../utils/bitcoinMemo.helpers";
import { validateAndParseSchema } from "../../../../utils/validateAndParseSchema";

type DepositAndCallOptions = z.infer<typeof depositAndCallOptionsSchema>;

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
  const utxos = await fetchUtxos(address, options.api);
  if (options.method === "inscription") {
    let data;
    let payload;
    if (
      options.types &&
      options.values &&
      options.receiver &&
      options.revertAddress
    ) {
      // Encode contract call data for inscription
      payload = new ethers.AbiCoder().encode(options.types, options.values);
      data = Buffer.from(
        bitcoinEncode(
          options.receiver,
          Buffer.from(trimOx(payload), "hex"),
          options.revertAddress,
          OpCode.DepositAndCall,
          EncodingFormat.EncodingFmtABI
        ),
        "hex"
      );
    } else if (options.data) {
      data = Buffer.from(options.data, "hex");
    } else {
      throw new Error(
        "Provide either data or types, values, receiver, and revert address"
      );
    }

    const amount =
      BITCOIN_LIMITS.MIN_COMMIT_AMOUNT + BITCOIN_LIMITS.ESTIMATED_REVEAL_FEE;

    const { commitFee, revealFee, totalFee } = calculateFees(data);

    // Display transaction information and confirm
    await displayAndConfirmTransaction({
      amount: options.amount,
      commitFee,
      encodedMessage: payload,
      encodingFormat: "ABI",
      gateway: options.gateway,
      network: "Signet",
      operation: "DepositAndCall",
      rawInscriptionData: data.toString("hex"),
      receiver: options.receiver,
      revealFee,
      revertAddress: options.revertAddress,
      sender: address,
      totalFee,
    });

    await createAndBroadcastTransactions(
      key,
      utxos,
      address,
      data,
      options.api,
      amount,
      options.gateway
    );
  } else if (options.method === "memo") {
    const memo = options.data?.startsWith("0x")
      ? options.data.slice(2)
      : options.data;
    const tx = await bitcoinMakeTransactionWithMemo(
      options.gateway,
      key,
      BITCOIN_LIMITS.DUST_THRESHOLD.P2WPKH,
      utxos,
      address,
      options.api,
      memo
    );
    const txid = await broadcastBtcTransaction(tx, options.api);
    console.log(`Transaction hash: ${txid}`);
  }
};

/**
 * Command definition for deposit-and-call
 * This allows users to deposit BTC and call a contract on ZetaChain using Bitcoin inscriptions
 */
export const depositAndCallCommand = new Command()
  .name("deposit-and-call")
  .description(
    "Deposit BTC and call a contract on ZetaChain (using inscriptions)"
  )
  .option("-r, --receiver <address>", "ZetaChain receiver address")
  .requiredOption(
    "-g, --gateway <address>",
    "Bitcoin gateway (TSS) address",
    "tb1qy9pqmk2pd9sv63g27jt8r657wy0d9ueeh0nqur"
  )
  .option("-t, --types <types...>", "ABI types")
  .option("-v, --values <values...>", "Values corresponding to types")
  .option("-a, --revert-address <address>", "Revert address")
  .requiredOption("--amount <btcAmount>", "BTC amount to send (in BTC)")
  .addOption(
    new Option("--data <data>", "Pass raw data").conflicts([
      "types",
      "values",
      "revert-address",
      "receiver",
    ])
  )
  .action(async (opts) => {
    const validated = validateAndParseSchema(
      opts,
      depositAndCallOptionsSchema,
      {
        exitOnError: true,
      }
    );
    await main(validated);
  });

addCommonOptions(depositAndCallCommand);
