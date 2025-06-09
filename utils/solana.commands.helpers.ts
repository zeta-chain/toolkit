import * as anchor from "@coral-xyz/anchor";
import * as bip39 from "bip39";
import bs58 from "bs58";
import { Command, Option } from "commander";
import { z } from "zod";

import {
  DEFAULT_ACCOUNT_NAME,
  SOLANA_NETWORKS,
  SOLANA_TOKEN_PROGRAM,
} from "../types/shared.constants";
import { hexStringSchema } from "../types/shared.schema";
import { trim0x } from "./trim0x";
import { SolanaAccountData } from "../types/accounts.types";
import { getAccountData } from "./accounts";
import { clusterApiUrl, PublicKey } from "@solana/web3.js";
import { ethers } from "ethers";
import { AccountLayout, TOKEN_PROGRAM_ID } from "@solana/spl-token";

export const baseSolanaOptionsSchema = z.object({
  mnemonic: z.string().optional(),
  name: z.string().optional(),
  network: z.string(),
  privateKey: z.string().optional(),
  recipient: z.string(),
  abortAddress: z.string(),
  callOnRevert: z.boolean().optional().default(false),
  onRevertGasLimit: z.string(),
  revertAddress: z.string().optional(),
  revertMessage: z.string(),
});

const privateKeyRefineRule = () => {
  return {
    message: "Only one of mnemonic or privateKey or name can be provided",
    rule: (data: { privateKey?: string; mnemonic?: string; name?: string }) =>
      [...Object.values(data)].filter(Boolean).length <= 1,
  };
};

export const solanaDepositOptionsSchema = baseSolanaOptionsSchema
  .extend({
    amount: z.string(),
    mint: z.string().optional(),
    network: z.string(),
  })
  .refine(privateKeyRefineRule);

export const solanaDepositAndCallOptionsSchema = baseSolanaOptionsSchema
  .extend({
    amount: z.string(),
    mint: z.string().optional(),
    types: z.array(z.string()),
    values: z.array(z.string()),
  })
  .refine(privateKeyRefineRule);

export const solanaCallOptionsSchema = baseSolanaOptionsSchema
  .extend({
    types: z.array(z.string()),
    values: z.array(z.string()),
  })
  .refine(privateKeyRefineRule);

export const keypairFromMnemonic = async (
  mnemonic: string
): Promise<anchor.web3.Keypair> => {
  if (!bip39.validateMnemonic(mnemonic)) {
    throw new Error("Invalid mnemonic phrase");
  }
  const seed = await bip39.mnemonicToSeed(mnemonic);
  const seedSlice = new Uint8Array(seed).slice(0, 32);
  return anchor.web3.Keypair.fromSeed(seedSlice);
};

export const keypairFromPrivateKey = (
  privateKey: string
): anchor.web3.Keypair => {
  try {
    // First try base58 decoding (original format)
    const decodedKey = bs58.decode(privateKey);
    return anchor.web3.Keypair.fromSecretKey(decodedKey);
  } catch (error) {
    // If base58 fails, validate and try hex format
    const hexValidation = hexStringSchema.safeParse(privateKey);
    if (!hexValidation.success) {
      throw new Error(
        "Invalid private key format. Must be either base58 or valid hex (with optional 0x prefix)."
      );
    }

    try {
      const cleanKey = trim0x(privateKey);
      return anchor.web3.Keypair.fromSecretKey(Buffer.from(cleanKey, "hex"));
    } catch (hexError) {
      throw new Error(
        `Invalid hex private key: ${
          hexError instanceof Error ? hexError.message : "Unknown error"
        }`
      );
    }
  }
};

export const getKeypair = async ({
  name,
  mnemonic,
  privateKey,
}: {
  name: string | undefined;
  mnemonic: string | undefined;
  privateKey: string | undefined;
}) => {
  let keypair: anchor.web3.Keypair;
  if (privateKey) {
    keypair = keypairFromPrivateKey(privateKey);
  } else if (mnemonic) {
    keypair = await keypairFromMnemonic(mnemonic);
  } else if (name) {
    const privateKey = getAccountData<SolanaAccountData>(
      "solana",
      name
    )?.privateKey;
    keypair = keypairFromPrivateKey(privateKey!);
  } else {
    throw new Error("No account provided");
  }
  return keypair;
};

export const getAPI = (network: string) => {
  let API = "http://localhost:8899";
  if (network === "devnet") {
    API = clusterApiUrl("devnet");
  } else if (network === "mainnet") {
    API = clusterApiUrl("mainnet-beta");
  }
  return API;
};

export const getSPLToken = async (
  provider: anchor.AnchorProvider,
  mint: string,
  amount: string
) => {
  const connection = provider.connection;
  const tokenAccounts = await connection.getTokenAccountsByOwner(
    provider.wallet.publicKey,
    { programId: TOKEN_PROGRAM_ID }
  );

  const mintInfo = await connection.getTokenSupply(new PublicKey(mint));
  const decimals = mintInfo.value.decimals;

  // Find the token account that matches the mint
  const matchingTokenAccount = tokenAccounts.value.find(({ account }) => {
    const data = AccountLayout.decode(account.data);
    return new PublicKey(data.mint).toBase58() === mint;
  });

  if (!matchingTokenAccount) {
    throw new Error(`No token account found for mint ${mint}`);
  }

  // Check token balance
  const accountInfo = await connection.getTokenAccountBalance(
    matchingTokenAccount.pubkey
  );
  const balance = accountInfo.value.uiAmount;
  const amountToSend = parseFloat(amount);
  if (!balance || balance < amountToSend) {
    throw new Error(
      `Insufficient token balance. Available: ${
        balance ?? 0
      }, Required: ${amount}`
    );
  }

  const from = matchingTokenAccount.pubkey;

  return {
    from,
    decimals,
  };
};

export const isSOLBalanceSufficient = async (
  provider: anchor.AnchorProvider,
  amount: string
) => {
  const connection = provider.connection;
  const balance = await connection.getBalance(provider.wallet.publicKey);
  const lamportsNeeded = ethers.parseUnits(amount, 9).toString();
  if (balance < parseInt(lamportsNeeded)) {
    throw new Error(
      `Insufficient SOL balance. Available: ${
        balance / 1e9
      }, Required: ${amount}`
    );
  }
};

export const createSolanaCommandWithCommonOptions = (name: string): Command => {
  return new Command(name)
    .requiredOption(
      "--recipient <recipient>",
      "EOA or contract address on ZetaChain"
    )
    .addOption(
      new Option("--mnemonic <mnemonic>", "Mnemonic").conflicts([
        "private-key",
        "name",
      ])
    )
    .addOption(
      new Option("--name <name>", "Name of the wallet")
        .conflicts(["private-key", "mnemonic"])
        .default(DEFAULT_ACCOUNT_NAME)
    )
    .addOption(
      new Option(
        "--private-key <privateKey>",
        "Private key in base58 or hex format (with optional 0x prefix)"
      ).conflicts(["mnemonic", "name"])
    )
    .addOption(
      new Option("--network <network>", "Solana network").choices(
        SOLANA_NETWORKS
      )
    )
    .option("--revert-address <revertAddress>", "Revert address")
    .option(
      "--abort-address <abortAddress>",
      "Abort address",
      ethers.ZeroAddress
    )
    .option("--call-on-revert <callOnRevert>", "Call on revert", false)
    .option("--revert-message <revertMessage>", "Revert message", "")
    .option(
      "--on-revert-gas-limit <onRevertGasLimit>",
      "On revert gas limit",
      "0"
    );
};
