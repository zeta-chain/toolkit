import { task, types } from "hardhat/config";
import { HardhatRuntimeEnvironment } from "hardhat/types";

import { ZetaChainClient } from "@zetachain/client";

const main = async (args: any, hre: HardhatRuntimeEnvironment) => {
  const client = new ZetaChainClient({ network: "testnet" });
  const fees = await client.getFees(args.gas);

  if (args.json) {
    console.log(JSON.stringify(fees, null, 2));
  } else {
    console.log(
      "\nOmnichain fees (in native gas tokens of destination chain):"
    );
    console.table(fees.feesZEVM);
    console.log(
      `\nCross-chain messaging fees (in ZETA, gas limit: ${args.gas}):`
    );
    console.table(fees.feesCCM);
  }
};

export const feesTask = task(
  "fees",
  "Show omnichain and cross-chain messaging fees",
  main
)
  .addOptionalParam(
    "gas",
    "Gas limit for a cross-chain messaging transaction",
    500000,
    types.int
  )
  .addFlag("json", "Print the result in JSON format");
