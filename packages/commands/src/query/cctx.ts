import { Command } from "commander";
import { z } from "zod";
import axios, { AxiosError } from "axios";
import { CrossChainTx } from "../../../../types/cctx";

const cctxOptionsSchema = z.object({
  hash: z.string(),
  rpc: z.string(),
});

type CctxOptions = z.infer<typeof cctxOptionsSchema>;

interface CctxResponse {
  CrossChainTxs: CrossChainTx[];
}

/**
 * Fetch every CCTX reachable from an initial hash.
 * Hashes that return HTTP 404 are treated as “there is no CCTX”
 * and are skipped without logging an error.
 */
const gatherCctxs = async (
  rootHash: string,
  rpc: string
): Promise<CrossChainTx[]> => {
  const seen = new Set<string>();
  const queue: string[] = [rootHash];
  const results: CrossChainTx[] = [];

  while (queue.length) {
    const hash = queue.shift()!;
    if (seen.has(hash)) continue;
    seen.add(hash);

    try {
      const url = `${rpc}/zeta-chain/crosschain/inboundHashToCctxData/${hash}`;

      /* Allow 404 to resolve instead of throwing */
      const res = await axios.get<CctxResponse>(url, {
        validateStatus: (s) => s === 200 || s === 404,
      });

      if (res.status === 404) {
        // no CCTX for this hash – perfectly fine, just move on
        continue;
      }

      for (const cctx of res.data.CrossChainTxs) {
        if (!results.find((t) => t.index === cctx.index)) {
          results.push(cctx);
          queue.push(cctx.index);
        }
      }
    } catch (err) {
      /* Network/other errors still get reported */
      console.error(`Error fetching CCTX for hash ${hash}:`, err);
    }
  }

  return results;
};

const main = async (options: CctxOptions) => {
  const parsed = cctxOptionsSchema.parse(options);
  const allCctxs = await gatherCctxs(parsed.hash, parsed.rpc);
  console.log(JSON.stringify(allCctxs, null, 2));
};

export const cctxCommand = new Command("cctx")
  .description("Query a CCTX and follow its linked indexes")
  .requiredOption("-h, --hash <hash>", "Root inbound transaction hash")
  .option(
    "-r, --rpc <rpc>",
    "RPC ",
    "https://zetachain-athens.blockpi.network/lcd/v1/public"
  )
  .action(async (opts) => {
    await main(opts as CctxOptions);
  });
