import { Command } from "commander";
import { z } from "zod";
import axios from "axios";
import EventEmitter from "eventemitter3";
import { CrossChainTx } from "../../../../types/cctx";

/**
 * Event map:
 *  - `cctx` → emitted every polling round with the **entire** array so far.
 */
interface CctxEvents {
  cctx: (allSoFar: CrossChainTx[]) => void;
}

export const cctxEmitter = new EventEmitter<CctxEvents>();

const cctxOptionsSchema = z.object({
  hash: z.string(),
  rpc: z.string(),
  delay: z.coerce.number().int().positive().default(2000),
});

type CctxOptions = z.infer<typeof cctxOptionsSchema>;

interface CctxResponse {
  CrossChainTxs: CrossChainTx[];
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const fetchCctx = async (
  hash: string,
  rpc: string
): Promise<CrossChainTx[]> => {
  const url = `${rpc}/zeta-chain/crosschain/inboundHashToCctxData/${hash}`;
  const res = await axios.get<CctxResponse>(url, {
    validateStatus: (s) => s === 200 || s === 404,
  });
  return res.status === 404 ? [] : res.data.CrossChainTxs;
};

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
  delayMs = 2000
): Promise<void> => {
  // Latest copy of each CCTX keyed by index
  const results = new Map<string, CrossChainTx>();

  // Hashes we need to query in the upcoming round
  const frontier = new Set<string>([rootHash]);

  // Track which indexes we've *ever* queried so we still fetch each once
  const queriedOnce = new Set<string>();

  while (true) {
    const nextFrontier = new Set<string>();

    await Promise.all(
      [...frontier].map(async (hash) => {
        try {
          const cctxs = await fetchCctx(hash, rpc);

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
          console.error(`Error fetching CCTX for hash ${hash}:`, err);
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

/**
 * CLI entry – clears screen and prints the list of indexes each round.
 */
const main = async (options: CctxOptions) => {
  const { hash, rpc, delay } = cctxOptionsSchema.parse(options);

  cctxEmitter.on("cctx", (all) => {
    console.clear();
    all.forEach((tx) =>
      console.log(
        `${tx.index} ${tx.inbound_params.sender_chain_id} → ${tx.outbound_params[0].receiver_chainId} ${tx.cctx_status.status} ${tx.cctx_status.status_message}`
      )
    );
  });

  await gatherCctxs(hash, rpc, delay);
};

export const cctxCommand = new Command("cctx")
  .description(
    "Continuously query a CCTX graph, always following indexes and refreshing pending ones."
  )
  .requiredOption("-h, --hash <hash>", "Inbound transaction hash")
  .option(
    "-r, --rpc <rpc>",
    "RPC endpoint",
    "https://zetachain-athens.blockpi.network/lcd/v1/public"
  )
  .option(
    "-d, --delay <ms>",
    "Delay between polling rounds in milliseconds",
    "2000"
  )
  .action(async (opts) => {
    await main(opts as CctxOptions);
  });
