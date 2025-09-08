import * as bitcoin from "bitcoinjs-lib";
import { z } from "zod";

import {
  bitcoinEncode,
  OpCode,
} from "../../../../../src/chains/bitcoin/inscription/encode";
import { makeCommitPsbt } from "../../../../../src/chains/bitcoin/inscription/makeCommitPsbt";
import { makeRevealPsbt } from "../../../../../src/chains/bitcoin/inscription/makeRevealPsbt";
import {
  BITCOIN_FEES,
  ESTIMATED_VIRTUAL_SIZE,
  X_ONLY_PUBKEY_END_INDEX,
  X_ONLY_PUBKEY_START_INDEX,
} from "../../../../../types/bitcoin.constants";
import { inscriptionDepositOptionsSchema } from "../../../../../types/bitcoin.types";
import { handleError } from "../../../../../utils";
import {
  broadcastBtcTransaction,
  createBitcoinInscriptionCommandWithCommonOptions,
  displayAndConfirmTransaction,
  setupBitcoinKeyPair,
} from "../../../../../utils/bitcoin.command.helpers";
import {
  calculateRevealFee,
  prepareUtxos,
  safeParseBitcoinAmount,
} from "../../../../../utils/bitcoin.helpers";
import { validateAndParseSchema } from "../../../../../utils/validateAndParseSchema";

type DepositOptions = z.infer<typeof inscriptionDepositOptionsSchema>;

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

    const revertAddress = options.revertAddress || address;
    const abortAddress = options.abortAddress;
    const revertOptions = { abortAddress, revertAddress };

    let data: Buffer;
    if (options.receiver) {
      data = Buffer.from(
        bitcoinEncode(
          options.receiver,
          Buffer.from(""), // empty payload for deposit
          revertOptions,
          OpCode.Deposit,
          options.format
        ),
        "hex"
      );
    } else if (options.data) {
      data = Buffer.from(options.data, "hex");
    } else {
      throw new Error("Provide either --data or --receiver");
    }

    const amount = safeParseBitcoinAmount(options.amount);
    const preparedUtxos = await prepareUtxos(address, options.bitcoinApi);

    const commit = makeCommitPsbt({
      amount,
      changeAddress: address,
      feeSat: options.commitFee,
      inscriptionData: data,
      internalPubkey: key.publicKey.subarray(
        X_ONLY_PUBKEY_START_INDEX,
        X_ONLY_PUBKEY_END_INDEX
      ),
      network,
      utxos: preparedUtxos,
    });

    const { revealFee, vsize } = calculateRevealFee(
      commit,
      BITCOIN_FEES.DEFAULT_REVEAL_FEE_RATE
    );
    const depositFee = Math.ceil(
      (ESTIMATED_VIRTUAL_SIZE * 2 * revealFee) / vsize
    );

    await displayAndConfirmTransaction({
      ...options,
      depositFee,
      operation: "Deposit",
      rawInscriptionData: data.toString("hex"),
      revealFee,
      revertOptions,
      sender: address,
    });

    const commitPsbt = bitcoin.Psbt.fromBase64(commit.unsignedPsbtBase64);
    commitPsbt.signAllInputs(key);
    commitPsbt.finalizeAllInputs();
    const commitTxHex = commitPsbt.extractTransaction().toHex();

    const commitTxid = await broadcastBtcTransaction(
      commitTxHex,
      options.bitcoinApi
    );
    console.log("Commit TXID:", commitTxid);

    const revealInfo = makeRevealPsbt(
      commitTxid,
      0,
      amount + revealFee + depositFee,
      options.gateway,
      BITCOIN_FEES.DEFAULT_REVEAL_FEE_RATE,
      commit,
      network
    );

    const revealPsbt = bitcoin.Psbt.fromBase64(revealInfo.unsignedPsbtBase64);
    revealPsbt.signAllInputs(key);
    revealPsbt.finalizeAllInputs();
    const revealHex = revealPsbt.extractTransaction().toHex();

    const revealTxid = await broadcastBtcTransaction(
      revealHex,
      options.bitcoinApi
    );
    console.log("Reveal TXID:", revealTxid);
  } catch (error) {
    handleError({
      context: "Error making a Bitcoin inscription deposit",
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
export const depositCommand = createBitcoinInscriptionCommandWithCommonOptions(
  "deposit"
)
  .summary("Deposit BTC to ZetaChain")
  .requiredOption("-a, --amount <btcAmount>", "BTC amount to send (in BTC)")
  .action(async (opts) => {
    const validated = validateAndParseSchema(
      opts,
      inscriptionDepositOptionsSchema,
      {
        exitOnError: true,
      }
    );
    await main(validated);
  });
