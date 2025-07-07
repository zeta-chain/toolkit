import { z } from "zod";

import { solanaDepositAndCall } from "../../../../src/chains/solana/depositAndCall";
import { SOLANA_TOKEN_PROGRAM } from "../../../../types/shared.constants";
import { handleError, validateAndParseSchema } from "../../../../utils";
import { parseAbiValues } from "../../../../utils/parseAbiValues";
import {
  confirmSolanaTx,
  createRevertOptions,
  createSolanaCommandWithCommonOptions,
  getAPIbyChainId,
  getKeypair,
  prepareRevertOptions,
  solanaDepositAndCallOptionsSchema,
} from "../../../../utils/solana.commands.helpers";

type DepositAndCallOptions = z.infer<typeof solanaDepositAndCallOptionsSchema>;

const main = async (options: DepositAndCallOptions) => {
  const keypair = await getKeypair({
    mnemonic: options.mnemonic,
    name: options.name,
    privateKey: options.privateKey,
  });

  const API = getAPIbyChainId(options.chainId);

  const stringifiedTypes = JSON.stringify(options.types);
  const values = parseAbiValues(stringifiedTypes, options.values);

  const revertOptions = prepareRevertOptions(options);

  await confirmSolanaTx({
    amount: options.amount,
    api: API,
    message: values.join(", "),
    mint: options.mint,
    recipient: options.recipient,
    revertOptions: createRevertOptions(revertOptions, keypair.publicKey),
    sender: keypair.publicKey.toBase58(),
  });

  try {
    const tx = await solanaDepositAndCall(
      {
        amount: options.amount,
        receiver: options.recipient,
        revertOptions,
        token: options.mint,
        types: options.types,
        values,
      },
      {
        chainId: options.chainId,
        signer: keypair,
      }
    );
    console.log("Transaction hash:", tx);
  } catch (error) {
    handleError({
      context: "Error during deposit and call",
      error,
      shouldThrow: false,
    });
    process.exit(1);
  }
};

export const depositAndCallCommand = createSolanaCommandWithCommonOptions(
  "deposit-and-call"
)
  .description(
    "Deposit tokens from Solana and call a universal contract on ZetaChain"
  )
  .requiredOption("--amount <amount>", "Amount of tokens to deposit")
  .option(
    "--token-program <tokenProgram>",
    "Token program",
    SOLANA_TOKEN_PROGRAM
  )
  .requiredOption(
    "--types <types...>",
    "List of parameter types (e.g. uint256 address)"
  )
  .requiredOption(
    "--values <values...>",
    "Parameter values for the function call"
  )
  .option("--mint <mint>", "SPL token mint address")
  .action(async (options) => {
    const validatedOptions = validateAndParseSchema(
      options,
      solanaDepositAndCallOptionsSchema,
      {
        exitOnError: true,
      }
    );
    await main(validatedOptions);
  });
