import * as anchor from "@coral-xyz/anchor";
import { Wallet } from "@coral-xyz/anchor";
import {
  AccountLayout,
  ASSOCIATED_TOKEN_PROGRAM_ID,
  TOKEN_PROGRAM_ID,
} from "@solana/spl-token";
import { PublicKey } from "@solana/web3.js";
import GATEWAY_DEV_IDL from "@zetachain/protocol-contracts-solana/dev/idl/gateway.json";
import GATEWAY_PROD_IDL from "@zetachain/protocol-contracts-solana/prod/idl/gateway.json";
import { ethers } from "ethers";
import { z } from "zod";

import { SOLANA_TOKEN_PROGRAM } from "../../../../types/shared.constants";
import { handleError, validateAndParseSchema } from "../../../../utils";
import { parseAbiValues } from "../../../../utils/parseAbiValues";
import {
  createSolanaCommandWithCommonOptions,
  getAPI,
  getKeypair,
  getSPLToken,
  isSOLBalanceSufficient,
  solanaDepositAndCallOptionsSchema,
} from "../../../../utils/solana.commands.helpers";

type DepositAndCallOptions = z.infer<typeof solanaDepositAndCallOptionsSchema>;

const main = async (options: DepositAndCallOptions) => {
  // Mainnet and devnet use the same IDL
  const gatewayIDL =
    options.network === "localnet" ? GATEWAY_DEV_IDL : GATEWAY_PROD_IDL;

  let keypair = await getKeypair({
    name: options.name,
    mnemonic: options.mnemonic,
    privateKey: options.privateKey,
  });

  const API = getAPI(options.network);

  const connection = new anchor.web3.Connection(API);
  const provider = new anchor.AnchorProvider(connection, new Wallet(keypair!));
  const gatewayProgram = new anchor.Program(gatewayIDL as anchor.Idl, provider);
  const tokenAccounts = await connection.getTokenAccountsByOwner(
    provider.wallet.publicKey,
    { programId: TOKEN_PROGRAM_ID }
  );

  const receiverBytes = ethers.getBytes(options.recipient);
  const stringifiedTypes = JSON.stringify(options.types);
  const values = parseAbiValues(stringifiedTypes, options.values);
  const abiCoder = ethers.AbiCoder.defaultAbiCoder();
  const encodedParameters = abiCoder.encode(options.types, values);
  const message = Buffer.from(encodedParameters.slice(2), "hex");

  const revertOptions = {
    abortAddress: ethers.getBytes(options.abortAddress),
    callOnRevert: options.callOnRevert,
    onRevertGasLimit: new anchor.BN(options.onRevertGasLimit ?? 0),
    revertAddress: options.revertAddress
      ? new PublicKey(options.revertAddress)
      : provider.wallet.publicKey,
    revertMessage: Buffer.from(options.revertMessage, "utf8"),
  };

  try {
    if (options.mint) {
      const { from, decimals } = await getSPLToken(
        provider,
        options.mint,
        options.amount
      );

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
          message,
          revertOptions
        )
        .accounts({
          from,
          mintAccount: options.mint,
          signer: keypair!.publicKey,
          systemProgram: anchor.web3.SystemProgram.programId,
          to,
          tokenProgram: TOKEN_PROGRAM_ID,
        })
        .rpc();
      console.log("Transaction hash:", tx);
    } else {
      await isSOLBalanceSufficient(provider, options.amount);

      const tx = await gatewayProgram.methods
        .depositAndCall(
          new anchor.BN(ethers.parseUnits(options.amount, 9).toString()),
          receiverBytes,
          message,
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
