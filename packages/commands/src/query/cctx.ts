import { Command } from "commander";
import { z } from "zod";
import axios from "axios";
import { CrossChainTx } from "../../../../types/cctx";

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
 * For each hash, it will retry up to `maxTries` times if the endpoint
 * returns 404 (meaning the CCTX might not exist *yet*).
 */
const gatherCctxs = async (
  rootHash: string,
  rpc: string,
  delayMs = 2000,
  maxTries = 5
): Promise<CrossChainTx[]> => {
  const results: CrossChainTx[] = [];
  /** Track how many times we've attempted each hash */
  const attempts = new Map<string, number>();
  let frontier: string[] = [rootHash];

  while (frontier.length) {
    const nextFrontier: string[] = [];

    await Promise.all(
      frontier.map(async (hash) => {
        const triesSoFar = attempts.get(hash) ?? 0;
        if (triesSoFar >= maxTries) return; // exhausted this hash
        attempts.set(hash, triesSoFar + 1);

        try {
          const cctxs = await fetchCctx(hash, rpc);

          if (cctxs.length === 0) {
            // Still 404/empty – queue for another round if we have tries left
            if (attempts.get(hash)! < maxTries) {
              nextFrontier.push(hash);
            }
            return;
          }

          // Found at least one CCTX – we consider this hash resolved.
          for (const cctx of cctxs) {
            if (!results.some((t) => t.index === cctx.index)) {
              results.push(cctx);
              nextFrontier.push(cctx.index);
            }
          }
          // Mark resolved by setting attempts to maxTries
          attempts.set(hash, maxTries);
        } catch (err) {
          console.error(`Error fetching CCTX for hash ${hash}:`, err);
        }
      })
    );

    // Deduplicate hashes for the next round
    frontier = [...new Set(nextFrontier)];

    if (frontier.length) {
      await sleep(delayMs);
    }
  }

  return results;
};

const main = async (options: CctxOptions) => {
  const { hash, rpc, delay, tries } = cctxOptionsSchema.parse(options);
  const allCctxs = await gatherCctxs(hash, rpc, delay, tries);
  console.log(JSON.stringify(allCctxs, null, 2));
};

export const cctxCommand = new Command("cctx")
  .description(
    "Query a CCTX and follow its linked indexes, polling for new ones"
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
    "5000"
  )
  .option(
    "-n, --tries <num>",
    "Number of times to retry a 404 hash before treating it as final",
    "5"
  )
  .action(async (opts) => {
    await main(opts as CctxOptions);
  });
