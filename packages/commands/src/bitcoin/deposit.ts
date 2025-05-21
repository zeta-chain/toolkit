import { Command, Option } from "commander";
import { ethers } from "ethers";
import { z } from "zod";

import { BITCOIN_LIMITS } from "../../../../types/bitcoin.constants";
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
import { calculateFees } from "../../../../utils/bitcoin.helpers";
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

    const amount =
      BITCOIN_LIMITS.MIN_COMMIT_AMOUNT + BITCOIN_LIMITS.ESTIMATED_REVEAL_FEE;

    const { commitFee, revealFee, depositFee, totalFee } = await calculateFees(
      data,
      options.gasPriceApi
    );

    await displayAndConfirmTransaction({
      amount: options.amount,
      fee: depositFee,
      encodingFormat: "ABI",
      gateway: options.gateway,
      network: options.bitcoinApi,
      operation: "Deposit",
      rawInscriptionData: data.toString("hex"),
      receiver: options.receiver,
      revertAddress,
      sender: address,
    });

    await createAndBroadcastTransactions(
      key,
      utxos,
      address,
      data,
      options.bitcoinApi,
      amount + depositFee,
      options.gateway
    );
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
