import { getAssociatedTokenAddress, TOKEN_PROGRAM_ID } from "@solana/spl-token";
import {
  AccountMeta,
  PublicKey,
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
  solanaDepositAndCallParamsSchema,
  solanaOptionsSchema,
} from "../../schemas/solana";

type solanaDepositAndCallParams = z.infer<
  typeof solanaDepositAndCallParamsSchema
>;
type solanaOptions = z.infer<typeof solanaOptionsSchema>;

/**
 * Deposits tokens and makes a cross-chain call from Solana to a universal contract on ZetaChain.
 *
 * This function combines token deposit with a contract call in a single transaction.
 * It allows you to transfer tokens from Solana to ZetaChain and immediately
 * execute a function call on the universal contract. Supports both native SOL
 * and SPL tokens.
 *
 * @param params - The deposit and call parameters including amount, receiver, token mint address, function types/values, and revert options
 * @param options - Configuration options including chain ID and signer keypair
 * @returns Promise that resolves to the transaction signature
 */
export const solanaDepositAndCall = async (
  params: solanaDepositAndCallParams,
  options: solanaOptions
): Promise<string> => {
  const validatedParams = validateAndParseSchema(
    params,
    solanaDepositAndCallParamsSchema
  );
  const validatedOptions = validateAndParseSchema(options, solanaOptionsSchema);

  const { gateway, connection } = createBrowserSolanaGateway(
    validatedOptions.chainId
  );

  const receiverBytes = ethers.getBytes(validatedParams.receiver);
  const abiCoder = ethers.AbiCoder.defaultAbiCoder();
  const encodedParameters = abiCoder.encode(
    validatedParams.types,
    validatedParams.values
  );
  const message = Buffer.from(encodedParameters.slice(2), "hex");

  const revertOptions = createRevertOptions(
    validatedParams.revertOptions,
    validatedOptions.signer.publicKey
  );

  if (validatedParams.token) {
    // SPL Token deposit and call
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

    // Create deposit SPL token and call instruction
    const depositAmount = ethers.parseUnits(validatedParams.amount, decimals);

    // Create instruction data for depositSplTokenAndCall
    const discriminator = Buffer.from([14, 181, 189, 90, 28, 63, 247, 99]); // depositSplTokenAndCall discriminator
    const amountBuffer = Buffer.alloc(8);
    amountBuffer.writeBigUInt64LE(BigInt(depositAmount.toString()), 0);

    const receiverBuffer = Buffer.from(receiverBytes);

    // Serialize message length + message
    const messageLength = Buffer.alloc(4);
    messageLength.writeUInt32LE(message.length, 0);
    const messageBuffer = Buffer.from(message);

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

    const keys: AccountMeta[] = [
      {
        isSigner: true,
        isWritable: true,
        pubkey: validatedOptions.signer.publicKey,
      },
      { isSigner: false, isWritable: true, pubkey: from },
      { isSigner: false, isWritable: true, pubkey: tssAta },
      {
        isSigner: false,
        isWritable: false,
        pubkey: new PublicKey(validatedParams.token),
      },
      { isSigner: false, isWritable: true, pubkey: tssPda },
      { isSigner: false, isWritable: false, pubkey: TOKEN_PROGRAM_ID },
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
    // SOL deposit and call
    await isBrowserSafeSOLBalanceSufficient(
      connection,
      validatedOptions.signer,
      validatedParams.amount
    );

    // Create deposit SOL and call instruction
    const depositAmount = ethers.parseUnits(validatedParams.amount, 9);

    // Create instruction data for depositAndCall
    const discriminator = Buffer.from([65, 33, 87, 72, 170, 243, 139, 82]); // depositAndCall discriminator
    const amountBuffer = Buffer.alloc(8);
    amountBuffer.writeBigUInt64LE(BigInt(depositAmount.toString()), 0);

    const receiverBuffer = Buffer.from(receiverBytes);

    // Serialize message length + message
    const messageLength = Buffer.alloc(4);
    messageLength.writeUInt32LE(message.length, 0);
    const messageBuffer = Buffer.from(message);

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
