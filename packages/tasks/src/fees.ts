import { task, types } from "hardhat/config";
import { z } from "zod";

import { ZetaChainClient } from "../../client/src/";

const feesArgsSchema = z.object({
  gas: z.number().int().min(0),
  json: z.boolean().optional(),
  mainnet: z.boolean().optional(),
});

type FeesArgs = z.infer<typeof feesArgsSchema>;

const main = async (args: FeesArgs) => {
  const { data: parsedArgs, success, error } = feesArgsSchema.safeParse(args);

  if (!success) {
    throw new Error(`Invalid arguments: ${error?.message}`);
  }

  const client = new ZetaChainClient({
    network: parsedArgs.mainnet ? "mainnet" : "testnet",
  });

  const fees = await client.getFees(parsedArgs.gas);

  if (parsedArgs.json) {
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
