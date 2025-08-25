import { Command } from "commander";
import { ethers } from "ethers";
import EventEmitter from "eventemitter3";
import { z } from "zod";

import { DEFAULT_API_URL } from "../../../../src/constants/api";
import {
  DEFAULT_DELAY,
  DEFAULT_TIMEOUT,
} from "../../../../src/constants/commands/cctx";
import { cctxOptionsSchema } from "../../../../src/schemas/commands/cctx";
import type { CrossChainTx } from "../../../../types/trackCCTX.types";
import { fetchFromApi, sleep } from "../../../../utils";

/**
 * Event map:
 *  - `cctx` → emitted every polling round with the **entire** array so far.
 */
interface CctxEvents {
  cctx: (allSoFar: CrossChainTx[]) => void;
}

export const cctxEmitter = new EventEmitter<CctxEvents>();

type CctxOptions = z.infer<typeof cctxOptionsSchema>;

interface CctxResponse {
  CrossChainTxs: CrossChainTx[];
}

/**
 * True if the CCTX is still in-flight and may mutate on‑chain.
 */
const isPending = (tx: CrossChainTx): boolean =>
  ["PendingOutbound", "PendingRevert"].includes(tx.cctx_status.status);

/**
 * Poll indefinitely until user terminates.
 *
 * • Hashes returning 404 are retried forever.
 * • Every discovered `cctx.index` is queried **at least once** (to pull the
 *   next hop) and queried again while its status remains pending.
 */
const gatherCctxs = async (
  rootHash: string,
  rpc: string,
  delayMs = 2000,
  timeoutMs = 300000
): Promise<void> => {
  const startTime = Date.now();
  // Latest copy of each CCTX keyed by index
  const results = new Map<string, CrossChainTx>();

  // Hashes we need to query in the upcoming round
  const frontier = new Set<string>([rootHash]);

  // Track which indexes we've *ever* queried so we still fetch each once
  const queriedOnce = new Set<string>();

  // eslint-disable-next-line no-constant-condition
  while (true) {
    // Check if we've exceeded the timeout (skip if timeout is 0)
    if (timeoutMs > 0 && Date.now() - startTime > timeoutMs) {
      console.log("\nTimeout reached. Exiting...");
      return;
    }

    const nextFrontier = new Set<string>();

    await Promise.all(
      [...frontier].map(async (hash) => {
        try {
          const endpoint = `/zeta-chain/crosschain/inboundHashToCctxData/${hash}`;
          const response = await fetchFromApi<CctxResponse>(rpc, endpoint);
          const cctxs = response.CrossChainTxs;

          if (cctxs.length === 0) {
            // Still 404 – keep trying
            nextFrontier.add(hash);
            return;
          }

          for (const tx of cctxs) {
            // Store latest version
            results.set(tx.index, tx);

            // Always query this index at least once
            if (!queriedOnce.has(tx.index)) {
              nextFrontier.add(tx.index);
            }

            // Keep querying while pending
            if (isPending(tx)) {
              nextFrontier.add(tx.inbound_params.observed_hash);
            }

            queriedOnce.add(tx.index);
          }
        } catch (err) {
          nextFrontier.add(hash); // retry on error
        }
      })
    );

    // Emit snapshot (Map → Array) for UI/CLI consumers
    cctxEmitter.emit("cctx", Array.from(results.values()));

    // Prepare next loop
    frontier.clear();
    for (const h of nextFrontier) frontier.add(h);

    await sleep(delayMs);
  }
};

