import axios from "axios";
import { Command } from "commander";
import EventEmitter from "eventemitter3";
import { z } from "zod";

import { CrossChainTx } from "../../../../types/cctx";

/**
 * Event map:
 *  - `cctx` → emitted on **every** polling round with the full array so far.
 */
interface CctxEvents {
  cctx: (allSoFar: CrossChainTx[]) => void;
}

export const cctxEmitter = new EventEmitter<CctxEvents>();

const cctxOptionsSchema = z.object({
  delay: z.coerce.number().int().positive().default(2000),
  hash: z.string(),
  rpc: z.string(),
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
 * Poll indefinitely until the process is terminated (Ctrl‑C).
 *  - 404 hashes stay in the frontier and are retried forever.
 *  - Once a hash yields CCTXs we consider it "resolved" and stop polling it.
 */
const gatherCctxs = async (
  rootHash: string,
  rpc: string,
  delayMs = 2000
): Promise<void> => {
  const results: CrossChainTx[] = [];
  const unresolved = new Set<string>([rootHash]);

  // eslint-disable-next-line no-constant-condition
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

          unresolved.delete(hash);

          for (const cctx of cctxs) {
            if (!results.some((t) => t.index === cctx.index)) {
              results.push(cctx);
              nextRound.push(cctx.index); // may be 404 for a while
            }
          }
        } catch (err) {
          console.error(`Error fetching CCTX for hash ${hash}:`, err);
          nextRound.push(hash); // retry on error
        }
      })
    );

    // Keep polling any hashes that are still unresolved
    for (const h of nextRound) unresolved.add(h);

    // Emit full snapshot so listeners (CLI/UI) can repaint
    cctxEmitter.emit("cctx", [...results]);

    await sleep(delayMs);
  }
};

const main = async (options: CctxOptions) => {
  const { hash, rpc, delay } = cctxOptionsSchema.parse(options);

  cctxEmitter.on("cctx", (all) => {
    console.clear();
    all.forEach((tx) => console.log(tx.index));
  });

  await gatherCctxs(hash, rpc, delay);
};

export const cctxCommand = new Command("cctx")
  .description(
    "Continuously query a CCTX and its linked indexes, updating the list in place."
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
