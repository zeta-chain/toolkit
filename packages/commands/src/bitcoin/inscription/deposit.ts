import { z } from "zod";

import {
  BITCOIN_FEES,
  ESTIMATED_VIRTUAL_SIZE,
} from "../../../../../types/bitcoin.constants";
import { inscriptionDepositOptionsSchema } from "../../../../../types/bitcoin.types";
import { handleError } from "../../../../../utils";
import {
  broadcastBtcTransaction,
  createBitcoinInscriptionCommandWithCommonOptions,
  displayAndConfirmTransaction,
  fetchUtxos,
  setupBitcoinKeyPair,
} from "../../../../../utils/bitcoin.command.helpers";
import {
  calculateRevealFee,
  makeCommitTransaction,
  makeRevealTransaction,
  safeParseBitcoinAmount,
} from "../../../../../utils/bitcoin.helpers";
import { bitcoinEncode, OpCode } from "../../../../../utils/bitcoinEncode";
import { validateAndParseSchema } from "../../../../../utils/validateAndParseSchema";

type DepositOptions = z.infer<typeof inscriptionDepositOptionsSchema>;

const main = async (options: DepositOptions) => {
  try {
    const { key, address } = setupBitcoinKeyPair(
      options.privateKey,
      options.name
    );
    const utxos = await fetchUtxos(address, options.bitcoinApi);

    const revertAddress = options.revertAddress || address;
    let data;
    if (options.receiver) {
      data = Buffer.from(
        bitcoinEncode(
          options.receiver,
          Buffer.from(""), // Empty payload for deposit
          revertAddress,
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

    const depositFee = Math.ceil(
      (ESTIMATED_VIRTUAL_SIZE * 2 * revealFee) / vsize
    );

    await displayAndConfirmTransaction({
      amount: options.amount,
      depositFee,
      encodingFormat: options.format,
      gateway: options.gateway,
      inscriptionCommitFee: inscriptionFee,
      inscriptionRevealFee: revealFee,
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
  .description("Deposit BTC to ZetaChain")
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
