import EventEmitter from "eventemitter3";
import { task } from "hardhat/config";
import Spinnies from "spinnies";

import { ZetaChainClient } from "../../client/src/";

const trackCCTXInteractive = async (hash: string, json: Boolean = false) => {
  const client = new ZetaChainClient({ network: "testnet" });
  const s = new Spinnies();
  const emitter = new EventEmitter();
  emitter
    .on("search-add", ({ text }) => s.add(`search`, { text }))
    .on("search-end", ({ text }) => s.succeed(`search`, { text }))
    .on("add", ({ hash, text }) => s.add(hash, { text }))
    .on("succeed", ({ hash, text }) => s.succeed(hash, { text }))
    .on("fail", ({ hash, text }) => s.fail(hash, { text }))
    .on("update", ({ hash, text }) => s.update(hash, { text }));
  await client.trackCCTX(hash, json, emitter);
};

const main = async (args: any) => {
  await trackCCTXInteractive(args.tx, args.json);
};

export const cctxTask = task(
  "cctx",
  "Track cross-chain transaction status",
  main
)
  .addPositionalParam("tx", "Hash of an inbound or a cross-chain transaction")
  .addFlag("json", "Output as JSON");
