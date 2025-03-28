import { Command } from "commander";
import * as anchor from "@coral-xyz/anchor";
import { ethers } from "ethers";
import { getAssociatedTokenAddress } from "@solana/spl-token";

interface EncodeOptions {
  gateway: string;
  connected: string;
  data: string;
  mint?: string;
  accounts?: string[];
}

const encodeSolanaPayload = async ({
  gateway,
  connected,
  data,
  mint,
  accounts = [],
}: EncodeOptions) => {
  const connectedPdaAccount = new anchor.web3.PublicKey(connected);
  const [pdaAccount] = anchor.web3.PublicKey.findProgramAddressSync(
    [Buffer.from("meta", "utf-8")],
    new anchor.web3.PublicKey(gateway)
  );

  const pda = {
    isWritable: true,
    publicKey: ethers.hexlify(connectedPdaAccount.toBytes()),
  };

  const gatewayPda = {
    isWritable: false,
    publicKey: ethers.hexlify(pdaAccount.toBytes()),
  };

  const systemProgram = {
    isWritable: false,
    publicKey: ethers.hexlify(anchor.web3.SystemProgram.programId.toBytes()),
  };

  let baseAccounts;
  if (mint) {
    const mintPubkey = new anchor.web3.PublicKey(mint);
    const connectedPdaATA = await getAssociatedTokenAddress(
      mintPubkey,
      connectedPdaAccount,
      true
    );

    const pdaAta = {
      isWritable: true,
      publicKey: ethers.hexlify(connectedPdaATA.toBytes()),
    };

    const mintAccount = {
      isWritable: false,
      publicKey: ethers.hexlify(mintPubkey.toBytes()),
    };

    const tokenProgram = {
      isWritable: false,
      publicKey: ethers.hexlify(anchor.utils.token.TOKEN_PROGRAM_ID.toBytes()),
    };

    baseAccounts = [
      pda,
      pdaAta,
      mintAccount,
      gatewayPda,
      tokenProgram,
      systemProgram,
    ];
  } else {
    baseAccounts = [pda, gatewayPda, systemProgram];
  }

  // Parse additional accounts if provided
  const additionalAccounts = accounts.map((account) => {
    const [pubkey, isWritable] = account.split(":");
    return {
      isWritable: isWritable === "true",
      publicKey: ethers.hexlify(new anchor.web3.PublicKey(pubkey).toBytes()),
    };
  });

  const allAccounts = [...baseAccounts, ...additionalAccounts];

  // Encode the data
  const encodedData = ethers.hexlify(ethers.toUtf8Bytes(data));

  // ABI encode the final payload
  const encoded = ethers.AbiCoder.defaultAbiCoder().encode(
    ["tuple(tuple(bytes32 publicKey, bool isWritable)[] accounts, bytes data)"],
    [[allAccounts, encodedData]]
  );

  console.log(encoded);
};

const main = async (options: EncodeOptions) => {
  try {
    await encodeSolanaPayload(options);
    // console.log(options);
  } catch (error) {
    console.error("Error encoding Solana payload:", error);
    process.exit(1);
  }
};

export const solanaEncodeCommand = new Command("encode")
  .description("Encode payload data for Solana")
  .requiredOption("--connected <address>", "Connected PDA account address")
  .requiredOption("--data <data>", "Data to encode")
  .requiredOption("--gateway <address>", "Gateway program address")
  .option("--mint <address>", "Mint address for SPL token operations")
  .option(
    "--accounts <accounts...>",
    "Additional accounts in format 'address:isWritable'"
  )
  .action(main);