const formatCCTX = (cctx: CrossChainTx) => {
  let output = "";
  const {
    index,
    inbound_params,
    outbound_params,
    cctx_status,
    revert_options,
    relayed_message,
  } = cctx;
  const { sender_chain_id, sender, amount, coin_type } = inbound_params;
  const { receiver_chainId, receiver } = outbound_params[0];
  const { status, status_message, error_message = "" } = cctx_status;
  const {
    revert_address,
    call_on_revert,
    abort_address,
    revert_message,
    revert_gas_limit,
  } = revert_options;
  let mainStatusIcon = "🔄";
  if (
    status === "OutboundMined" ||
    (status === "PendingOutbound" && outbound_params[0].hash !== "")
  ) {
    mainStatusIcon = "✅";
  } else if (status === "PendingOutbound" || status === "PendingRevert") {
    mainStatusIcon = "🔄";
  } else {
    mainStatusIcon = "❌";
  }

  let mainStatus;
  if (status === "PendingOutbound" && outbound_params[0].hash !== "") {
    mainStatus = "PendingOutbound (transaction broadcasted to target chain)";
  } else {
    mainStatus = status;
  }

  const outboundHash =
    outbound_params[0].hash === ""
      ? `Waiting for a transaction on chain ${receiver_chainId}...`
      : `${outbound_params[0].hash} (on chain ${receiver_chainId})`;

  let mainTx = `${sender_chain_id} → ${receiver_chainId} ${mainStatusIcon} ${mainStatus}
CCTX:     ${index}
Tx Hash:  ${inbound_params.observed_hash} (on chain ${sender_chain_id})
Tx Hash:  ${outboundHash}
Sender:   ${sender}
Receiver: ${receiver}
`;

  if (relayed_message !== "") {
    mainTx += `Message:  ${relayed_message}\n`;
  }

  if (coin_type !== "NoAssetCall") {
    mainTx += `Amount:   ${amount} ${coin_type} tokens\n`;
  }

  if (status_message !== "") {
    mainTx += `Status:   ${status}, ${status_message}\n`;
  }

  if (error_message !== "") {
    mainTx += `Error:    ${error_message}\n`;
  }

  output += mainTx;

  if (
    outbound_params[1] &&
    ["Reverted", "PendingRevert", "Aborted"].includes(status)
  ) {
    const isReverted = status === "Reverted";
    const isPendingRevert = status === "PendingRevert";
    const isAborted = status === "Aborted";

    const statusIcon = isPendingRevert ? "🔄" : "✅";
    let statusMessage = "Unknown";
    if (isReverted) {
      statusMessage = "Revert executed";
    } else if (isPendingRevert) {
      statusMessage = "Revert pending";
    } else if (isAborted) {
      statusMessage = "Abort executed";
    }

    const revertAddress =
      revert_address === ethers.ZeroAddress
        ? "Reverted to sender address, because revert address is not set"
        : revert_address;

    const revertMessage = revert_message
      ? Buffer.from(revert_message, "base64").toString("hex")
      : "null";

    let chainDetails = "Unknown";
    if (isReverted || isPendingRevert) {
      chainDetails = `${receiver_chainId} → ${outbound_params[1].receiver_chainId} ${statusIcon} ${statusMessage}`;
    } else if (isAborted) {
      chainDetails = `${receiver_chainId} ${statusIcon} ${statusMessage}`;
    }

    let revertOrAbortTx = `
${chainDetails}
Revert Address:   ${revertAddress}
Call on Revert:   ${call_on_revert}
Abort Address:    ${abort_address}
Revert Message:   ${revertMessage}
Revert Gas Limit: ${revert_gas_limit}
`;

    if (isReverted && outbound_params[1].hash !== "") {
      revertOrAbortTx += `Tx Hash:          ${outbound_params[1].hash} (on chain ${outbound_params[1].receiver_chainId})
`;
    }

    output += revertOrAbortTx;
  }

  return output;
};

/**
 * CLI entry – clears screen and prints the list of indexes each round.
 */
const main = async (options: CctxOptions) => {
  const { hash, rpc, delay, timeout } = options;
  cctxEmitter.on("cctx", (all) => {
    console.clear();
    all.forEach((cctx) => {
      console.log(formatCCTX(cctx));
    });
  });

  await gatherCctxs(hash, rpc, delay, timeout);
};

export const cctxCommand = new Command("cctx")
  .description("Query cross-chain transaction data in real-time")
  .requiredOption("-h, --hash <hash>", "Inbound transaction hash")
  .option("-r, --rpc <rpc>", "RPC endpoint", DEFAULT_API_URL)
  .option(
    "-d, --delay <ms>",
    "Delay between polling rounds in milliseconds",
    DEFAULT_DELAY.toString()
  )
  .option(
    "-t, --timeout <ms>",
    "Timeout duration in milliseconds (default: indefinite)",
    DEFAULT_TIMEOUT.toString()
  )
  .action(async (opts) => {
    const validatedOptions = cctxOptionsSchema.parse(opts);
    await main(validatedOptions);
  });
