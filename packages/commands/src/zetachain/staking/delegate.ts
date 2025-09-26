import { Command, Option } from "commander";
import { ethers } from "ethers";
import { z } from "zod";

import stakingArtifact from "../../query/validators/staking.json";
import { handleError, validateAndParseSchema } from "../../../../../utils";
import {
  namePkRefineRule,
  rpcOrChainIdRefineRule,
} from "../../../../../types/shared.schema";
import {
  confirmZetachainTransaction,
  setupZetachainTransaction,
} from "../../../../../utils/zetachain.command.helpers";

const STAKING_PRECOMPILE = "0x0000000000000000000000000000000000000800";
const STAKING_ABI = (stakingArtifact as { abi: unknown })
  .abi as ethers.InterfaceAbi;

const delegateOptionsSchema = z
  .object({
    amount: z.string(),
    chainId: z.string().optional(),
    name: z.string().default("default"),
    privateKey: z.string().optional(),
    rpc: z.string().optional(),
    validator: z.string(),
    yes: z.boolean().default(false),
  })
  .refine(namePkRefineRule)
  .refine(rpcOrChainIdRefineRule.rule, {
    message: rpcOrChainIdRefineRule.message,
  });

type DelegateOptions = z.infer<typeof delegateOptionsSchema>;

const main = async (options: DelegateOptions) => {
  try {
    const { signer } = setupZetachainTransaction(options as any);

    const delegatorAddress = await (signer as ethers.Wallet).getAddress();
    const amountWei = ethers.parseEther(options.amount);

    console.log(`Staking delegation details:
Delegator: ${delegatorAddress}
Validator: ${options.validator}
Amount:    ${options.amount} ZETA
`);

    const isConfirmed = await confirmZetachainTransaction(options as any);
    if (!isConfirmed) return;

    const contract = new ethers.Contract(
      STAKING_PRECOMPILE,
      STAKING_ABI,
      signer
    );

    const tx = await contract.delegate(
      delegatorAddress,
      options.validator,
      amountWei,
      { value: amountWei }
    );

    const receipt = await tx.wait();
    console.log("Transaction hash:", receipt?.hash);
  } catch (error) {
    handleError({
      context: "Error during staking delegation",
      error,
      shouldThrow: false,
    });
    process.exit(1);
  }
};

export const delegateCommand = new Command("delegate").summary(
  "Delegate ZETA to a validator via the staking precompile"
);

delegateCommand
  .addOption(
    new Option(
      "--validator <valoper>",
      "Validator operator address (cosmosvaloper…)"
    ).makeOptionMandatory()
  )
  .addOption(
    new Option(
      "--amount <amount>",
      "Amount of ZETA to delegate"
    ).makeOptionMandatory()
  )
  .addOption(
    new Option("--name <name>", "Account name")
      .default("default")
      .conflicts(["private-key"])
  )
  .addOption(
    new Option("--private-key <key>", "Private key for signing").conflicts([
      "name",
    ])
  )
  .addOption(new Option("--rpc <url>", "ZetaChain RPC URL"))
  .addOption(new Option("--chain-id <id>", "ZetaChain chain ID"))
  .addOption(new Option("--yes", "Skip confirmation").default(false))
  .action(async (rawOptions) => {
    const options = validateAndParseSchema(rawOptions, delegateOptionsSchema, {
      exitOnError: true,
    });
    await main(options);
  });
