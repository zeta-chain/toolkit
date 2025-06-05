import EventEmitter from "eventemitter3";
import { task, types } from "hardhat/config";
import Spinnies from "spinnies";
import { z } from "zod";

import { validateAndParseSchema } from "../../../utils";
import { ZetaChainClient } from "../../client/src/";

interface EmitterArgs {
  hash: string;
  text: string;
}

const trackCCTXInteractive = async (
  network: string,
  hash: string,
  json: boolean = false,
  timeoutSeconds: number = 60
) => {
  const client = new ZetaChainClient({ network });

  // Configure spinners with better options
  const s = new Spinnies({
    failColor: "redBright",
    spinner: {
      frames: ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"],
      interval: 80,
    },
    spinnerColor: "blueBright",
    succeedColor: "greenBright",
  });

  const emitter = new EventEmitter();

  // Cleaner event handlers with fixed symbols
  emitter
    .on("search-add", ({ text }: EmitterArgs) => {
      // Just update the text without adding additional symbols
      s.add(`search`, { color: "blueBright", text });
    })
    .on("search-end", ({ text }: EmitterArgs) => {
      // Use a single checkmark
      s.succeed(`search`, { text });
    })
    .on("search-update", ({ text }: EmitterArgs) => {
      // Just update the text but keep the spinner going
      s.update(`search`, { text });
    })
    .on("search-fail", ({ text }: EmitterArgs) => {
      // Failed search with error message
      s.fail(`search`, { text });

      // When search fails, also log to console more prominently
      console.log(`\n❌ ${text}`);
    })
    .on("add", ({ hash, text }: EmitterArgs) => {
      s.add(hash, { text });
    })
    .on("succeed", ({ hash, text }: EmitterArgs) => {
      // Use a single checkmark
      s.succeed(hash, { text });
    })
    .on("fail", ({ hash, text }: EmitterArgs) => {
      // Use a single X
      s.fail(hash, { text });
    })
    .on("update", ({ hash, text }: EmitterArgs) => {
      s.update(hash, { text });
    })
    .on("mined-success", () => {
      console.log("\n✅ All transactions completed successfully");
    })
    .on("mined-fail", () => {
      console.log("\n❌ Some transactions failed or were aborted");
    });

  try {
    await client.trackCCTX({
      emitter,
      hash,
      json,
      timeoutSeconds,
    });
  } catch (error) {
    // Errors are already handled by the emitter events
    if (json) {
      console.error(error);
    }
  }
};

const cctxArgsSchema = z.object({
  json: z.boolean().optional(),
  mainnet: z.boolean().optional(),
  timeout: z.number().optional(),
  tx: z.string(),
});

type CctxArgs = z.infer<typeof cctxArgsSchema>;

const main = async (args: CctxArgs) => {
  const parsedArgs = validateAndParseSchema(args, cctxArgsSchema);

  const network = parsedArgs.mainnet ? "mainnet" : "testnet";
  console.log(`Tracking transaction on ${network}`);

  await trackCCTXInteractive(
    network,
    parsedArgs.tx,
    parsedArgs.json,
    parsedArgs.timeout || 60
  );
};

export const cctxTask = task(
  "cctx",
  "Track cross-chain transaction status",
  main
)
  .addPositionalParam("tx", "Hash of an inbound or a cross-chain transaction")
  .addFlag("json", "Output as JSON")
  .addFlag("mainnet", "Run the task on mainnet")
  .addOptionalParam(
    "timeout",
    "Timeout in seconds (default: 60)",
    60,
    types.int
  );
