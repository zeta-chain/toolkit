import * as anchor from "@coral-xyz/anchor";
import { Wallet } from "@coral-xyz/anchor";
import {
  AccountLayout,
  ASSOCIATED_TOKEN_PROGRAM_ID,
  TOKEN_PROGRAM_ID,
} from "@solana/spl-token";
import { clusterApiUrl, PublicKey } from "@solana/web3.js";
import GATEWAY_DEV_IDL from "@zetachain/protocol-contracts-solana/dev/idl/gateway.json";
import GATEWAY_PROD_IDL from "@zetachain/protocol-contracts-solana/prod/idl/gateway.json";
import { ethers } from "ethers";
import { z } from "zod";

import { SolanaAccountData } from "../../../../types/accounts.types";
import { SOLANA_TOKEN_PROGRAM } from "../../../../types/shared.constants";
import { handleError, validateAndParseSchema } from "../../../../utils";
import { getAccountData } from "../../../../utils/accounts";
import {
  createSolanaCommandWithCommonOptions,
  getAPI,
  getKeypair,
  solanaDepositOptionsSchema,
} from "../../../../utils/solana.commands.helpers";

type DepositOptions = z.infer<typeof solanaDepositOptionsSchema>;

const main = async (options: DepositOptions) => {
  // Mainnet and devnet use the same IDL
  const gatewayIDL =
    options.network === "localnet" ? GATEWAY_DEV_IDL : GATEWAY_PROD_IDL;

  let keypair = await getKeypair({
    name: options.name,
    mnemonic: options.mnemonic,
    privateKey: options.privateKey,
  });

  const API = getAPI(options.network);

  const connection = new anchor.web3.Connection(API);
  const provider = new anchor.AnchorProvider(connection, new Wallet(keypair!));
  const gatewayProgram = new anchor.Program(gatewayIDL as anchor.Idl, provider);
  const tokenAccounts = await connection.getTokenAccountsByOwner(
    provider.wallet.publicKey,
    { programId: TOKEN_PROGRAM_ID }
  );

  const receiverBytes = ethers.getBytes(options.recipient);

  const revertOptions = {
    abortAddress: ethers.getBytes(options.abortAddress),
    callOnRevert: options.callOnRevert,
    onRevertGasLimit: new anchor.BN(options.onRevertGasLimit ?? 0),
    revertAddress: options.revertAddress
      ? new PublicKey(options.revertAddress)
      : provider.wallet.publicKey,
    revertMessage: Buffer.from(options.revertMessage, "utf8"),
  };

  try {
    if (options.mint) {
      const mintInfo = await connection.getTokenSupply(
        new PublicKey(options.mint)
      );
      const decimals = mintInfo.value.decimals;

      // Find the token account that matches the mint
      const matchingTokenAccount = tokenAccounts.value.find(({ account }) => {
        const data = AccountLayout.decode(account.data);
        return new PublicKey(data.mint).toBase58() === options.mint;
      });

      if (!matchingTokenAccount) {
        throw new Error(`No token account found for mint ${options.mint}`);
      }

      // Check token balance
      const accountInfo = await connection.getTokenAccountBalance(
        matchingTokenAccount.pubkey
      );
      const balance = accountInfo.value.uiAmount;
      const amountToSend = parseFloat(options.amount);
      if (!balance || balance < amountToSend) {
        throw new Error(
          `Insufficient token balance. Available: ${
            balance ?? 0
          }, Required: ${amountToSend}`
        );
      }

      const from = matchingTokenAccount.pubkey;

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

      const tx = await gatewayProgram.methods
        .depositSplToken(
          new anchor.BN(ethers.parseUnits(options.amount, decimals).toString()),
          receiverBytes,
          revertOptions
        )
        .accounts({
          from,
          mintAccount: options.mint,
          signer: keypair!.publicKey,
          systemProgram: anchor.web3.SystemProgram.programId,
          to,
          tokenProgram: options.tokenProgram,
        })
        .rpc();
      console.log("Transaction hash:", tx);
    } else {
      // Check SOL balance
      const balance = await connection.getBalance(keypair!.publicKey);
      const lamportsNeeded = ethers.parseUnits(options.amount, 9).toString();
      if (balance < parseInt(lamportsNeeded)) {
        throw new Error(
          `Insufficient SOL balance. Available: ${balance / 1e9}, Required: ${
            options.amount
          }`
        );
      }
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
