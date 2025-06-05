import { Command } from "commander";
import { z } from "zod";

const cctxOptionsSchema = z.object({
  hash: z.string(),
  rpc: z.string(),
});

type CctxOptions = z.infer<typeof cctxOptionsSchema>;

const main = async (options: CctxOptions) => {
  console.log(options);
};

export const cctxCommand = new Command("cctx")
  .description("Query the CCTX")
  .option("-h, --hash <hash>", "Inbound transaction hash")
  .option(
    "-r, --rpc <rpc>",
    "RPC URL",
    "https://zetachain-athens-evm.blockpi.network/v1/rpc/public"
  )
  .action(async (options) => {
    await main(options);
  });
