import { z } from "zod";

import { solanaDeposit } from "../../../../src/lib/solana/deposit";
import { SOLANA_TOKEN_PROGRAM } from "../../../../types/shared.constants";
import { handleError, validateAndParseSchema } from "../../../../utils";
import {
  confirmSolanaTx,
  createRevertOptions,
  createSolanaCommandWithCommonOptions,
  getAPI,
  getChainIdFromNetwork,
  getKeypair,
  solanaDepositOptionsSchema,
} from "../../../../utils/solana.commands.helpers";

type DepositOptions = z.infer<typeof solanaDepositOptionsSchema>;

const main = async (options: DepositOptions) => {
  const keypair = await getKeypair({
    mnemonic: options.mnemonic,
    name: options.name,
    privateKey: options.privateKey,
  });

  const API = getAPI(options.network);

  await confirmSolanaTx({
    amount: options.amount,
    api: API,
    mint: options.mint,
    recipient: options.recipient,
    revertOptions: createRevertOptions(options, keypair.publicKey),
    sender: keypair.publicKey.toBase58(),
  });

  try {
    const revertOptions = {
      abortAddress: options.abortAddress,
      callOnRevert: options.callOnRevert,
      onRevertGasLimit: options.onRevertGasLimit,
      revertAddress: options.revertAddress,
      revertMessage: options.revertMessage,
    };

    await solanaDeposit(
      {
        amount: options.amount,
        receiver: options.recipient,
        revertOptions,
        token: options.mint,
      },
      {
        chainId: getChainIdFromNetwork(options.network),
        signer: keypair,
      }
    );
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
  .description("Deposit tokens from Solana")
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
