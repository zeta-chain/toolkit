import { Command } from "commander";

import { EncodeOptions, suiEncode } from "../../../client/src/suiEncode";

const main = (options: EncodeOptions) => {
  try {
    if (options.objects) {
      options.objects = options.objects.flatMap((obj) => obj.split(","));
    }
    const encoded = suiEncode(options);
    console.log(encoded);
  } catch (error) {
    console.error("Error encoding SUI payload:", error);
    process.exit(1);
  }
};

export const encodeCommand = new Command("encode")
  .summary("Encode payload data for SUI")
  .requiredOption("--data <data>", "Data to encode")
  .option(
    "--type-arguments <typeArguments...>",
    "Type arguments for the encoding"
  )
  .option(
    "--objects <objects...>",
    "Objects to include in the encoding (comma-separated)"
  )
  .action(main);
