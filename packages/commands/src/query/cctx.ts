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
 * Polls for new CCTXs `maxRounds` times, waiting `delayMs` between rounds.
 */
const gatherCctxs = async (
  rootHash: string,
  rpc: string,
  delayMs = 2000,
  maxRounds = 5
): Promise<CrossChainTx[]> => {
  const results: CrossChainTx[] = [];
  const seenHashes = new Set<string>();
  let frontier: string[] = [rootHash];

  for (let round = 0; round < maxRounds && frontier.length > 0; round++) {
    const nextFrontier: string[] = [];

    await Promise.all(
      frontier.map(async (hash) => {
        if (seenHashes.has(hash)) return;
        seenHashes.add(hash);

        try {
          const cctxs = await fetchCctx(hash, rpc);
          for (const cctx of cctxs) {
            if (!results.some((t) => t.index === cctx.index)) {
              results.push(cctx);
              nextFrontier.push(cctx.index);
            }
          }
        } catch (err) {
          console.error(`Error fetching CCTX for hash ${hash}:`, err);
        }
      })
    );

    frontier = nextFrontier.filter((h) => !seenHashes.has(h));

    if (frontier.length && round < maxRounds - 1) {
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
    "2000"
  )
  .option(
    "-n, --tries <num>",
    "Maximum number of polling rounds to perform",
    "5"
  )
  .action(async (opts) => {
    await main(opts as CctxOptions);
  });
