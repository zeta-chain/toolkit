import { Command } from "commander";
import { z } from "zod";
import axios from "axios";
import EventEmitter from "eventemitter3";
import { CrossChainTx } from "../../../../types/cctx";

/**
 * Typed event map for our emitter. Two events are exposed:
 *  - `cctx`  → emitted whenever NEW CCTXs are discovered (progress updates)
 *  - `done`  → emitted once, when the crawl finishes, with the full array
 */
interface CctxEvents {
  cctx: (partial: CrossChainTx[]) => void;
  done: (all: CrossChainTx[]) => void;
}

export const cctxEmitter = new EventEmitter<CctxEvents>();

const cctxOptionsSchema = z.object({
  hash: z.string(),
  rpc: z.string(),
  delay: z.coerce.number().int().positive().default(2000),
  tries: z.coerce.number().int().positive().default(5),
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
  console.log("Fetching CCTX for hash", hash);
  const url = `${rpc}/zeta-chain/crosschain/inboundHashToCctxData/${hash}`;

  const res = await axios.get<CctxResponse>(url, {
    validateStatus: (s) => s === 200 || s === 404,
  });

  if (res.status === 404) return [];
  return res.data.CrossChainTxs;
};

/**
 * Recursively follows inbound hashes to gather all reachable CCTXs.
 * Emits a **`cctx`** event whenever new CCTXs are found and a **`done`** event
 * when crawling finishes.
 */
const gatherCctxs = async (
  rootHash: string,
  rpc: string,
  delayMs = 2000,
  maxTries = 5
): Promise<CrossChainTx[]> => {
  const results: CrossChainTx[] = [];
  const attempts = new Map<string, number>();
  let frontier: string[] = [rootHash];

  while (frontier.length) {
    const nextFrontier: string[] = [];
    const newlyFound: CrossChainTx[] = [];

    await Promise.all(
      frontier.map(async (hash) => {
        const triesSoFar = attempts.get(hash) ?? 0;
        if (triesSoFar >= maxTries) return; // exhausted this hash
        attempts.set(hash, triesSoFar + 1);

        try {
          const cctxs = await fetchCctx(hash, rpc);

          if (cctxs.length === 0) {
            // Still 404/empty – queue for another round if tries remain
            if (attempts.get(hash)! < maxTries) {
              nextFrontier.push(hash);
            }
            return;
          }

          // Found at least one CCTX – mark hash resolved.
          for (const cctx of cctxs) {
            if (!results.some((t) => t.index === cctx.index)) {
              results.push(cctx);
              newlyFound.push(cctx);
              nextFrontier.push(cctx.index);
            }
          }
          attempts.set(hash, maxTries); // resolved
        } catch (err) {
          console.error(`Error fetching CCTX for hash ${hash}:`, err);
        }
      })
    );

    // Emit incremental update if we found anything new this round.
    if (newlyFound.length) {
      cctxEmitter.emit("cctx", newlyFound);
    }

    frontier = [...new Set(nextFrontier)];

    if (frontier.length) {
      await sleep(delayMs);
    }
  }

  // Final emission
  cctxEmitter.emit("done", results);
  return results;
};

/**
 * CLI entry point. Subscribes to the emitter so that users see CCTX indexes
 * appear in real time.
 */
const main = async (options: CctxOptions) => {
  const { hash, rpc, delay, tries } = cctxOptionsSchema.parse(options);

  // Track what we've already displayed to avoid duplicates
  const shown = new Set<string>();

  cctxEmitter.on("cctx", (newCctxs) => {
    for (const tx of newCctxs) {
      if (shown.has(tx.index)) continue;
      shown.add(tx.index);
      console.log("➜", tx.index);
    }
  });

  cctxEmitter.once("done", (all) => {
    console.log(
      `\nFetched ${all.length} CCTX${all.length === 1 ? "" : "s"} in total.`
    );
  });

  await gatherCctxs(hash, rpc, delay, tries);
};

export const cctxCommand = new Command("cctx")
  .description(
    "Query a CCTX and follow its linked indexes, showing them in real time."
  )
  .requiredOption("-h, --hash <hash>", "Root inbound transaction hash")
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
  .option(
    "-n, --tries <num>",
    "Number of times to retry a 404 hash before treating it as final",
    "5"
  )
  .action(async (opts) => {
    await main(opts as CctxOptions);
  });
