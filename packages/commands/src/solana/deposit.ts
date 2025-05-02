import * as anchor from "@coral-xyz/anchor";
import { Keypair, PublicKey } from "@solana/web3.js";
import GATEWAY_DEV_IDL from "@zetachain/protocol-contracts-solana/prod/idl/gateway.json";
import * as bip39 from "bip39";
import { Command } from "commander";
import { ethers } from "ethers";
import bs58 from "bs58";

export interface DepositOptions {
  amount: string;
  from: string;
  idPath: string;
  mint: string; // SPL token account that belongs to the PDA
  mnemonic: string;
  privateKey: string;
  recipient: string;
  solanaNetwork: string; // SPL token account from which tokens are withdrawn
  to: string;
  tokenProgram: string; // SPL token mint address
}

export const keypairFromMnemonic = async (
  mnemonic: string
): Promise<Keypair> => {
  const seed = await bip39.mnemonicToSeed(mnemonic);
  const seedSlice = new Uint8Array(seed).slice(0, 32);
  return Keypair.fromSeed(seedSlice);
};

export const keypairFromPrivateKey = (privateKey: string): Keypair => {
  try {
    // Decode the base58 private key
    const decodedKey = bs58.decode(privateKey);
    return Keypair.fromSecretKey(decodedKey);
  } catch (error) {
    throw new Error(
      "Invalid private key format. Expected base58-encoded private key."
    );
  }
};

const main = async (options: DepositOptions) => {
  const Gateway_IDL = GATEWAY_DEV_IDL;

  let keypair: Keypair;
  if (options.privateKey) {
    keypair = keypairFromPrivateKey(options.privateKey);
  } else if (options.mnemonic) {
    keypair = await keypairFromMnemonic(options.mnemonic);
  } else {
    throw new Error("Either privateKey or mnemonic must be provided");
  }

  const provider = new anchor.AnchorProvider(
    new anchor.web3.Connection("https://api.devnet.solana.com"),
    new anchor.Wallet(keypair),
    {}
  );

  const gatewayProgram = new anchor.Program(
    Gateway_IDL as anchor.Idl,
    provider
  );

  const receiverBytes = ethers.getBytes(options.recipient);

  if (options.mint && options.from && options.to) {
    const tx = await gatewayProgram.methods
      .depositSplToken(
        new anchor.BN(ethers.parseUnits(options.amount, 9).toString()),
        receiverBytes
      )
      .accounts({
        from: options.from,
        mintAccount: options.mint,
        signer: keypair.publicKey,
        systemProgram: anchor.web3.SystemProgram.programId,
        to: options.to,
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
  .option("--id-path <idPath>", "Path to id.json")
  .option("--mnemonic <mnemonic>", "Mnemonic")
  .option("--private-key <privateKey>", "Private key in base58 format")
  .option("--token-program <tokenProgram>", "Token program")
  .option("--from <from>", "SPL token account from which tokens are withdrawn")
  .option("--to <to>", "SPL token account that belongs to the PDA")
  .option("--mint <mint>", "SPL token mint address")
  .action(main);
