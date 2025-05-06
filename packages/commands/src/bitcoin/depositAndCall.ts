import confirm from "@inquirer/confirm";
import axios from "axios";
import * as bitcoin from "bitcoinjs-lib";
import { Command } from "commander";
import ECPairFactory from "ecpair";
import { ethers } from "ethers";
import * as ecc from "tiny-secp256k1";
import { z } from "zod";

import { BITCOIN_FEES } from "../../../../types/bitcoin.constants";
import type { BtcUtxo } from "../../../../types/bitcoin.types";
import {
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
import { validateAndParseSchema } from "../../../../utils/validateAndParseSchema";
import { depositAndCallOptionsSchema } from "../../../../types/bitcoin.types";

type DepositAndCallOptions = z.infer<typeof depositAndCallOptionsSchema>;

/**
 * Main function that executes the deposit-and-call operation.
 * Creates and broadcasts both commit and reveal transactions to perform a cross-chain call.
 *
 * @param options - Command options including amounts, addresses, and contract parameters
 */
const main = async (options: DepositAndCallOptions) => {
  // Initialize Bitcoin library with ECC implementation
  bitcoin.initEccLib(ecc);

  // Set up Bitcoin key pair
  const ECPair = ECPairFactory(ecc);
  const pk = options.privateKey;
  if (!pk) throw new Error("missing private key");
  const key = ECPair.fromPrivateKey(Buffer.from(pk, "hex"), {
    network: SIGNET,
  });
  const { address } = bitcoin.payments.p2wpkh({
    network: SIGNET,
    pubkey: key.publicKey,
  });

  // Get available UTXOs
  const utxos = (
    await axios.get<BtcUtxo[]>(`${options.api}/address/${address}/utxo`)
  ).data;

  // Encode contract call data for inscription
  const encodedPayload = new ethers.AbiCoder().encode(
    options.types,
    options.values
  );
  const inscriptionData = Buffer.from(
    bitcoinEncode(
      options.receiver,
      Buffer.from(trimOx(encodedPayload), "hex"),
      options.revertAddress,
      OpCode.DepositAndCall,
      EncodingFormat.EncodingFmtABI
    ),
    "hex"
  );

  // Convert BTC amount to satoshis
  const amountSat = ethers.toNumber(ethers.parseUnits(options.amount, 8));

  // Display transaction information and confirm
  console.log(`
Network: Signet
Amount: ${options.amount} BTC
Gateway: ${options.gateway}
Universal Contract: ${options.receiver}
Revert Address: ${options.revertAddress}
Operation: DepositAndCall
Encoded Message: ${encodedPayload}
Encoding Format: ABI
Raw Inscription Data: ${inscriptionData.toString("hex")}
`);
  await confirm({ message: "Proceed?" }, { clearPromptOnDone: true });

  // Create and broadcast commit transaction
  const commit = await makeCommitTransaction(
    key,
    utxos,
    address!,
    inscriptionData,
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
 * Command definition for deposit-and-call
 * This allows users to deposit BTC and call a contract on ZetaChain using Bitcoin inscriptions
 */
export const depositAndCallCommand = new Command()
  .name("deposit-and-call")
  .description(
    "Deposit BTC and call a contract on ZetaChain (using inscriptions)"
  )
  .requiredOption("-r, --receiver <address>", "ZetaChain receiver address")
  .requiredOption(
    "-g, --gateway <address>",
    "Bitcoin gateway (TSS) address",
    "tb1qy9pqmk2pd9sv63g27jt8r657wy0d9ueeh0nqur"
  )
  .requiredOption("-t, --types <types...>", "ABI types")
  .requiredOption("-v, --values <values...>", "Values corresponding to types")
  .requiredOption("-a, --revert-address <address>", "Revert address")
  .requiredOption("--amount <btcAmount>", "BTC amount to inscribe (in BTC)")
  .option("--api <url>", "Bitcoin API", "https://mempool.space/signet/api")
  .requiredOption("--private-key <key>", "Bitcoin private key")
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
