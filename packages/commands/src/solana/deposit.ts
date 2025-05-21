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
import { validateAndParseSchema } from "../../../../utils";
import { solanaDepositOptionsSchema } from "../../../../utils/solana.commands.helpers";
import { z } from "zod";
import { SOLANA_NETWORKS } from "../../../../types/shared.constants";

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
  } else {
    throw new Error("Either privateKey or mnemonic must be provided");
  }

  let API = "http://localhost:8899";
  if (options.network === "devnet") {
    API = clusterApiUrl("devnet");
  } else if (options.network === "mainnet") {
    API = clusterApiUrl("mainnet-beta");
  }

  const connection = new anchor.web3.Connection(API);

  const provider = new anchor.AnchorProvider(
    connection,
    new Wallet(keypair),
    {}
  );

  const gatewayProgram = new anchor.Program(gatewayIDL as anchor.Idl, provider);

  const receiverBytes = ethers.getBytes(options.recipient);

  const tokenAccounts = await connection.getTokenAccountsByOwner(
    provider.wallet.publicKey,
    {
      programId: TOKEN_PROGRAM_ID,
    }
  );

  if (options.mint) {
    // Find the token account that matches the mint
    const matchingTokenAccount = tokenAccounts.value.find(({ account }) => {
      const data = AccountLayout.decode(account.data);
      return new PublicKey(data.mint).toBase58() === options.mint;
    });

    if (!matchingTokenAccount) {
      throw new Error(`No token account found for mint ${options.mint}`);
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
        new anchor.BN(ethers.parseUnits(options.amount, 9).toString()),
        receiverBytes,
        null
      )
      .accounts({
        from,
        mintAccount: options.mint,
        signer: keypair.publicKey,
        systemProgram: anchor.web3.SystemProgram.programId,
        to,
        tokenProgram: options.tokenProgram,
      })
      .rpc();
    console.log("Transaction hash:", tx);
  } else {
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
};

export const depositCommand = new Command("deposit")
  .description("Deposit tokens from Solana")
  .requiredOption("--amount <amount>", "Amount of tokens to deposit")
  .requiredOption("--recipient <recipient>", "Recipient address")
  .option("--mnemonic <mnemonic>", "Mnemonic")
  .option("--private-key <privateKey>", "Private key in base58 format")
  .option(
    "--token-program <tokenProgram>",
    "Token program",
    "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
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
