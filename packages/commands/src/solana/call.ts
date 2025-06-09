import * as anchor from "@coral-xyz/anchor";
import { Wallet } from "@coral-xyz/anchor";
import { PublicKey } from "@solana/web3.js";
import GATEWAY_DEV_IDL from "@zetachain/protocol-contracts-solana/dev/idl/gateway.json";
import GATEWAY_PROD_IDL from "@zetachain/protocol-contracts-solana/prod/idl/gateway.json";
import { ethers } from "ethers";
import { z } from "zod";

import { handleError, validateAndParseSchema } from "../../../../utils";
import { parseAbiValues } from "../../../../utils/parseAbiValues";
import {
  createSolanaCommandWithCommonOptions,
  getAPI,
  getKeypair,
  solanaCallOptionsSchema,
} from "../../../../utils/solana.commands.helpers";

type CallOptions = z.infer<typeof solanaCallOptionsSchema>;

const main = async (options: CallOptions) => {
  // Mainnet and devnet use the same IDL
  const gatewayIDL =
    options.network === "localnet" ? GATEWAY_DEV_IDL : GATEWAY_PROD_IDL;

  const keypair = await getKeypair({
    mnemonic: options.mnemonic,
    name: options.name,
    privateKey: options.privateKey,
  });

  const API = getAPI(options.network);

  const connection = new anchor.web3.Connection(API);
  const provider = new anchor.AnchorProvider(connection, new Wallet(keypair));
  const gatewayProgram = new anchor.Program(gatewayIDL as anchor.Idl, provider);

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
    const tx = await gatewayProgram.methods
      .call(receiverBytes, message, revertOptions)
      .accounts({})
      .rpc();
    console.log("Transaction hash:", tx);
  } catch (error) {
    handleError({
      context: "Error during deposit and call",
      error,
      shouldThrow: false,
    });
    process.exit(1);
  }
};

export const callCommand = createSolanaCommandWithCommonOptions("call")
  .description("Call a universal contract on ZetaChain")
  .requiredOption(
    "--types <types...>",
    "List of parameter types (e.g. uint256 address)"
  )
  .requiredOption(
    "--values <values...>",
    "Parameter values for the function call"
  )
  .action(async (options) => {
    const validatedOptions = validateAndParseSchema(
      options,
      solanaCallOptionsSchema,
      {
        exitOnError: true,
      }
    );
    await main(validatedOptions);
  });
