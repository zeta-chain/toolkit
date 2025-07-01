import * as anchor from "@coral-xyz/anchor";
import { Wallet } from "@coral-xyz/anchor";
import confirm from "@inquirer/confirm";
import { AccountLayout, TOKEN_PROGRAM_ID } from "@solana/spl-token";
import { clusterApiUrl, PublicKey } from "@solana/web3.js";
import * as bip39 from "bip39";
import bs58 from "bs58";
import { Command, Option } from "commander";
import { ethers } from "ethers";
import { z } from "zod";
import GATEWAY_DEV_IDL from "@zetachain/protocol-contracts-solana/dev/idl/gateway.json";
import GATEWAY_PROD_IDL from "@zetachain/protocol-contracts-solana/prod/idl/gateway.json";

import { SolanaAccountData } from "../types/accounts.types";
import { RevertOptions } from "../types/contracts.types";
import { DEFAULT_ACCOUNT_NAME } from "../types/shared.constants";
import {
  hexStringSchema,
  typesAndValuesLengthRefineRule,
} from "../types/shared.schema";
import { handleError } from "./";
import { getAccountData } from "./accounts";
import { trim0x } from "./trim0x";

export const baseSolanaOptionsSchema = z.object({
  abortAddress: z.string(),
  callOnRevert: z.boolean().default(false),
  chainId: z.string(),
  mnemonic: z.string().optional(),
  name: z.string().optional(),
  onRevertGasLimit: z.string(),
  privateKey: z.string().optional(),
  recipient: z.string(),
  revertAddress: z.string().optional(),
  revertMessage: z.string(),
});

export const solanaDepositOptionsSchema = baseSolanaOptionsSchema.extend({
  amount: z.string(),
  mint: z.string().optional(),
});

export const solanaDepositAndCallOptionsSchema = baseSolanaOptionsSchema
  .extend({
    amount: z.string(),
    mint: z.string().optional(),
    types: z.array(z.string()),
    values: z.array(z.string()),
  })
  .refine(typesAndValuesLengthRefineRule.rule, typesAndValuesLengthRefineRule);

export const solanaCallOptionsSchema = baseSolanaOptionsSchema
  .extend({
    types: z.array(z.string()),
    values: z.array(z.string()),
  })
  .refine(typesAndValuesLengthRefineRule.rule, typesAndValuesLengthRefineRule);

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
  mnemonic: string | undefined;
  name: string | undefined;
  privateKey: string | undefined;
}) => {
  let keypair: anchor.web3.Keypair;
  if (privateKey) {
    keypair = keypairFromPrivateKey(privateKey);
  } else if (mnemonic) {
    keypair = await keypairFromMnemonic(mnemonic);
  } else if (name) {
    const privateKey = getAccountData<SolanaAccountData>("solana", name);
    if (!privateKey) {
      const errorMessage = handleError({
        context: "Failed to retrieve private key",
        error: new Error("Private key not found"),
        shouldThrow: false,
      });
      throw new Error(errorMessage);
    }
    keypair = keypairFromPrivateKey(privateKey.privateKey);
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

export const getAPIbyChainId = (chainId: string) => {
  let API = "http://localhost:8899";
  if (chainId === "901") {
    API = clusterApiUrl("devnet");
  } else if (chainId === "900") {
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
    decimals,
    from,
  };
};

export const isSOLBalanceSufficient = async (
  provider: anchor.AnchorProvider,
  amount: string
) => {
  const connection = provider.connection;
  const balance = await connection.getBalance(provider.wallet.publicKey);
  const lamportsNeeded = ethers.parseUnits(amount, 9);
  if (balance < lamportsNeeded) {
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
    .requiredOption("--chain-id <chainId>", "Chain ID of the network")
    .option("--revert-address <revertAddress>", "Revert address")
    .option(
      "--abort-address <abortAddress>",
      "Abort address",
      ethers.ZeroAddress
    )
    .option("--call-on-revert", "Call on revert", false)
    .option("--revert-message <revertMessage>", "Revert message", "")
    .option(
      "--on-revert-gas-limit <onRevertGasLimit>",
      "On revert gas limit",
      "0"
    );
};

interface SolanaRevertOptions {
  abortAddress: Uint8Array;
  callOnRevert: boolean;
  onRevertGasLimit: anchor.BN;
  revertAddress: PublicKey;
  revertMessage: Buffer;
}

// Common revert options preparation
export const prepareRevertOptions = (
  options: z.infer<typeof baseSolanaOptionsSchema>
): RevertOptions => {
  return {
    abortAddress: options.abortAddress,
    callOnRevert: options.callOnRevert,
    onRevertGasLimit: options.onRevertGasLimit,
    revertAddress: options.revertAddress,
    revertMessage: options.revertMessage,
  };
};

export const createRevertOptions = (
  options: RevertOptions,
  publicKey: anchor.web3.PublicKey
) => {
  return {
    abortAddress: ethers.getBytes(options.abortAddress ?? ethers.ZeroAddress),
    callOnRevert: options.callOnRevert,
    onRevertGasLimit: new anchor.BN(options.onRevertGasLimit ?? 0),
    revertAddress: options.revertAddress
      ? new anchor.web3.PublicKey(options.revertAddress)
      : publicKey,
    revertMessage: Buffer.from(options.revertMessage, "utf8"),
  };
};

export const confirmSolanaTx = async (options: {
  amount?: string;
  api: string;
  message?: string;
  mint?: string;
  recipient: string;
  revertOptions: SolanaRevertOptions;
  sender: string;
}) => {
  console.log(`
Network: ${options.api}
Sender: ${options.sender}
Recipient: ${options.recipient}
Revert options: ${JSON.stringify(options.revertOptions)}${
    options.message ? `\nMessage: ${options.message}` : ""
  }${options.amount ? `\nAmount: ${options.amount}` : ""}${
    options.mint ? `\nMint: ${options.mint}` : ""
  }
`);
  await confirm({ message: "Confirm transaction?" });
};

export const createSolanaGatewayProgram = (
  chainId: string,
  signer: anchor.web3.Keypair
) => {
  // Mainnet and devnet use the same IDL
  const gatewayIDL = chainId === "902" ? GATEWAY_DEV_IDL : GATEWAY_PROD_IDL;

  const API = getAPIbyChainId(chainId);

  const connection = new anchor.web3.Connection(API);
  const provider = new anchor.AnchorProvider(connection, new Wallet(signer));
  const gatewayProgram = new anchor.Program(gatewayIDL as anchor.Idl, provider);

  return { gatewayProgram, provider };
};
