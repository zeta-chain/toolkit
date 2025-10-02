import { Keypair, PublicKey, Transaction } from "@solana/web3.js";
import { z } from "zod";

// Define proper wallet adapter interface
export interface WalletAdapter {
  publicKey: PublicKey;
  signAllTransactions?: (transactions: Transaction[]) => Promise<Transaction[]>;
  signTransaction?: (transaction: Transaction) => Promise<Transaction>;
}

// Create a custom Zod schema for wallet adapters
const walletAdapterSchema = z.custom<WalletAdapter>(
  (data): data is WalletAdapter => {
    if (!data || typeof data !== "object") return false;

    const obj = data as Record<string, unknown>;

    // Must have publicKey that is a PublicKey instance
    if (!obj.publicKey || !(obj.publicKey instanceof PublicKey)) {
      return false;
    }

    // signTransaction is optional but if present, must be a function
    if (obj.signTransaction && typeof obj.signTransaction !== "function") {
      return false;
    }

    // signAllTransactions is optional but if present, must be a function
    if (
      obj.signAllTransactions &&
      typeof obj.signAllTransactions !== "function"
    ) {
      return false;
    }

    return true;
  },
  {
    message:
      "Expected wallet adapter with publicKey (PublicKey) and optional signing functions",
  }
);

// Define a flexible signer schema that accepts both Keypair and wallet adapters
const solanaSignerSchema = z.union([
  // Direct Keypair (for CLI/server usage)
  z.instanceof(Keypair),
  // Wallet adapter interface (for browser usage)
  walletAdapterSchema,
]);

export const revertOptionsSchema = z.object({
  abortAddress: z.string().optional(),
  callOnRevert: z.boolean(),
  onRevertGasLimit: z.union([z.string(), z.number(), z.bigint()]).optional(),
  revertAddress: z.string().optional(),
  revertMessage: z.string(),
});

export const solanaOptionsSchema = z.object({
  chainId: z.string(),
  signer: solanaSignerSchema,
});

export const solanaCallParamsSchema = z.object({
  receiver: z.string(),
  revertOptions: revertOptionsSchema,
  types: z.array(z.string()),
  values: z.array(z.union([z.string(), z.bigint(), z.boolean()])),
});

export const solanaDepositParamsSchema = z.object({
  amount: z.string(),
  receiver: z.string(),
  revertOptions: revertOptionsSchema,
  token: z.string().optional(),
});

export const solanaDepositAndCallParamsSchema = z.object({
  amount: z.string(),
  receiver: z.string(),
  revertOptions: revertOptionsSchema,
  token: z.string().optional(),
  types: z.array(z.string()),
  values: z.array(z.union([z.string(), z.bigint(), z.boolean()])),
});
