import { task, types } from "hardhat/config";
import { HardhatRuntimeEnvironment } from "hardhat/types";

import { ZetaChainClient } from "../../client/src/";

const main = async (args: any, hre: HardhatRuntimeEnvironment) => {
  const client = new ZetaChainClient({
    network: args.mainnet ? "mainnet" : "testnet",
  });

  const fees = await client.getFees(args.gas);

  if (args.json) {
    console.log(JSON.stringify(fees, null, 2));
  } else {
    console.log(
      "\nOmnichain withdraw fees (in native gas tokens of destination chain):"
    );
    console.table(
      fees.omnichain.map(
        ({ description, totalFee, gasFee, protocolFee, foreign_chain_id }) => ({
          description,
          foreign_chain_id,
          gasFee,
          protocolFee,
          totalFee,
        })
      )
    );
    console.log(
      `\nCross-chain messaging fees (in ZETA, gas limit: ${args.gas}):`
    );
    console.table(fees.messaging);
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
  .addFlag("json", "Print the result in JSON format")
  .addFlag("mainnet", "Run the task on mainnet");
