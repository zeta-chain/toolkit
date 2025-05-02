import * as anchor from "@coral-xyz/anchor";
import { Wallet } from "@coral-xyz/anchor";
import { clusterApiUrl, Keypair, PublicKey } from "@solana/web3.js";
import GATEWAY_DEV_IDL from "@zetachain/protocol-contracts-solana/dev/idl/gateway.json";
import GATEWAY_PROD_IDL from "@zetachain/protocol-contracts-solana/prod/idl/gateway.json";
import * as bip39 from "bip39";
import bs58 from "bs58";
import { Command, Option } from "commander";
import { ethers } from "ethers";
import { TOKEN_PROGRAM_ID, AccountLayout } from "@solana/spl-token";

const networks = ["devnet", "localnet", "mainnet"];

export interface DepositOptions {
  amount: string;
  from: string;
  idPath: string;
  mint: string;
  mnemonic: string;
  network: string;
  privateKey: string;
  recipient: string;
  to: string;
  tokenProgram: string;
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
    const decodedKey = bs58.decode(privateKey);
    return Keypair.fromSecretKey(decodedKey);
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

  let keypair: Keypair;
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
  console.log(provider.wallet.publicKey.toBase58());
  const gatewayProgram = new anchor.Program(gatewayIDL as anchor.Idl, provider);

  const receiverBytes = ethers.getBytes(options.recipient);

  const tokenAccounts = await connection.getTokenAccountsByOwner(
    provider.wallet.publicKey,
    {
      programId: TOKEN_PROGRAM_ID,
    }
  );

  if (options.mint && options.to) {
    const matchingTokenAccount = tokenAccounts.value.find(({ account }) => {
      const data = AccountLayout.decode(account.data);
      return new PublicKey(data.mint).toBase58() === options.mint;
    });

    if (!matchingTokenAccount) {
      throw new Error(`No token account found for mint ${options.mint}`);
    }

    const tx = await gatewayProgram.methods
      .depositSplToken(
        new anchor.BN(ethers.parseUnits(options.amount, 9).toString()),
        receiverBytes,
        null
      )
      .accounts({
        from: matchingTokenAccount.pubkey,
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
  .option("--to <to>", "SPL token account that belongs to the PDA")
  .option("--mint <mint>", "SPL token mint address")
  .addOption(
    new Option("--network <network>", "Solana network").choices(networks)
  )
  .action(main);
