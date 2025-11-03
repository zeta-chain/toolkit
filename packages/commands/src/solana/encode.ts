import { Command } from "commander";

import { EncodeOptions, solanaEncode } from "../../../client/src/solanaEncode";

const main = async (options: EncodeOptions) => {
  try {
    const encoded = await solanaEncode(options);
    console.log(encoded);
  } catch (error) {
    console.error("Error encoding Solana payload:", error);
    process.exit(1);
  }
};

export const encodeCommand = new Command("encode")
  .summary("Encode payload data for Solana")
  .requiredOption(
    "--connected <address>",
    "Connected program address used to derive the PDA"
  )
  .requiredOption("--data <data>", "Data to encode")
  .requiredOption("--gateway <address>", "Gateway program address")
  .option("--mint <address>", "Mint address for SPL token operations")
  .option(
    "--accounts <accounts...>",
    "Additional accounts in format 'address:isWritable'"
  )
  .action(main);
