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
import * as bip39 from "bip39";
import bs58 from "bs58";
import { Command, Option } from "commander";
import { ethers } from "ethers";
import { z } from "zod";

import {
  SOLANA_NETWORKS,
  SOLANA_TOKEN_PROGRAM,
} from "../../../../types/shared.constants";
import { handleError, validateAndParseSchema } from "../../../../utils";
import { solanaDepositOptionsSchema } from "../../../../utils/solana.commands.helpers";

type DepositOptions = z.infer<typeof solanaDepositOptionsSchema>;

export const keypairFromMnemonic = async (
  mnemonic: string
): Promise<anchor.web3.Keypair> => {
  const seed = await bip39.mnemonicToSeed(mnemonic);
  const seedSlice = new Uint8Array(seed).slice(0, 32);
  return anchor.web3.Keypair.fromSeed(seedSlice);
};

export const keypairFromPrivateKey = (
  privateKey: string
): anchor.web3.Keypair => {
  try {
    const decodedKey = bs58.decode(privateKey);
    return anchor.web3.Keypair.fromSecretKey(decodedKey);
  } catch (error) {
    throw new Error(
      "Invalid private key format. Expected base58-encoded private key."
    );
  }
};

const main = async (options: DepositOptions) => {
  // Mainnet and devnet use the same IDL
  const gatewayIDL =
    options.network === "localnet" ? GATEWAY_DEV_IDL : GATEWAY_PROD_IDL;

  let keypair: anchor.web3.Keypair;
  if (options.privateKey) {
    keypair = keypairFromPrivateKey(options.privateKey);
  } else if (options.mnemonic) {
    keypair = await keypairFromMnemonic(options.mnemonic);
  }

  let API = "http://localhost:8899";
  if (options.network === "devnet") {
    API = clusterApiUrl("devnet");
  } else if (options.network === "mainnet") {
    API = clusterApiUrl("mainnet-beta");
  }

  const connection = new anchor.web3.Connection(API);

  const provider = new anchor.AnchorProvider(connection, new Wallet(keypair!));

  const gatewayProgram = new anchor.Program(gatewayIDL as anchor.Idl, provider);

  const receiverBytes = ethers.getBytes(options.recipient);

  const tokenAccounts = await connection.getTokenAccountsByOwner(
    provider.wallet.publicKey,
    {
      programId: TOKEN_PROGRAM_ID,
    }
  );

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
          null
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
          null
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

export const depositCommand = new Command("deposit")
  .description("Deposit tokens from Solana")
  .requiredOption("--amount <amount>", "Amount of tokens to deposit")
  .requiredOption("--recipient <recipient>", "Recipient address")
  .addOption(
    new Option("--mnemonic <mnemonic>", "Mnemonic").conflicts(["private-key"])
  )
  .addOption(
    new Option(
      "--private-key <privateKey>",
      "Private key in base58 format"
    ).conflicts(["mnemonic"])
  )
  .option(
    "--token-program <tokenProgram>",
    "Token program",
    SOLANA_TOKEN_PROGRAM
  )
  .option("--mint <mint>", "SPL token mint address")
  .addOption(
    new Option("--network <network>", "Solana network").choices(SOLANA_NETWORKS)
  )
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
