import { getAssociatedTokenAddress, TOKEN_PROGRAM_ID } from "@solana/spl-token";
import {
  AccountMeta,
  PublicKey,
  SystemProgram,
  Transaction,
  TransactionInstruction,
} from "@solana/web3.js";
import { ethers } from "ethers";
import { z } from "zod";

import {
  createBrowserSolanaGateway,
  createRevertOptions,
  getBrowserSafeSPLToken,
  isBrowserSafeSOLBalanceSufficient,
  signAndSendTransaction,
} from "../../../utils/solana.browser.helpers";
import { validateAndParseSchema } from "../../../utils/validateAndParseSchema";
import {
  solanaDepositParamsSchema,
  solanaOptionsSchema,
} from "../../schemas/solana";

type solanaDepositParams = z.infer<typeof solanaDepositParamsSchema>;
type solanaOptions = z.infer<typeof solanaOptionsSchema>;

/**
 * Deposits tokens from Solana to ZetaChain.
 *
 * This function allows you to transfer tokens from Solana to ZetaChain.
 * It supports both native SOL and SPL tokens. For SPL tokens, it automatically
 * handles token account creation and token transfer.
 *
 * @param params - The deposit parameters including amount, receiver, token mint address, and revert options
 * @param options - Configuration options including chain ID and signer keypair
 * @returns Promise that resolves to the transaction signature
 */
