import confirm from "@inquirer/confirm";
import axios from "axios";
import * as bitcoin from "bitcoinjs-lib";
import { Command, Option } from "commander";
import ECPairFactory from "ecpair";
import { ethers } from "ethers";
import * as ecc from "tiny-secp256k1";
import { z } from "zod";

import { EVMAccountData } from "../../../../types/accounts.types";
import { BITCOIN_FEES } from "../../../../types/bitcoin.constants";
import type { BtcUtxo } from "../../../../types/bitcoin.types";
import { depositOptionsSchema } from "../../../../types/bitcoin.types";
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
} from "../../../../utils/bitcoinEncode";
import { handleError } from "../../../../utils/handleError";
import { validateAndParseSchema } from "../../../../utils/validateAndParseSchema";
import { DEFAULT_ACCOUNT_NAME } from "../../../../types/shared.constants";

type DepositOptions = z.infer<typeof depositOptionsSchema>;

const main = async (options: DepositOptions) => {
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

  const revertAddress = options.revertAddress || address;

  let data;
  if (options.receiver && revertAddress) {
    data = Buffer.from(
      bitcoinEncode(
        options.receiver,
        Buffer.from(""),
        revertAddress,
        OpCode.Deposit,
        EncodingFormat.EncodingFmtABI
      ),
      "hex"
    );
  } else if (options.data) {
    data = Buffer.from(options.data, "hex");
  } else {
    throw new Error("Provide either --receiver or receiver encoded in --data");
  }

  const amountSatBig = ethers.parseUnits(options.amount, 8);
  if (amountSatBig > Number.MAX_SAFE_INTEGER) {
    throw new Error("Amount exceeds JS safe-integer range");
  }
  const amountSat = Number(amountSatBig);

  // Calculate total fees
  const { commitFee, revealFee, totalFee } = calculateFees(data);

  // Display transaction information and confirm
  console.log(`
Network: Signet
Amount: ${options.amount} BTC
Gateway: ${options.gateway}
Sender: ${address}
Universal Contract: ${options.receiver}
Revert Address: ${revertAddress}
Operation: Deposit
Encoding Format: ABI
Raw Inscription Data: ${data.toString("hex")}
Fees:
  - Commit Fee: ${commitFee} sat
  - Reveal Fee: ${revealFee} sat
  - Total Fee: ${totalFee} sat (${(totalFee / 100000000).toFixed(8)} BTC)
`);
  await confirm({ message: "Proceed?" }, { clearPromptOnDone: true });

  // Create and broadcast commit transaction
  const commit = await makeCommitTransaction(
    key,
    utxos,
    address!,
    data,
    options.api,
    amountSat
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
    amountSat,
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
  .option("--api <url>", "Bitcoin API", "https://mempool.space/signet/api")
  .addOption(
    new Option("--data <data>", "Pass raw data").conflicts([
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
    const validated = validateAndParseSchema(opts, depositOptionsSchema, {
      exitOnError: true,
    });
    await main(validated);
  });
