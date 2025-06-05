import { Command } from "commander";
import { z } from "zod";
import axios from "axios";
import EventEmitter from "eventemitter3";
import { CrossChainTx } from "../../../../types/cctx";

/**
 * Event map:
 *  - `cctx` → fired **every polling round** with the full array collected so far.
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
 * Polls indefinitely until the process is terminated (Ctrl-C).
 *
 * 1. 404 hashes stay in the frontier and are retried forever.
 * 2. Once a hash yields CCTXs we consider it "resolved" and stop polling it.
 */
const gatherCctxs = async (
  rootHash: string,
  rpc: string,
  delayMs = 2000
): Promise<void> => {
  const results: CrossChainTx[] = [];
  const unresolved = new Set<string>([rootHash]);
  const resolved = new Set<string>();

  while (true) {
    const nextRound: string[] = [];

    await Promise.all(
      [...unresolved].map(async (hash) => {
        try {
          const cctxs = await fetchCctx(hash, rpc);
          if (cctxs.length === 0) {
            nextRound.push(hash); // still 404 – retry later
            return;
          }

          resolved.add(hash);
          unresolved.delete(hash);

          for (const cctx of cctxs) {
            if (!results.some((t) => t.index === cctx.index)) {
              results.push(cctx);
              nextRound.push(cctx.index); // may be 404 for a while
            }
          }
        } catch (err) {
          console.error(`Error fetching CCTX for hash ${hash}:`, err);
          // retry same hash next round on error
          nextRound.push(hash);
        }
      })
    );

    // Keep polling any hashes that are still unresolved
    for (const h of nextRound) unresolved.add(h);

    // Emit full snapshot to listeners (front-end can just setState(results))
    cctxEmitter.emit("cctx", [...results]);

    await sleep(delayMs);
  }
};

/**
 * CLI entry – prints new indexes in real time until user aborts.
 */
const main = async (options: CctxOptions) => {
  const { hash, rpc, delay } = cctxOptionsSchema.parse(options);
  const seen = new Set<string>();

  cctxEmitter.on("cctx", (all) => {
    for (const tx of all) {
      if (seen.has(tx.index)) continue;
      seen.add(tx.index);
      console.log("➜", tx.index);
    }
  });

  await gatherCctxs(hash, rpc, delay);
};

export const cctxCommand = new Command("cctx")
  .description(
    "Continuously query a CCTX and its linked indexes, streaming snapshots until interrupted."
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
  .action(async (opts) => {
    await main(opts as CctxOptions);
  });
