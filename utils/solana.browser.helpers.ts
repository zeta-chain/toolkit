import { AccountLayout, TOKEN_PROGRAM_ID } from "@solana/spl-token";
import {
  AccountMeta,
  Connection,
  Keypair,
  PublicKey,
  sendAndConfirmTransaction,
  Transaction,
  TransactionInstruction,
} from "@solana/web3.js";
import GATEWAY_DEV_IDL from "@zetachain/protocol-contracts-solana/dev/idl/gateway.json";
import GATEWAY_PROD_IDL from "@zetachain/protocol-contracts-solana/prod/idl/gateway.json";
import { ethers } from "ethers";

import { WalletAdapter } from "../src/schemas/solana";
import { RevertOptions } from "../types/contracts.types";

/**
 * Type for flexible signer - can be Keypair or wallet adapter
 */
export type FlexibleSigner = Keypair | WalletAdapter;

/**
 * Check if signer is a Keypair
 */
const isKeypair = (signer: FlexibleSigner): signer is Keypair => {
  return signer instanceof Keypair;
};

/**
 * Get PublicKey from flexible signer
 */
const getPublicKey = (signer: FlexibleSigner): PublicKey => {
  return isKeypair(signer) ? signer.publicKey : signer.publicKey;
};

/**
 * Serialize instruction data using Borsh format
 */
const serializeCallInstruction = (
  receiver: Uint8Array, // 20 bytes
  message: Uint8Array,
  revertOptions: ReturnType<typeof createRevertOptions>
): Buffer => {
  // Call instruction discriminator from IDL
  const discriminator = Buffer.from([181, 94, 56, 161, 194, 221, 200, 3]);

  // Serialize receiver (20 bytes)
  const receiverBuffer = Buffer.from(receiver);

  // Serialize message length + message
  const messageLength = Buffer.alloc(4);
  messageLength.writeUInt32LE(message.length, 0);
  const messageBuffer = Buffer.from(message);

  // Serialize revert options
  const revertOptionsPresent = Buffer.from([1]); // Option::Some

  // Serialize revert_address (32 bytes)
  const revertAddressBuffer = Buffer.from(
    revertOptions.revertAddress.toBytes()
  );

  // Serialize abort_address (20 bytes)
  const abortAddressBuffer = Buffer.from(revertOptions.abortAddress);

  // Serialize call_on_revert (1 byte)
  const callOnRevertBuffer = Buffer.from([revertOptions.callOnRevert ? 1 : 0]);

  // Serialize revert_message length + message
  const revertMessageLength = Buffer.alloc(4);
  revertMessageLength.writeUInt32LE(revertOptions.revertMessage.length, 0);
  const revertMessageBuffer = Buffer.from(revertOptions.revertMessage);

  // Serialize on_revert_gas_limit (8 bytes, little endian)
  const gasLimitBuffer = Buffer.alloc(8);
  gasLimitBuffer.writeBigUInt64LE(revertOptions.onRevertGasLimit, 0);

  // Combine all parts
  return Buffer.concat([
    discriminator,
    receiverBuffer,
    messageLength,
    messageBuffer,
    revertOptionsPresent,
    revertAddressBuffer,
    abortAddressBuffer,
    callOnRevertBuffer,
    revertMessageLength,
    revertMessageBuffer,
    gasLimitBuffer,
  ]);
};

/**
 * Browser-safe utilities for Solana operations without Anchor dependencies
 */

/**
 * Gateway IDL interface structure
 */
export interface GatewayIDL {
  accounts: Array<{
    discriminator: number[];
    name: string;
  }>;
  address: string;
  instructions: Array<{
    accounts: Array<{
      name: string;
      optional?: boolean;
      signer?: boolean;
      writable?: boolean;
    }>;
    args: Array<{
      name: string;
      type: string;
    }>;
    discriminator: number[];
    name: string;
  }>;
  metadata: {
    name: string;
    spec: string;
    version: string;
  };
  types: Array<{
    name: string;
    type: {
      fields: Array<{
        name: string;
        type: string;
      }>;
      kind: string;
    };
  }>;
}

