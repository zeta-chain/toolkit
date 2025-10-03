import { Command } from "commander";
import { getBorderCharacters, table } from "table";

import { convertAddressAll } from "../../../../utils/address";

export const addressCommand = new Command("address")
  .summary(
    "Show all address formats (bytes, hex, bech32 acc/valoper/valcons) for any input"
  )
  .argument(
    "<address>",
    "Address in hex (0x... or without 0x), bech32, or [..] bytes"
  )
  .action((address: string) => {
    try {
      const result = convertAddressAll(address);
      const rows = [
        ["Format", "Address"],
        ["Address (hex)", result.checksumHex],
        ["Bech32 Acc", result.bech32Acc],
        ["Bech32 Val", result.bech32Valoper],
        ["Bech32 Con", result.bech32Valcons],
      ];
      console.log(table(rows, { border: getBorderCharacters("norc") }));
    } catch (error) {
      console.error("Failed to convert address:", error);
      process.exit(1);
    }
  });