export const solanaDeposit = async (
  params: solanaDepositParams,
  options: solanaOptions
): Promise<string> => {
  const validatedParams = validateAndParseSchema(
    params,
    solanaDepositParamsSchema
  );
  const validatedOptions = validateAndParseSchema(options, solanaOptionsSchema);

  const { gateway, connection } = createBrowserSolanaGateway(
    validatedOptions.chainId
  );

  const receiverBytes = ethers.getBytes(validatedParams.receiver);

  const revertOptions = createRevertOptions(
    validatedParams.revertOptions,
    validatedOptions.signer.publicKey
  );

  if (validatedParams.token) {
    // SPL Token deposit
    const { from, decimals } = await getBrowserSafeSPLToken(
      connection,
      validatedOptions.signer,
      validatedParams.token,
      validatedParams.amount
    );

    // Find the TSS PDA (meta)
    const [tssPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("meta", "utf-8")],
      gateway.programId
    );

    // Find the TSS's ATA for the mint
    const tssAta = await getAssociatedTokenAddress(
      new PublicKey(validatedParams.token),
      tssPda,
      true // allowOwnerOffCurve
    );

    // Create deposit SPL token instruction
    const depositAmount = ethers.parseUnits(validatedParams.amount, decimals);

    // Create instruction data for depositSplToken
    const discriminator = Buffer.from([86, 172, 212, 121, 63, 233, 96, 144]); // deposit_spl_token discriminator
    const amountBuffer = Buffer.alloc(8);
    amountBuffer.writeBigUInt64LE(BigInt(depositAmount.toString()), 0);

    const receiverBuffer = Buffer.from(receiverBytes);

    // Serialize revert options
    const revertOptionsPresent = Buffer.from([1]); // Option::Some
    const revertAddressBuffer = Buffer.from(
      revertOptions.revertAddress.toBytes()
    );
    const abortAddressBuffer = Buffer.from(revertOptions.abortAddress);
    const callOnRevertBuffer = Buffer.from([
      revertOptions.callOnRevert ? 1 : 0,
    ]);
    const revertMessageLength = Buffer.alloc(4);
    revertMessageLength.writeUInt32LE(revertOptions.revertMessage.length, 0);
    const revertMessageBuffer = Buffer.from(revertOptions.revertMessage);
    const gasLimitBuffer = Buffer.alloc(8);
    gasLimitBuffer.writeBigUInt64LE(revertOptions.onRevertGasLimit, 0);

    const instructionData = Buffer.concat([
      discriminator,
      amountBuffer,
      receiverBuffer,
      revertOptionsPresent,
      revertAddressBuffer,
      abortAddressBuffer,
      callOnRevertBuffer,
      revertMessageLength,
      revertMessageBuffer,
      gasLimitBuffer,
    ]);

    // Find whitelist entry PDA
    const [whitelistEntry] = PublicKey.findProgramAddressSync(
      [
        Buffer.from("whitelist", "utf-8"),
        new PublicKey(validatedParams.token).toBytes(),
      ],
      gateway.programId
    );

    const keys: AccountMeta[] = [
      {
        isSigner: true,
        isWritable: true,
        pubkey: validatedOptions.signer.publicKey,
      },
      { isSigner: false, isWritable: true, pubkey: tssPda },
      { isSigner: false, isWritable: false, pubkey: whitelistEntry },
      {
        isSigner: false,
        isWritable: false,
        pubkey: new PublicKey(validatedParams.token),
      },
      { isSigner: false, isWritable: false, pubkey: TOKEN_PROGRAM_ID },
      { isSigner: false, isWritable: true, pubkey: from },
      { isSigner: false, isWritable: true, pubkey: tssAta },
      { isSigner: false, isWritable: false, pubkey: SystemProgram.programId },
    ];

    const instruction = new TransactionInstruction({
      data: instructionData,
      keys,
      programId: gateway.programId,
    });

    const transaction = new Transaction();
    transaction.add(instruction);

    const { blockhash } = await connection.getLatestBlockhash();
    transaction.recentBlockhash = blockhash;
    transaction.feePayer = validatedOptions.signer.publicKey;

    const signature = await signAndSendTransaction(
      connection,
      transaction,
      validatedOptions.signer
    );

    return signature;
  } else {
    // SOL deposit
    await isBrowserSafeSOLBalanceSufficient(
      connection,
      validatedOptions.signer,
      validatedParams.amount
    );

    // Create deposit SOL instruction
    const depositAmount = ethers.parseUnits(validatedParams.amount, 9);

    // Create instruction data for deposit
    const discriminator = Buffer.from([242, 35, 198, 137, 82, 225, 242, 182]); // deposit discriminator
    const amountBuffer = Buffer.alloc(8);
    amountBuffer.writeBigUInt64LE(BigInt(depositAmount.toString()), 0);

    const receiverBuffer = Buffer.from(receiverBytes);

    // Serialize revert options
    const revertOptionsPresent = Buffer.from([1]); // Option::Some
    const revertAddressBuffer = Buffer.from(
      revertOptions.revertAddress.toBytes()
    );
    const abortAddressBuffer = Buffer.from(revertOptions.abortAddress);
    const callOnRevertBuffer = Buffer.from([
      revertOptions.callOnRevert ? 1 : 0,
    ]);
    const revertMessageLength = Buffer.alloc(4);
    revertMessageLength.writeUInt32LE(revertOptions.revertMessage.length, 0);
    const revertMessageBuffer = Buffer.from(revertOptions.revertMessage);
    const gasLimitBuffer = Buffer.alloc(8);
    gasLimitBuffer.writeBigUInt64LE(revertOptions.onRevertGasLimit, 0);

    const instructionData = Buffer.concat([
      discriminator,
      amountBuffer,
      receiverBuffer,
      revertOptionsPresent,
      revertAddressBuffer,
      abortAddressBuffer,
      callOnRevertBuffer,
      revertMessageLength,
      revertMessageBuffer,
      gasLimitBuffer,
    ]);

    // Find PDA account
    const seeds = [Buffer.from("meta", "utf-8")];
    const [pdaAccount] = PublicKey.findProgramAddressSync(
      seeds,
      gateway.programId
    );

    const keys: AccountMeta[] = [
      {
        isSigner: true,
        isWritable: true,
        pubkey: validatedOptions.signer.publicKey,
      },
      { isSigner: false, isWritable: true, pubkey: pdaAccount },
      { isSigner: false, isWritable: false, pubkey: SystemProgram.programId },
    ];

    const instruction = new TransactionInstruction({
      data: instructionData,
      keys,
      programId: gateway.programId,
    });

    const transaction = new Transaction();
    transaction.add(instruction);

    const { blockhash } = await connection.getLatestBlockhash();
    transaction.recentBlockhash = blockhash;
    transaction.feePayer = validatedOptions.signer.publicKey;

    const signature = await signAndSendTransaction(
      connection,
      transaction,
      validatedOptions.signer
    );

    return signature;
  }
};