/**
 * Call instruction result interface
 */
export interface CallInstructionResult {
  accounts: {
    pda: PublicKey;
    signer: PublicKey;
  };
  instruction: TransactionInstruction;
}

/**
 * Get Solana RPC API URL by chain ID
 */
export const getAPIbyChainId = (chainId: string): string => {
  let API = "http://localhost:8899";
  if (chainId === "901") {
    API = "https://api.devnet.solana.com";
  } else if (chainId === "900") {
    API = "https://api.mainnet-beta.solana.com";
  }
  return API;
};

/**
 * Create revert options compatible with browser environment
 * This replaces the Anchor-dependent createRevertOptions function
 */
export const createRevertOptions = (
  options: RevertOptions,
  publicKey: PublicKey
) => {
  return {
    abortAddress: ethers.getBytes(options.abortAddress ?? ethers.ZeroAddress),
    callOnRevert: options.callOnRevert,
    onRevertGasLimit: BigInt(options.onRevertGasLimit ?? 0),
    revertAddress: options.revertAddress
      ? new PublicKey(options.revertAddress)
      : publicKey,
    revertMessage: Buffer.from(options.revertMessage, "utf8"),
  };
};

/**
 * Browser-safe interface for Solana gateway operations
 * This replaces the Anchor Program interface for browser environments
 */
export interface BrowserSolanaGateway {
  connection: Connection;
  /**
   * Create a call instruction for cross-chain calls
   */
  createCallInstruction: (
    receiverBytes: Uint8Array,
    message: Buffer,
    revertOptions: ReturnType<typeof createRevertOptions>,
    signer: PublicKey
  ) => CallInstructionResult;
  idl: GatewayIDL;

  programId: PublicKey;
}

/**
 * Create a browser-safe Solana gateway interface
 * This replaces createSolanaGatewayProgram without Anchor dependencies
 */
export const createBrowserSolanaGateway = (
  chainId: string
): { connection: Connection; gateway: BrowserSolanaGateway } => {
  // Mainnet and devnet use the same IDL
  const gatewayIDL = (
    chainId === "902" ? GATEWAY_DEV_IDL : GATEWAY_PROD_IDL
  ) as GatewayIDL;

  const API = getAPIbyChainId(chainId);
  const connection = new Connection(API, "confirmed");

  const programId = new PublicKey(gatewayIDL.address);

  const gateway: BrowserSolanaGateway = {
    connection,
    createCallInstruction: (
      receiverBytes: Uint8Array,
      message: Buffer,
      revertOptions: ReturnType<typeof createRevertOptions>,
      signerPublicKey: PublicKey
    ): CallInstructionResult => {
      // Find PDA account (used for return value, though call instruction doesn't need it as account)
      const seeds = [Buffer.from("meta", "utf-8")];
      const [pdaAccount] = PublicKey.findProgramAddressSync(seeds, programId);

      // Create account metas based on IDL - call instruction only needs signer
      const keys: AccountMeta[] = [
        { isSigner: true, isWritable: true, pubkey: signerPublicKey },
      ];

      // Serialize instruction data using proper Borsh format
      const instructionData = serializeCallInstruction(
        receiverBytes,
        message,
        revertOptions
      );

      const instruction = new TransactionInstruction({
        data: instructionData,
        keys,
        programId,
      });

      return {
        accounts: {
          pda: pdaAccount,
          signer: signerPublicKey,
        },
        instruction,
      };
    },
    idl: gatewayIDL,

    programId,
  };

  return { connection, gateway };
};

/**
 * Sign and send a transaction with flexible signer support
 */
