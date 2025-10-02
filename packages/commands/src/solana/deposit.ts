import { z } from "zod";

import { solanaDeposit } from "../../../../src/chains/solana/deposit";
import { SOLANA_TOKEN_PROGRAM } from "../../../../types/shared.constants";
import { handleError, validateAndParseSchema } from "../../../../utils";
import {
  getAPIbyChainId,
  getBrowserSafeKeypair,
} from "../../../../utils/solana.browser.helpers";
import {
  confirmSolanaTx,
  createRevertOptions,
  createSolanaCommandWithCommonOptions,
  prepareRevertOptions,
  solanaDepositOptionsSchema,
} from "../../../../utils/solana.commands.helpers";

type DepositOptions = z.infer<typeof solanaDepositOptionsSchema>;

const main = async (options: DepositOptions) => {
  const keypair = await getBrowserSafeKeypair({
    mnemonic: options.mnemonic,
    name: options.name,
    privateKey: options.privateKey,
  });

  const API = getAPIbyChainId(options.chainId);

  const revertOptions = prepareRevertOptions(options);

  // Create an Anchor PublicKey for CLI confirmation (which expects Anchor types)
  const anchorPublicKey = new (
    await import("@coral-xyz/anchor")
  ).web3.PublicKey(keypair.publicKey.toBase58());

  await confirmSolanaTx({
    amount: options.amount,
    api: API,
    mint: options.mint,
    receiver: options.receiver,
    revertOptions: createRevertOptions(revertOptions, anchorPublicKey),
    sender: keypair.publicKey.toBase58(),
  });

  try {
    const tx = await solanaDeposit(
      {
        amount: options.amount,
        receiver: options.receiver,
        revertOptions,
        token: options.mint,
      },
      {
        chainId: options.chainId,
        signer: keypair,
      }
    );
    console.log("Transaction hash:", tx);
  } catch (error) {
    handleError({
      context: "Error during deposit",
      error,
      shouldThrow: false,
    });
    process.exit(1);
  }
};

export const depositCommand = createSolanaCommandWithCommonOptions("deposit")
  .summary("Deposit tokens from Solana")
  .requiredOption("--amount <amount>", "Amount of tokens to deposit")
  .option(
    "--token-program <tokenProgram>",
    "Token program",
    SOLANA_TOKEN_PROGRAM
  )
  .option("--mint <mint>", "SPL token mint address")
  .action(async (options) => {
    const validatedOptions = validateAndParseSchema(
      options,
      solanaDepositOptionsSchema,
      {
        exitOnError: true,
      }
    );
    await main(validatedOptions);
  });
