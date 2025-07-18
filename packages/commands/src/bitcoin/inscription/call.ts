import * as bitcoin from "bitcoinjs-lib";
import { ethers } from "ethers";
import { z } from "zod";

import { makeCommitPsbt } from "../../../../../src/chains/bitcoin/inscription/makeCommitPsbt";
import { makeRevealPsbt } from "../../../../../src/chains/bitcoin/inscription/makeRevealPsbt";
import {
  BITCOIN_FEES,
  ESTIMATED_VIRTUAL_SIZE,
} from "../../../../../types/bitcoin.constants";
import { inscriptionCallOptionsSchema } from "../../../../../types/bitcoin.types";
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
} from "../../../../../utils/bitcoin.helpers";
import { bitcoinEncode, OpCode } from "../../../../../utils/bitcoinEncode";
import { trim0x } from "../../../../../utils/trim0x";
import { validateAndParseSchema } from "../../../../../utils/validateAndParseSchema";

type CallOptions = z.infer<typeof inscriptionCallOptionsSchema>;

const main = async (options: CallOptions) => {
  try {
    const network =
      options.network === "signet"
        ? bitcoin.networks.testnet
        : bitcoin.networks.bitcoin;

    // Generate keyPair & address
    const { key, address } = setupBitcoinKeyPair(
      options.privateKey,
      options.name,
      network
    );

    const revertAddress = options.revertAddress || address;

    let encodedMessage: string | undefined;
    let data: Buffer;

    if (options.types && options.values && options.receiver) {
      // ABI‑encode types/values when provided
      encodedMessage = new ethers.AbiCoder().encode(
        options.types,
        options.values
      );
      data = Buffer.from(
        bitcoinEncode(
          options.receiver,
          Buffer.from(trim0x(encodedMessage), "hex"),
          revertAddress,
          OpCode.Call,
          options.format
        ),
        "hex"
      );
    } else if (options.data) {
      // Use raw hex data
      data = Buffer.from(options.data, "hex");
    } else {
      throw new Error(
        "Provide either --data or --types, --values, and --receiver"
      );
    }

    const preparedUtxos = await prepareUtxos(address, options.bitcoinApi);

    const commitFee = options.commitFee ?? BITCOIN_FEES.DEFAULT_COMMIT_FEE_SAT;

    const commit = makeCommitPsbt(
      key.publicKey.subarray(1, 33),
      preparedUtxos,
      address,
      data,
      0, // amount (sat) – call does not transfer value
      network,
      commitFee
    );

    const { revealFee, vsize } = calculateRevealFee(
      commit,
      BITCOIN_FEES.DEFAULT_REVEAL_FEE_RATE
    );

    const depositFee = Math.ceil(
      (ESTIMATED_VIRTUAL_SIZE * 2 * revealFee) / vsize
    );

    await displayAndConfirmTransaction({
      ...options,
      amount: "0",
      depositFee,
      encodedMessage,
      operation: "Call",
      rawInscriptionData: data.toString("hex"),
      revealFee,
      revertAddress,
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
      revealFee + depositFee,
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
      context: "Error making a Bitcoin inscription call",
      error,
      shouldThrow: false,
    });
    process.exit(1);
  }
};

/**
 * Command definition for call
 * This allows users to call contracts on ZetaChain
 */
export const callCommand = createBitcoinInscriptionCommandWithCommonOptions(
  "call"
)
  .summary("Call a contract on ZetaChain")
  .option("-t, --types <types...>", "ABI types")
  .option("-v, --values <values...>", "Values corresponding to types")
  .action(async (opts) => {
    const validated = validateAndParseSchema(
      opts,
      inscriptionCallOptionsSchema,
      {
        exitOnError: true,
      }
    );
    await main(validated);
  });
