import { Command } from "commander";
import { z } from "zod";
import axios from "axios";
import EventEmitter from "eventemitter3";
import { CrossChainTx } from "../../../../types/cctx";

/**
 * Typed event map for our emitter. Two events are exposed:
 *  - `cctx` → emitted **after every polling round** with the *entire* array
 *             accumulated so far.
 *  - `done` → emitted once when crawling is finished with the final array.
 */
interface CctxEvents {
  cctx: (allSoFar: CrossChainTx[]) => void;
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
  const url = `${rpc}/zeta-chain/crosschain/inboundHashToCctxData/${hash}`;

  const res = await axios.get<CctxResponse>(url, {
    validateStatus: (s) => s === 200 || s === 404,
  });

  if (res.status === 404) return [];
  return res.data.CrossChainTxs;
};

/**
 * Recursively follows inbound hashes to gather all reachable CCTXs.
 * After **every** polling round it emits the *current* results array via
 * `cctx`, so front‑ends can re‑render live.
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
    let roundHadNew = false;

    await Promise.all(
      frontier.map(async (hash) => {
        const triesSoFar = attempts.get(hash) ?? 0;
        if (triesSoFar >= maxTries) return;
        attempts.set(hash, triesSoFar + 1);

        try {
          const cctxs = await fetchCctx(hash, rpc);

          if (cctxs.length === 0) {
            if (attempts.get(hash)! < maxTries) nextFrontier.push(hash);
            return;
          }

          for (const cctx of cctxs) {
            if (!results.some((t) => t.index === cctx.index)) {
              results.push(cctx);
              nextFrontier.push(cctx.index);
              roundHadNew = true;
            }
          }
          attempts.set(hash, maxTries);
        } catch (err) {
          console.error(`Error fetching CCTX for hash ${hash}:`, err);
        }
      })
    );

    // Emit after each round (even if nothing new) so listeners always receive
    // the freshest snapshot. Skip on the very first round when no data at all.
    if (roundHadNew || results.length) {
      cctxEmitter.emit("cctx", [...results]);
    }

    frontier = [...new Set(nextFrontier)];

    if (frontier.length) await sleep(delayMs);
  }

  cctxEmitter.emit("done", results);
  return results;
};

/**
 * CLI entry point – prints new indexes as they appear, using the full‑array
 * emissions to dedupe.
 */
const main = async (options: CctxOptions) => {
  const { hash, rpc, delay, tries } = cctxOptionsSchema.parse(options);

  const shown = new Set<string>();

  cctxEmitter.on("cctx", (allSoFar) => {
    for (const tx of allSoFar) {
      if (shown.has(tx.index)) continue;
      shown.add(tx.index);
      console.log(tx.index);
    }
  });

  await gatherCctxs(hash, rpc, delay, tries);
};

export const cctxCommand = new Command("cctx")
  .description(
    "Query a CCTX and follow its linked indexes, streaming full snapshots after each round."
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
