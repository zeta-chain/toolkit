import { Command } from "commander";

import {
  bech32ToHex,
  hexToBech32,
  isBech32Address,
  isHexAddress,
  ZETA_HRP,
} from "../../../../utils/address";

export const addressCommand = new Command("address")
  .summary("Convert addresses between hex (0x...) and bech32 (zeta1...)")
  .argument("<address>", "Address to convert (hex or bech32)")
  .action((address: string) => {
    try {
      if (isHexAddress(address)) {
        const result = hexToBech32(address, ZETA_HRP);
        console.log(result);
        return;
      }

      if (isBech32Address(address)) {
        const result = bech32ToHex(address);
        console.log(result);
        return;
      }

      console.error(
        "Invalid address format. Provide a valid 0x... EVM address or zeta1... bech32 address"
      );
      process.exit(1);
    } catch (error) {
      console.error("Failed to convert address:", error);
      process.exit(1);
    }
  });
