import { Command, Option } from "commander";
import { ethers } from "ethers";
import { z } from "zod";

import {
  BITCOIN_FEES,
  BITCOIN_LIMITS,
} from "../../../../types/bitcoin.constants";
import { depositOptionsSchema } from "../../../../types/bitcoin.types";
import {
  addCommonOptions,
  broadcastBtcTransaction,
  createAndBroadcastTransactions,
  displayAndConfirmMemoTransaction,
  displayAndConfirmTransaction,
  fetchUtxos,
  setupBitcoinKeyPair,
} from "../../../../utils/bitcoin.command.helpers";
import {
  bitcoinEncode,
  EncodingFormat,
  OpCode,
} from "../../../../utils/bitcoinEncode";
import {
  bitcoinMakeTransactionWithMemo,
  getDepositFee,
} from "../../../../utils/bitcoinMemo.helpers";
import { validateAndParseSchema } from "../../../../utils/validateAndParseSchema";
import {
  makeCommitTransaction,
  makeRevealTransaction,
  calculateRevealFee,
} from "../../../../utils/bitcoin.helpers";

type DepositOptions = z.infer<typeof depositOptionsSchema>;

const main = async (options: DepositOptions) => {
  const { key, address } = setupBitcoinKeyPair(
    options.privateKey,
    options.name
  );
  const utxos = await fetchUtxos(address, options.bitcoinApi);

  if (options.method === "inscription") {
    const revertAddress = options.revertAddress || address;
    let data;
    if (options.receiver && revertAddress) {
      data = Buffer.from(
        bitcoinEncode(
          options.receiver,
          Buffer.from(""), // Empty payload for deposit
          revertAddress,
          OpCode.Deposit,
          EncodingFormat.EncodingFmtABI
        ),
        "hex"
      );
    } else if (options.data) {
      data = Buffer.from(options.data, "hex");
    } else {
      throw new Error(
        "Provide either --receiver or receiver encoded in --data"
      );
    }

    const amount = Number(ethers.parseUnits(options.amount, 8));
    const inscriptionFee = BITCOIN_FEES.DEFAULT_COMMIT_FEE_SAT;

    const commit = await makeCommitTransaction(
      key,
      utxos,
      address,
      data,
      options.bitcoinApi,
      amount
    );

    const { revealFee, vsize } = calculateRevealFee(
      {
        controlBlock: commit.controlBlock,
        internalKey: commit.internalKey,
        leafScript: commit.leafScript,
      },
      BITCOIN_FEES.DEFAULT_REVEAL_FEE_RATE
    );

    const depositFee = Math.ceil((68 * 2 * revealFee) / vsize);

    await displayAndConfirmTransaction({
      amount: options.amount,
      inscriptionCommitFee: inscriptionFee,
      inscriptionRevealFee: revealFee,
      depositFee,
      encodingFormat: "ABI",
      gateway: options.gateway,
      network: options.bitcoinApi,
      operation: "Deposit",
      rawInscriptionData: data.toString("hex"),
      receiver: options.receiver,
      revertAddress,
      sender: address,
    });

    const commitTxid = await broadcastBtcTransaction(
      commit.txHex,
      options.bitcoinApi
    );

    console.log("Commit TXID:", commitTxid);

    const revealHex = makeRevealTransaction(
      commitTxid,
      0,
      amount + revealFee + depositFee,
      options.gateway,
      BITCOIN_FEES.DEFAULT_REVEAL_FEE_RATE,
      {
        controlBlock: commit.controlBlock,
        internalKey: commit.internalKey,
        leafScript: commit.leafScript,
      },
      key
    );

    const revealTxid = await broadcastBtcTransaction(
      revealHex,
      options.bitcoinApi
    );

    console.log("Reveal TXID:", revealTxid);
  } else if (options.method === "memo") {
    const memo = options.data?.startsWith("0x")
      ? options.data.slice(2)
      : options.data;

    const amount = Number(ethers.parseUnits(options.amount, 8));
    const fee = await getDepositFee(options.gasPriceApi);
    const dust = BITCOIN_LIMITS.DUST_THRESHOLD.ZETACHAIN;
    const feeTotal = amount + fee <= dust ? dust : fee;

    await displayAndConfirmMemoTransaction(
      amount,
      feeTotal,
      options.gateway,
      address,
      memo || ""
    );

    const tx = await bitcoinMakeTransactionWithMemo(
      options.gateway,
      key,
      amount,
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
 * Command definition for deposit
 * This allows users to deposit BTC to EOAs and contracts on ZetaChain
 */
export const depositCommand = new Command()
  .name("deposit")
  .description("Deposit BTC to ZetaChain")
  .option("-r, --receiver <address>", "ZetaChain receiver address")
  .requiredOption(
    "-g, --gateway <address>",
    "Bitcoin gateway (TSS) address",
    "tb1qy9pqmk2pd9sv63g27jt8r657wy0d9ueeh0nqur"
  )
  .option("-a, --revert-address <address>", "Revert address")
  .requiredOption("--amount <btcAmount>", "BTC amount to send (in BTC)")
  .addOption(
    new Option("--data <data>", "Pass raw data").conflicts([
      "revert-address",
      "receiver",
    ])
  )
  .action(async (opts) => {
    const validated = validateAndParseSchema(opts, depositOptionsSchema, {
      exitOnError: true,
    });
    await main(validated);
  });

addCommonOptions(depositCommand);
