import { Command } from "commander";
import * as anchor from "@coral-xyz/anchor";
import { TransactionMessage, VersionedTransaction } from "@solana/web3.js";
import GATEWAY_DEV_IDL from "@zetachain/protocol-contracts-solana/dev/idl/gateway.json";
import GATEWAY_PROD_IDL from "@zetachain/protocol-contracts-solana/prod/idl/gateway.json";
import { ethers } from "ethers";
import * as fs from "fs";
import { Keypair } from "@solana/web3.js";
import * as bip39 from "bip39";
const SEED = "meta";

export interface DepositOptions {
  amount: string;
  recipient: string;
  solanaNetwork: string;
  idPath: string;
  mnemonic: string;
  privateKey: string;
  tokenProgram: string;
  from: string; // SPL token account from which tokens are withdrawn
  to: string; // SPL token account that belongs to the PDA
  mint: string; // SPL token mint address
}

export const keypairFromMnemonic = async (
  mnemonic: string
): Promise<Keypair> => {
  const seed = await bip39.mnemonicToSeed(mnemonic);
  const seedSlice = new Uint8Array(seed).slice(0, 32);
  return Keypair.fromSeed(seedSlice);
};

const main = async (options: DepositOptions) => {
  const Gateway_IDL = GATEWAY_DEV_IDL;

  const keypair = await keypairFromMnemonic(options.mnemonic);

  const provider = new anchor.AnchorProvider(
    new anchor.web3.Connection("http://localhost:8899"),
    new anchor.Wallet(keypair),
    {}
  );

  const gatewayProgram = new anchor.Program(
    Gateway_IDL as anchor.Idl,
    provider
  );

  const SEED = "meta";
  const programId = new anchor.web3.PublicKey(Gateway_IDL.address);

  const seeds = [Buffer.from(SEED, "utf-8")];
  const [pdaAccount] = anchor.web3.PublicKey.findProgramAddressSync(
    seeds,
    programId
  );

  const receiverBytes = ethers.getBytes(options.recipient);

  if (options.mint && options.from && options.to) {
    await gatewayProgram.methods
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
  } else {
    await gatewayProgram.methods
      .deposit(
        new anchor.BN(ethers.parseUnits(options.amount, 9).toString()),
        receiverBytes,
        null
      )
      .accounts({
        // pda: pdaAccount,
        // signer: keypair.publicKey,
        // systemProgram: anchor.web3.SystemProgram.programId,
      })
      .rpc();
  }
};

export const depositCommand = new Command("deposit")
  .description("Deposit tokens from Solana")
  .requiredOption("--amount <amount>", "Amount of tokens to deposit")
  .requiredOption("--recipient <recipient>", "Recipient address")
  .option("--idPath <idPath>", "Path to id.json")
  .option("--mnemonic <mnemonic>", "Mnemonic")
  .option("--privateKey <privateKey>", "Private key")
  .option("--tokenProgram <tokenProgram>", "Token program")
  .option("--from <from>", "SPL token account from which tokens are withdrawn")
  .option("--to <to>", "SPL token account that belongs to the PDA")
  .option("--mint <mint>", "SPL token mint address")
  .action(main);
