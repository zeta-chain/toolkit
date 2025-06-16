import * as anchor from "@coral-xyz/anchor";
import { Wallet } from "@coral-xyz/anchor";
import {
  ASSOCIATED_TOKEN_PROGRAM_ID,
  TOKEN_PROGRAM_ID,
} from "@solana/spl-token";
import { PublicKey } from "@solana/web3.js";
import GATEWAY_DEV_IDL from "@zetachain/protocol-contracts-solana/dev/idl/gateway.json";
import GATEWAY_PROD_IDL from "@zetachain/protocol-contracts-solana/prod/idl/gateway.json";
import { ethers } from "ethers";
import { z } from "zod";

import { SOLANA_TOKEN_PROGRAM } from "../../../../types/shared.constants";
import { handleError, validateAndParseSchema } from "../../../../utils";
import {
  confirmSolanaTx,
  createRevertOptions,
  createSolanaCommandWithCommonOptions,
  getAPI,
  getKeypair,
  getSPLToken,
  isSOLBalanceSufficient,
  solanaDepositOptionsSchema,
} from "../../../../utils/solana.commands.helpers";

type DepositOptions = z.infer<typeof solanaDepositOptionsSchema>;

const main = async (options: DepositOptions) => {
  // Mainnet and devnet use the same IDL
  const gatewayIDL =
    options.network === "localnet" ? GATEWAY_DEV_IDL : GATEWAY_PROD_IDL;

  const keypair = await getKeypair({
    mnemonic: options.mnemonic,
    name: options.name,
    privateKey: options.privateKey,
  });

  const API = getAPI(options.network);

  const connection = new anchor.web3.Connection(API);
  const provider = new anchor.AnchorProvider(connection, new Wallet(keypair));
  const gatewayProgram = new anchor.Program(gatewayIDL as anchor.Idl, provider);

  const receiverBytes = ethers.getBytes(options.recipient);

  const revertOptions = createRevertOptions(options, provider.wallet.publicKey);

  const commonValues = {
    api: API,
    recipient: options.recipient,
    revertOptions,
    sender: keypair.publicKey.toBase58(),
  };

  try {
    if (options.mint) {
      const { from, decimals } = await getSPLToken(
        provider,
        options.mint,
        options.amount
      );

      // Find the TSS PDA (meta)
      const [tssPda] = PublicKey.findProgramAddressSync(
        [Buffer.from("meta", "utf-8")],
        gatewayProgram.programId
      );

      // Find the TSS's ATA for the mint
      const tssAta = await PublicKey.findProgramAddress(
        [
          tssPda.toBuffer(),
          TOKEN_PROGRAM_ID.toBuffer(),
          new PublicKey(options.mint).toBuffer(),
        ],
        ASSOCIATED_TOKEN_PROGRAM_ID
      );

      const to = tssAta[0].toBase58();

      await confirmSolanaTx({
        ...commonValues,
        amount: options.amount,
        mint: options.mint,
      });

      const tx = await gatewayProgram.methods
        .depositSplToken(
          new anchor.BN(ethers.parseUnits(options.amount, decimals).toString()),
          receiverBytes,
          revertOptions
        )
        .accounts({
          from,
          mintAccount: options.mint,
          signer: keypair.publicKey,
          systemProgram: anchor.web3.SystemProgram.programId,
          to,
          tokenProgram: TOKEN_PROGRAM_ID,
        })
        .rpc();
      console.log("Transaction hash:", tx);
    } else {
      // Check SOL balance
      await isSOLBalanceSufficient(provider, options.amount);

      const tx = await gatewayProgram.methods
        .deposit(
          new anchor.BN(ethers.parseUnits(options.amount, 9).toString()),
          receiverBytes,
          revertOptions
        )
        .accounts({})
        .rpc();
      console.log("Transaction hash:", tx);
    }
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