export const signAndSendTransaction = async (
  connection: Connection,
  transaction: Transaction,
  signer: FlexibleSigner
): Promise<string> => {
  // Handle signing based on signer type
  if (isKeypair(signer)) {
    // Direct signing with Keypair (CLI/server usage)
    const signature = await sendAndConfirmTransaction(
      connection,
      transaction,
      [signer],
      {
        commitment: "confirmed",
        preflightCommitment: "confirmed",
      }
    );
    return signature;
  } else {
    // Wallet adapter signing (browser usage)
    if (!signer.signTransaction) {
      throw new Error("Wallet does not support transaction signing");
    }

    const signedTransaction = await signer.signTransaction(transaction);
    const signature = await connection.sendRawTransaction(
      signedTransaction.serialize()
    );

    // Wait for confirmation
    await connection.confirmTransaction(signature, "confirmed");
    return signature;
  }
};

/**
 * Execute a cross-chain call using browser-compatible methods
 * Supports both Keypair and wallet adapter signers
 */
export const executeBrowserSolanaCall = async (
  chainId: string,
  signer: FlexibleSigner,
  receiverBytes: Uint8Array,
  message: Buffer,
  revertOptions: ReturnType<typeof createRevertOptions>
): Promise<string> => {
  const { gateway, connection } = createBrowserSolanaGateway(chainId);

  const signerPublicKey = getPublicKey(signer);
  const instructionResult = gateway.createCallInstruction(
    receiverBytes,
    message,
    revertOptions,
    signerPublicKey
  );

  // Create a new transaction
  const transaction = new Transaction();

  // Add the call instruction to the transaction
  transaction.add(instructionResult.instruction);

  // Get recent blockhash for the transaction
  const { blockhash } = await connection.getLatestBlockhash();
  transaction.recentBlockhash = blockhash;
  transaction.feePayer = signerPublicKey;

  // Use the unified signing function
  return await signAndSendTransaction(connection, transaction, signer);
};

/**
 * Type definitions for browser-safe operations
 */
export interface BrowserSolanaCallOptions {
  chainId: string;
  signer: Keypair;
}

export interface BrowserSolanaCallParams {
  receiver: string;
  revertOptions: RevertOptions;
  types: string[];
  values: (string | bigint | boolean)[];
}

/**
 * Browser-safe SPL token handling without Anchor dependencies
 */
export const getBrowserSafeSPLToken = async (
  connection: Connection,
  signer: FlexibleSigner,
  mint: string,
  amount: string
): Promise<{ decimals: number; from: PublicKey }> => {
  const signerPublicKey = getPublicKey(signer);
  const mintPublicKey = new PublicKey(mint);

  // Get token accounts owned by the signer
  const tokenAccounts = await connection.getTokenAccountsByOwner(
    signerPublicKey,
    { programId: TOKEN_PROGRAM_ID }
  );

  // Get mint info to get decimals
  const mintInfo = await connection.getTokenSupply(mintPublicKey);
  const decimals = mintInfo.value.decimals;

  // Find the token account that matches the mint
  const matchingTokenAccount = tokenAccounts.value.find(({ account }) => {
    const data = AccountLayout.decode(account.data);
    return new PublicKey(data.mint).equals(mintPublicKey);
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

  return {
    decimals,
    from: matchingTokenAccount.pubkey,
  };
};

/**
 * Browser-safe SOL balance checking without Anchor dependencies
 */
export const isBrowserSafeSOLBalanceSufficient = async (
  connection: Connection,
  signer: FlexibleSigner,
  amount: string
): Promise<void> => {
  const signerPublicKey = getPublicKey(signer);
  const balance = await connection.getBalance(signerPublicKey);
  const lamportsNeeded = BigInt(ethers.parseUnits(amount, 9).toString());

  if (BigInt(balance) < lamportsNeeded) {
    throw new Error(
      `Insufficient SOL balance. Available: ${
        balance / 1e9
      }, Required: ${amount}`
    );
  }
};
