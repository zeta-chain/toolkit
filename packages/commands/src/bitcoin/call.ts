import confirm from "@inquirer/confirm";
import axios from "axios";
import * as bitcoin from "bitcoinjs-lib";
import { Command, Option } from "commander";
import ECPairFactory from "ecpair";
import { ethers } from "ethers";
import * as ecc from "tiny-secp256k1";
import { z } from "zod";

import { EVMAccountData } from "../../../../types/accounts.types";
import {
  BITCOIN_FEES,
  BITCOIN_LIMITS,
} from "../../../../types/bitcoin.constants";
import type { BtcUtxo } from "../../../../types/bitcoin.types";
import { callOptionsSchema } from "../../../../types/bitcoin.types";
import { DEFAULT_ACCOUNT_NAME } from "../../../../types/shared.constants";
import { getAccountData } from "../../../../utils/accounts";
import {
  calculateFees,
  makeCommitTransaction,
  makeRevealTransaction,
  SIGNET,
} from "../../../../utils/bitcoin.helpers";
import {
  bitcoinEncode,
  EncodingFormat,
  OpCode,
  trimOx,
} from "../../../../utils/bitcoinEncode";
import { handleError } from "../../../../utils/handleError";
import { validateAndParseSchema } from "../../../../utils/validateAndParseSchema";

type CallOptions = z.infer<typeof callOptionsSchema>;

/**
 * Main function that executes the call operation.
 * Creates and broadcasts both commit and reveal transactions to perform a cross-chain call.
 *
 * @param options - Command options including amounts, addresses, and contract parameters
 */
const main = async (options: CallOptions) => {
  // Initialize Bitcoin library with ECC implementation
  bitcoin.initEccLib(ecc);

  const privateKey =
    options.privateKey ||
    getAccountData<EVMAccountData>("bitcoin", options.name)?.privateKey;

  if (!privateKey) {
    const errorMessage = handleError({
      context: "Failed to retrieve private key",
      error: new Error("Private key not found"),
      shouldThrow: false,
    });

    throw new Error(errorMessage);
  }

  // Set up Bitcoin key pair
  const ECPair = ECPairFactory(ecc);
  const key = ECPair.fromPrivateKey(Buffer.from(privateKey, "hex"), {
    network: SIGNET,
  });

  const { address } = bitcoin.payments.p2wpkh({
    network: SIGNET,
    pubkey: key.publicKey,
  });

  const utxos = (
    await axios.get<BtcUtxo[]>(`${options.api}/address/${address}/utxo`)
  ).data;

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

  const notApplicable = "encoded in raw inscription data";

  // Calculate total fees
  const { commitFee, revealFee, totalFee } = calculateFees(data);

  // Display transaction information and confirm
  console.log(`
Network: Signet
Gateway: ${options.gateway}
Sender: ${address}
Universal Contract: ${options.receiver || notApplicable}
Revert Address: ${options.revertAddress || notApplicable}
Operation: Call
Encoded Message: ${payload || notApplicable}
Encoding Format: ABI
Raw Inscription Data: ${data.toString("hex")}
Fees:
  - Commit Fee: ${commitFee} sat
  - Reveal Fee: ${revealFee} sat
  - Total Fee: ${totalFee} sat (${(totalFee / 100000000).toFixed(8)} BTC)
`);
  await confirm({ message: "Proceed?" }, { clearPromptOnDone: true });

  // Create and broadcast commit transaction
  const effectiveAmount =
    BITCOIN_LIMITS.MIN_COMMIT_AMOUNT + BITCOIN_LIMITS.ESTIMATED_REVEAL_FEE;

  const commit = await makeCommitTransaction(
    key,
    utxos,
    address!,
    data,
    options.api,
    effectiveAmount
  );

  const commitTxid = (
    await axios.post<string>(`${options.api}/tx`, commit.txHex, {
      headers: { "Content-Type": "text/plain" },
    })
  ).data;

  console.log("Commit TXID:", commitTxid);

  // Create and broadcast reveal transaction
  const revealHex = makeRevealTransaction(
    commitTxid,
    0,
    effectiveAmount,
    options.gateway,
    BITCOIN_FEES.DEFAULT_REVEAL_FEE_RATE,
    {
      controlBlock: commit.controlBlock,
      internalKey: commit.internalKey,
      leafScript: commit.leafScript,
    },
    key
  );
  const revealTxid = (
    await axios.post<string>(`${options.api}/tx`, revealHex, {
      headers: { "Content-Type": "text/plain" },
    })
  ).data;
  console.log("Reveal TXID:", revealTxid);
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
  .option("--api <url>", "Bitcoin API", "https://mempool.space/signet/api")
  .addOption(
    new Option("--data <data>", "Pass raw data").conflicts([
      "types",
      "values",
      "revert-address",
      "receiver",
    ])
  )
  .addOption(
    new Option("--private-key <key>", "Bitcoin private key").conflicts(["name"])
  )
  .addOption(
    new Option("--name <name>", "Account name")
      .default(DEFAULT_ACCOUNT_NAME)
      .conflicts(["private-key"])
  )
  .action(async (opts) => {
    const validated = validateAndParseSchema(opts, callOptionsSchema, {
      exitOnError: true,
    });
    await main(validated);
  });
