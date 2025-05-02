import * as anchor from "@coral-xyz/anchor";
import { Keypair } from "@solana/web3.js";
import GATEWAY_DEV_IDL from "@zetachain/protocol-contracts-solana/dev/idl/gateway.json";
import * as bip39 from "bip39";
import { Command } from "commander";
import { ethers } from "ethers";

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
      .accounts({})
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
