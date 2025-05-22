import { Command, Option } from "commander";
import { ethers } from "ethers";
import { z } from "zod";

import {
  BITCOIN_FEES,
  BITCOIN_LIMITS,
} from "../../../../types/bitcoin.constants";
import { callOptionsSchema } from "../../../../types/bitcoin.types";
import {
  addCommonOptions,
  broadcastBtcTransaction,
  createAndBroadcastTransactions,
  displayAndConfirmMemoTransaction,
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
import {
  bitcoinMakeTransactionWithMemo,
  getDepositFee,
} from "../../../../utils/bitcoinMemo.helpers";
import { validateAndParseSchema } from "../../../../utils/validateAndParseSchema";

type CallOptions = z.infer<typeof callOptionsSchema>;

/**
 * Main function that executes the call operation.
 * Creates and broadcasts both commit and reveal transactions to perform a cross-chain call.
 *
 * @param options - Command options including amounts, addresses, and contract parameters
 */
const main = async (options: CallOptions) => {
  const { key, address } = setupBitcoinKeyPair(
    options.privateKey,
    options.name
  );
  const utxos = await fetchUtxos(address, options.bitcoinApi);

  if (options.method === "inscription") {
    let data;
    let payload;
    if (
      options.types &&
      options.values &&
      options.receiver &&
      options.revertAddress
    ) {
      payload = new ethers.AbiCoder().encode(options.types, options.values);
      data = Buffer.from(
        bitcoinEncode(
          options.receiver,
          Buffer.from(trimOx(payload), "hex"),
          options.revertAddress,
          OpCode.Call,
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

    const inscriptionFee = BITCOIN_FEES.DEFAULT_COMMIT_FEE_SAT;
    const depositFee = await getDepositFee(options.gasPriceApi);

    // await displayAndConfirmTransaction({
    //   amount: "0",
    //   inscriptionFee,
    //   depositFee,
    //   encodedMessage: payload,
    //   encodingFormat: "ABI",
    //   gateway: options.gateway,
    //   network: options.bitcoinApi,
    //   operation: "Call",
    //   rawInscriptionData: data.toString("hex"),
    //   receiver: options.receiver,
    //   revertAddress: options.revertAddress,
    //   sender: address,
    // });

    // await createAndBroadcastTransactions(
    //   key,
    //   utxos,
    //   address,
    //   data,
    //   options.bitcoinApi,
    //   depositFee,
    //   options.gateway
    // );
  } else if (options.method === "memo") {
    const memo = options.data?.startsWith("0x")
      ? options.data.slice(2)
      : options.data;

    const fee = await getDepositFee(options.gasPriceApi);
    const dust = BITCOIN_LIMITS.DUST_THRESHOLD.ZETACHAIN;
    const feeTotal = fee <= dust ? dust : fee;

    await displayAndConfirmMemoTransaction(
      0,
      feeTotal,
      options.gateway,
      address,
      memo || ""
    );

    const tx = await bitcoinMakeTransactionWithMemo(
      options.gateway,
      key,
      0,
      feeTotal,
      utxos,
      address,
      options.bitcoinApi,
      memo
    );
    const txid = await broadcastBtcTransaction(tx, options.bitcoinApi);
    console.log(`Transaction hash: ${txid}`);
  }
};

/**
 * Command definition for call
 * This allows users to call contracts on ZetaChain
 */
export const callCommand = new Command()
  .name("call")
  .description("Call a contract on ZetaChain")
  .option("-r, --receiver <address>", "ZetaChain receiver address")
  .requiredOption(
    "-g, --gateway <address>",
    "Bitcoin gateway (TSS) address",
    "tb1qy9pqmk2pd9sv63g27jt8r657wy0d9ueeh0nqur"
  )
  .option("-t, --types <types...>", "ABI types")
  .option("-v, --values <values...>", "Values corresponding to types")
  .option("-a, --revert-address <address>", "Revert address")
  .addOption(
    new Option("--data <data>", "Pass raw data").conflicts([
      "types",
      "values",
      "revert-address",
      "receiver",
    ])
  )
  .action(async (opts) => {
    const validated = validateAndParseSchema(opts, callOptionsSchema, {
      exitOnError: true,
    });
    await main(validated);
  });

addCommonOptions(callCommand);
