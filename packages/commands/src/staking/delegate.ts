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
  .refine(namePkRefineRule);

type DelegateOptions = z.infer<typeof delegateOptionsSchema>;

const main = async (options: DelegateOptions) => {
  try {
    const { signer } = setupZetachainTransaction({
      chainId: options.chainId,
      name: options.name,
      privateKey: options.privateKey,
      rpc: options.rpc,
    } satisfies SetupTxOptionsSubset);

    const delegatorAddress = await signer.getAddress();
    const amountWei = ethers.parseEther(options.amount);

    console.log(`Staking delegation details:
Delegator: ${delegatorAddress}
Validator: ${options.validator}
Amount:    ${options.amount} ZETA
`);

    const isConfirmed = await confirmZetachainTransaction({
      yes: options.yes,
    } satisfies ConfirmTxOptionsSubset);
    if (!isConfirmed) return;

    const iface = new ethers.Interface(STAKING_ABI);
    const data = iface.encodeFunctionData("delegate", [
      delegatorAddress,
      options.validator,
      amountWei,
    ]);

    const tx = await signer.sendTransaction({
      data,
      to: STAKING_PRECOMPILE,
      value: amountWei,
    });

    const receipt = await tx.wait();
    console.log("Transaction hash:", tx.hash ?? receipt?.hash);
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
      "Validator operator address (zetavaloper...)"
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
