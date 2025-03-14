import EventEmitter from "eventemitter3";
import { task } from "hardhat/config";
import Spinnies from "spinnies";
import { z } from "zod";

import { ZetaChainClient } from "../../client/src/";

interface EmitterArgs {
  hash: string;
  text: string;
}

const trackCCTXInteractive = async (
  network: string,
  hash: string,
  json: boolean = false
) => {
  const client = new ZetaChainClient({ network });
  const s = new Spinnies();
  const emitter = new EventEmitter();
  emitter
    .on("search-add", ({ text }: EmitterArgs) => s.add(`search`, { text }))
    .on("search-end", ({ text }: EmitterArgs) => s.succeed(`search`, { text }))
    .on("add", ({ hash, text }: EmitterArgs) => s.add(hash, { text }))
    .on("succeed", ({ hash, text }: EmitterArgs) => s.succeed(hash, { text }))
    .on("fail", ({ hash, text }: EmitterArgs) => s.fail(hash, { text }))
    .on("update", ({ hash, text }: EmitterArgs) => s.update(hash, { text }));
  await client.trackCCTX({ emitter, hash, json });
};

const cctxArgsSchema = z.object({
  json: z.boolean().optional(),
  mainnet: z.boolean().optional(),
  tx: z.string(),
});

type CctxArgs = z.infer<typeof cctxArgsSchema>;

const main = async (args: CctxArgs) => {
  const { data: parsedArgs, success, error } = cctxArgsSchema.safeParse(args);

  if (!success) {
    console.error("Invalid arguments:", error?.message);
    return;
  }

  const network = parsedArgs.mainnet ? "mainnet" : "testnet";

  await trackCCTXInteractive(network, parsedArgs.tx, parsedArgs.json);
};

export const cctxTask = task(
  "cctx",
  "Track cross-chain transaction status",
  main
)
  .addPositionalParam("tx", "Hash of an inbound or a cross-chain transaction")
  .addFlag("json", "Output as JSON")
  .addFlag("mainnet", "Run the task on mainnet");
