import { ethers } from "ethers";
import { z } from "zod";

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
  fetchUtxos,
  setupBitcoinKeyPair,
} from "../../../../../utils/bitcoin.command.helpers";
import {
  calculateRevealFee,
  makeCommitTransaction,
  makeRevealTransaction,
} from "../../../../../utils/bitcoin.helpers";
import { bitcoinEncode, OpCode } from "../../../../../utils/bitcoinEncode";
import { trim0x } from "../../../../../utils/trim0x";
import { validateAndParseSchema } from "../../../../../utils/validateAndParseSchema";

type CallOptions = z.infer<typeof inscriptionCallOptionsSchema>;

/**
 * Main function that executes the call operation.
 * Creates and broadcasts both commit and reveal transactions to perform a cross-chain call.
 *
 * @param options - Command options including amounts, addresses, and contract parameters
 */
const main = async (options: CallOptions) => {
  try {
    const { key, address } = setupBitcoinKeyPair(
      options.privateKey,
      options.name
    );
    const utxos = await fetchUtxos(address, options.bitcoinApi);
    const revertAddress = options.revertAddress || address;

    let data;
    let payload;
    if (options.types && options.values && options.receiver) {
      payload = new ethers.AbiCoder().encode(options.types, options.values);
      data = Buffer.from(
        bitcoinEncode(
          options.receiver,
          Buffer.from(trim0x(payload), "hex"),
          revertAddress,
          OpCode.Call,
          options.format
        ),
        "hex"
      );
    } else if (options.data) {
      data = Buffer.from(options.data, "hex");
    } else {
      throw new Error("Provide either data or types, values, receiver");
    }

    const inscriptionFee = BITCOIN_FEES.DEFAULT_COMMIT_FEE_SAT;

    const commit = await makeCommitTransaction(
      key,
      utxos,
      address,
      data,
      options.bitcoinApi,
      0
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
      amount: "0",
      depositFee,
      encodedMessage: payload,
      encodingFormat: options.format,
      gateway: options.gateway,
      inscriptionCommitFee: inscriptionFee,
      inscriptionRevealFee: revealFee,
      network: options.bitcoinApi,
      operation: "Call",
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
      revealFee + depositFee,
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
  .description("Call a contract on ZetaChain")
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
