import { Command, Option } from "commander";
import { ethers } from "ethers";
import { z } from "zod";

import { STAKING_PRECOMPILE } from "../../../../src/constants/addresses";
import { namePkRefineRule } from "../../../../types/shared.schema";
import { handleError, validateAndParseSchema } from "../../../../utils";
import type {
  ConfirmTxOptionsSubset,
  SetupTxOptionsSubset,
} from "../../../../utils/zetachain.command.helpers";
import {
  confirmZetachainTransaction,
  setupZetachainTransaction,
} from "../../../../utils/zetachain.command.helpers";
import stakingArtifact from "./staking.json";

const STAKING_ABI = (stakingArtifact as { abi: unknown })
  .abi as ethers.InterfaceAbi;

const undelegateOptionsSchema = z
  .object({
    amount: z.string(),
    chainId: z.string().optional(),
    name: z.string().default("default"),
    privateKey: z.string().optional(),
    rpc: z.string().optional(),
    validator: z.string(),
    yes: z.boolean().default(false),
  })
  .refine(namePkRefineRule);

type UndelegateOptions = z.infer<typeof undelegateOptionsSchema>;

const main = async (options: UndelegateOptions) => {
  try {
    const { signer } = setupZetachainTransaction({
      chainId: options.chainId,
      name: options.name,
      privateKey: options.privateKey,
      rpc: options.rpc,
    } satisfies SetupTxOptionsSubset);

    const delegatorAddress = await signer.getAddress();
    const amountWei = ethers.parseEther(options.amount);

    console.log(`Staking undelegation details:
Delegator: ${delegatorAddress}
Validator: ${options.validator}
Amount:    ${options.amount} ZETA
`);

    const isConfirmed = await confirmZetachainTransaction({
      yes: options.yes,
    } satisfies ConfirmTxOptionsSubset);
    if (!isConfirmed) return;

    const iface = new ethers.Interface(STAKING_ABI);
    const data = iface.encodeFunctionData("undelegate", [
      delegatorAddress,
      options.validator,
      amountWei,
    ]);

    const tx = await signer.sendTransaction({
      data,
      to: STAKING_PRECOMPILE,
    });

    const receipt = await tx.wait();
    console.log("Transaction hash:", tx.hash ?? receipt?.hash);
  } catch (error) {
    handleError({
      context: "Error during staking undelegation",
      error,
      shouldThrow: false,
    });
    process.exit(1);
  }
};

export const undelegateCommand = new Command("undelegate").summary(
  "Undelegate ZETA from a validator via the staking precompile"
);

undelegateCommand
  .addOption(
    new Option(
      "--validator <valoper>",
      "Validator operator address (zetavaloper...)"
    ).makeOptionMandatory()
  )
  .addOption(
    new Option(
      "--amount <amount>",
      "Amount of ZETA to undelegate"
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
    const options = validateAndParseSchema(
      rawOptions,
      undelegateOptionsSchema,
      {
        exitOnError: true,
      }
    );
    await main(options);
  });
