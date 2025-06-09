import * as anchor from "@coral-xyz/anchor";
import { Wallet } from "@coral-xyz/anchor";
import {
  AccountLayout,
  ASSOCIATED_TOKEN_PROGRAM_ID,
  TOKEN_PROGRAM_ID,
} from "@solana/spl-token";
import { clusterApiUrl, PublicKey } from "@solana/web3.js";
import GATEWAY_DEV_IDL from "@zetachain/protocol-contracts-solana/dev/idl/gateway.json";
import GATEWAY_PROD_IDL from "@zetachain/protocol-contracts-solana/prod/idl/gateway.json";
import { ethers } from "ethers";
import { z } from "zod";

import { SolanaAccountData } from "../../../../types/accounts.types";
import { SOLANA_TOKEN_PROGRAM } from "../../../../types/shared.constants";
import { handleError, validateAndParseSchema } from "../../../../utils";
import { getAccountData } from "../../../../utils/accounts";
import { parseAbiValues } from "../../../../utils/parseAbiValues";
import {
  createSolanaCommandWithCommonOptions,
  keypairFromMnemonic,
  keypairFromPrivateKey,
  solanaDepositAndCallOptionsSchema,
} from "../../../../utils/solana.commands.helpers";

type DepositAndCallOptions = z.infer<typeof solanaDepositAndCallOptionsSchema>;

