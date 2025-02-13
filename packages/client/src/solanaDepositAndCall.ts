import * as anchor from "@coral-xyz/anchor";
import { TransactionMessage, VersionedTransaction } from "@solana/web3.js";
import { Transaction } from "@solana/web3.js";
import { getEndpoints } from "@zetachain/networks";
import Gateway_IDL from "@zetachain/protocol-contracts-solana/idl/gateway.json";
import { ethers } from "ethers";

import { ZetaChainClient } from "./client";

const SEED = "meta";

export const solanaDepositAndCall = async function (
  this: ZetaChainClient,
  args: {
    amount: number;
    params: any[];
    recipient: string;
  }
) {
  if (!this.isSolanaWalletConnected()) {
    throw new Error("Solana wallet not connected");
  }

  const network = "solana_" + this.network;
  const api = getEndpoints("solana" as any, network);

  const connection = new anchor.web3.Connection(api[0].url);

  let provider;
  if (this.solanaAdapter) {
    const walletAdapter = {
      publicKey: this.solanaAdapter.publicKey!,
      signAllTransactions: async (txs: Transaction[]) => {
        if (!this.solanaAdapter?.signAllTransactions) {
          throw new Error(
            "Wallet does not support signing multiple transactions"
          );
        }
        return await this.solanaAdapter.signAllTransactions(txs);
      },
      signTransaction: async (tx: Transaction) => {
        if (!this.solanaAdapter?.signTransaction) {
          throw new Error("Wallet does not support transaction signing");
        }
        return await this.solanaAdapter.signTransaction(tx);
      },
    };

    provider = new anchor.AnchorProvider(
      connection,
      walletAdapter as any,
      anchor.AnchorProvider.defaultOptions()
    );
  } else if (this.solanaWallet) {
    provider = new anchor.AnchorProvider(
      connection,
      this.solanaWallet,
      anchor.AnchorProvider.defaultOptions()
    );
  } else {
    throw new Error("No valid Solana wallet found");
  }
  anchor.setProvider(provider);

  const programId = new anchor.web3.PublicKey(Gateway_IDL.address);
  const gatewayProgram = new anchor.Program(
    Gateway_IDL as anchor.Idl,
    provider
  );

  const seeds = [Buffer.from(SEED, "utf-8")];
  const [pdaAccount] = anchor.web3.PublicKey.findProgramAddressSync(
    seeds,
    programId
  );

  const depositAmount = new anchor.BN(
    anchor.web3.LAMPORTS_PER_SOL * args.amount
  );

  try {
    const tx = new anchor.web3.Transaction();
    const recipient = Buffer.from(ethers.utils.arrayify(args.recipient));

    if (!Array.isArray(args.params[0]) || !Array.isArray(args.params[1])) {
      throw new Error(
        "Invalid 'params' format. Expected arrays of types and values."
      );
    }

    const valuesArray = args.params[1].map((value: any, index: any) => {
      const type = args.params[0][index];

      if (type === "bool") {
        try {
          return JSON.parse(value.toLowerCase());
        } catch (e) {
          throw new Error(`Invalid boolean value: ${value}`);
        }
      } else if (type.startsWith("uint") || type.startsWith("int")) {
        return BigInt(value);
      } else {
        return value;
      }
    });

    const message = Buffer.from(
      ethers.utils.arrayify(
        ethers.utils.defaultAbiCoder.encode(args.params[0], valuesArray)
      )
    );

    console.log(
      ethers.utils.defaultAbiCoder.encode(args.params[0], valuesArray)
    );

    const depositInstruction = await gatewayProgram.methods
      .depositAndCall(depositAmount, recipient, message)
      .accounts({
        pda: pdaAccount,
        signer: this.solanaAdapter
          ? this.solanaAdapter.publicKey!
          : this.solanaWallet!.publicKey,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .instruction();

    tx.add(depositInstruction);

    // Send the transaction
    let txSignature;
    if (this.solanaAdapter) {
      const { blockhash, lastValidBlockHeight } =
        await connection.getLatestBlockhash();
      const messageLegacy = new TransactionMessage({
        instructions: tx.instructions,
        payerKey: this.solanaAdapter.publicKey!,
        recentBlockhash: blockhash,
      }).compileToV0Message();

      const versionedTransaction = new VersionedTransaction(messageLegacy);

      txSignature = await this.solanaAdapter.sendTransaction(
        versionedTransaction,
        connection
      );
    } else {
      txSignature = await anchor.web3.sendAndConfirmTransaction(
        connection,
        tx,
        [this.solanaWallet!.payer]
      );
    }

    console.log("Transaction signature:", txSignature);

    return txSignature;
  } catch (error) {
    console.error("Transaction failed:", error);
  }
};
