import { Command } from "commander";
import { solanaEncode, EncodeOptions } from "../../client/src/solanaEncode";

const main = async (options: EncodeOptions) => {
  try {
    await solanaEncode(options);
  } catch (error) {
    console.error("Error encoding Solana payload:", error);
    process.exit(1);
  }
};

export const solanaEncodeCommand = new Command("encode")
  .description("Encode payload data for Solana")
  .requiredOption("--connected <address>", "Connected PDA account address")
  .requiredOption("--data <data>", "Data to encode")
  .requiredOption("--gateway <address>", "Gateway program address")
  .option("--mint <address>", "Mint address for SPL token operations")
  .option(
    "--accounts <accounts...>",
    "Additional accounts in format 'address:isWritable'"
  )
  .action(main);