const main = async (options: DepositAndCallOptions) => {
  // Mainnet and devnet use the same IDL
  const gatewayIDL =
    options.network === "localnet" ? GATEWAY_DEV_IDL : GATEWAY_PROD_IDL;

  let keypair: anchor.web3.Keypair;
  if (options.privateKey) {
    keypair = keypairFromPrivateKey(options.privateKey);
  } else if (options.mnemonic) {
    keypair = await keypairFromMnemonic(options.mnemonic);
  } else if (options.name) {
    const privateKey = getAccountData<SolanaAccountData>(
      "solana",
      options.name
    )?.privateKey;
    keypair = keypairFromPrivateKey(privateKey!);
  } else {
    throw new Error("No account provided");
  }

  let API = "http://localhost:8899";
  if (options.network === "devnet") {
    API = clusterApiUrl("devnet");
  } else if (options.network === "mainnet") {
    API = clusterApiUrl("mainnet-beta");
  }

  const connection = new anchor.web3.Connection(API);

  const provider = new anchor.AnchorProvider(connection, new Wallet(keypair!));

  const gatewayProgram = new anchor.Program(gatewayIDL as anchor.Idl, provider);

  const receiverBytes = ethers.getBytes(options.recipient);

  const tokenAccounts = await connection.getTokenAccountsByOwner(
    provider.wallet.publicKey,
    {
      programId: TOKEN_PROGRAM_ID,
    }
  );

  try {
    const stringifiedTypes = JSON.stringify(options.types);
    const values = parseAbiValues(stringifiedTypes, options.values);
    const abiCoder = ethers.AbiCoder.defaultAbiCoder();
    const encodedParameters = abiCoder.encode(options.types, values);

    const revertAddress = options.revertAddress
      ? new PublicKey(options.revertAddress)
      : provider.wallet.publicKey; // fallback to the signer’s address

    // pick user value if provided, otherwise 0x000… as bytes
    const abortAddress: Uint8Array = options.abortAddress
      ? ethers.getBytes(options.abortAddress) // 20 bytes
      : ethers.getBytes(ethers.ZeroAddress); // 0x000… → 20 bytes
    // ethers verifies length
    const revertOptions = {
      revertAddress, // Pubkey (as before)
      abortAddress, // now correct type
      callOnRevert: !!options.callOnRevert,
      revertMessage: Buffer.from(options.revertMessage ?? "", "utf8"),
      onRevertGasLimit: new anchor.BN(options.onRevertGasLimit ?? 0),
    };

    if (options.mint) {
      const mintInfo = await connection.getTokenSupply(
        new PublicKey(options.mint)
      );
      const decimals = mintInfo.value.decimals;

      // Find the token account that matches the mint
      const matchingTokenAccount = tokenAccounts.value.find(({ account }) => {
        const data = AccountLayout.decode(account.data);
        return new PublicKey(data.mint).toBase58() === options.mint;
      });

      if (!matchingTokenAccount) {
        throw new Error(`No token account found for mint ${options.mint}`);
      }

      // Check token balance
      const accountInfo = await connection.getTokenAccountBalance(
        matchingTokenAccount.pubkey
      );
      const balance = accountInfo.value.uiAmount;
      const amountToSend = parseFloat(options.amount);
      if (!balance || balance < amountToSend) {
        throw new Error(
          `Insufficient token balance. Available: ${
            balance ?? 0
          }, Required: ${amountToSend}`
        );
      }

      const from = matchingTokenAccount.pubkey;

      // Find the TSS PDA (meta)
      const [tssPda] = PublicKey.findProgramAddressSync(
        [Buffer.from("meta", "utf-8")],
        gatewayProgram.programId
      );

      // Find the TSS's ATA for the mint
      const tssAta = await PublicKey.findProgramAddress(
        [
          tssPda.toBuffer(),
          TOKEN_PROGRAM_ID.toBuffer(),
          new PublicKey(options.mint).toBuffer(),
        ],
        ASSOCIATED_TOKEN_PROGRAM_ID
      );

      const to = tssAta[0].toBase58();

      const tx = await gatewayProgram.methods
        .depositSplTokenAndCall(
          new anchor.BN(ethers.parseUnits(options.amount, decimals).toString()),
          receiverBytes,
          ethers.getBytes(encodedParameters),
          revertOptions
        )
        .accounts({
          from,
          mintAccount: options.mint,
          signer: keypair!.publicKey,
          systemProgram: anchor.web3.SystemProgram.programId,
          to,
          tokenProgram: options.tokenProgram,
        })
        .rpc();
      console.log("Transaction hash:", tx);
    } else {
      // Check SOL balance
      const balance = await connection.getBalance(keypair!.publicKey);
      const lamportsNeeded = ethers.parseUnits(options.amount, 9).toString();
      if (balance < parseInt(lamportsNeeded)) {
        throw new Error(
          `Insufficient SOL balance. Available: ${balance / 1e9}, Required: ${
            options.amount
          }`
        );
      }

      const tx = await gatewayProgram.methods
        .depositAndCall(
          new anchor.BN(ethers.parseUnits(options.amount, 9).toString()),
          receiverBytes,
          ethers.getBytes(encodedParameters),
          revertOptions
        )
        .accounts({})
        .rpc();
      console.log("Transaction hash:", tx);
    }
  } catch (error) {
    handleError({
      context: "Error during deposit and call",
      error,
      shouldThrow: false,
    });
    process.exit(1);
  }
};

export const depositAndCallCommand = createSolanaCommandWithCommonOptions(
  "deposit-and-call"
)
  .description(
    "Deposit tokens from Solana and call a universal contract on ZetaChain"
  )
  .requiredOption("--amount <amount>", "Amount of tokens to deposit")
  .option(
    "--token-program <tokenProgram>",
    "Token program",
    SOLANA_TOKEN_PROGRAM
  )
  .requiredOption(
    "--types <types...>",
    "List of parameter types (e.g. uint256 address)"
  )
  .requiredOption(
    "--values <values...>",
    "Parameter values for the function call"
  )
  .option("--revert-address <revertAddress>", "Revert address")
  .option("--abort-address <abortAddress>", "Abort address")
  .option("--call-on-revert <callOnRevert>", "Call on revert")
  .option("--revert-message <revertMessage>", "Revert message")
  .option(
    "--on-revert-gas-limit <onRevertGasLimit>",
    "On revert gas limit",
    "0"
  )
  .option("--mint <mint>", "SPL token mint address")
  .action(async (options) => {
    const validatedOptions = validateAndParseSchema(
      options,
      solanaDepositAndCallOptionsSchema,
      {
        exitOnError: true,
      }
    );
    await main(validatedOptions);
  });
