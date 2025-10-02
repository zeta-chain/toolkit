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

const redelegateOptionsSchema = z
  .object({
    amount: z.string(),
    chainId: z.string().optional(),
    fromValidator: z.string(),
    name: z.string().default("default"),
    privateKey: z.string().optional(),
    rpc: z.string().optional(),
    toValidator: z.string(),
    yes: z.boolean().default(false),
  })
  .refine(namePkRefineRule);

type RedelegateOptions = z.infer<typeof redelegateOptionsSchema>;

const main = async (options: RedelegateOptions) => {
  try {
    const { signer } = setupZetachainTransaction({
      chainId: options.chainId,
      name: options.name,
      privateKey: options.privateKey,
      rpc: options.rpc,
    } satisfies SetupTxOptionsSubset);

    const delegatorAddress = await signer.getAddress();
    const amountWei = ethers.parseEther(options.amount);

    console.log(`Staking redelegation details:
Delegator:   ${delegatorAddress}
From (src):  ${options.fromValidator}
To (dst):    ${options.toValidator}
Amount:      ${options.amount} ZETA
`);

    const isConfirmed = await confirmZetachainTransaction({
      yes: options.yes,
    } satisfies ConfirmTxOptionsSubset);
    if (!isConfirmed) return;

    const iface = new ethers.Interface(STAKING_ABI);
    const data = iface.encodeFunctionData("redelegate", [
      delegatorAddress,
      options.fromValidator,
      options.toValidator,
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
      context: "Error during staking redelegation",
      error,
      shouldThrow: false,
    });
    process.exit(1);
  }
};

export const redelegateCommand = new Command("redelegate").summary(
  "Redelegate ZETA from one validator to another via the staking precompile"
);

redelegateCommand
  .addOption(
    new Option(
      "--from-validator <valoper>",
      "Source validator operator address (zetavaloper...)"
    ).makeOptionMandatory()
  )
  .addOption(
    new Option(
      "--to-validator <valoper>",
      "Destination validator operator address (zetavaloper...)"
    ).makeOptionMandatory()
  )
  .addOption(
    new Option(
      "--amount <amount>",
      "Amount of ZETA to redelegate"
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
      redelegateOptionsSchema,
      {
        exitOnError: true,
      }
    );
    await main(options);
  });
