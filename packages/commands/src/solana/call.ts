import { z } from "zod";

import { solanaCall } from "../../../../src/chains/solana/call";
import { handleError, validateAndParseSchema } from "../../../../utils";
import { parseAbiValues } from "../../../../utils/parseAbiValues";
import {
  getAPIbyChainId,
  getBrowserSafeKeypair,
} from "../../../../utils/solana.browser.helpers";
import {
  confirmSolanaTx,
  createRevertOptions as createCliRevertOptions,
  createSolanaCommandWithCommonOptions,
  prepareRevertOptions,
  solanaCallOptionsSchema,
} from "../../../../utils/solana.commands.helpers";

type CallOptions = z.infer<typeof solanaCallOptionsSchema>;

const main = async (options: CallOptions) => {
  const keypair = await getBrowserSafeKeypair({
    mnemonic: options.mnemonic,
    name: options.name,
    privateKey: options.privateKey,
  });

  const API = getAPIbyChainId(options.chainId);

  const stringifiedTypes = JSON.stringify(options.types);
  const values = parseAbiValues(stringifiedTypes, options.values);

  const revertOptions = prepareRevertOptions(options);

  // Create an Anchor PublicKey for CLI confirmation (which expects Anchor types)
  const anchorPublicKey = new (
    await import("@coral-xyz/anchor")
  ).web3.PublicKey(keypair.publicKey.toBase58());

  await confirmSolanaTx({
    api: API,
    message: values.join(", "),
    receiver: options.receiver,
    revertOptions: createCliRevertOptions(revertOptions, anchorPublicKey),
    sender: keypair.publicKey.toBase58(),
  });

  try {
    const tx = await solanaCall(
      {
        receiver: options.receiver,
        revertOptions,
        types: options.types,
        values,
      },
      {
        chainId: options.chainId,
        signer: keypair,
      }
    );
    console.log("Transaction hash:", tx);
  } catch (error) {
    handleError({
      context: "Error during call",
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
