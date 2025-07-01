import { z } from "zod";

import { solanaCall } from "../../../../src/chains/solana/call";
import { handleError, validateAndParseSchema } from "../../../../utils";
import { parseAbiValues } from "../../../../utils/parseAbiValues";
import {
  confirmSolanaTx,
  createRevertOptions,
  createSolanaCommandWithCommonOptions,
  getAPIbyChainId,
  getKeypair,
  prepareRevertOptions,
  solanaCallOptionsSchema,
} from "../../../../utils/solana.commands.helpers";

type CallOptions = z.infer<typeof solanaCallOptionsSchema>;

const main = async (options: CallOptions) => {
  const keypair = await getKeypair({
    mnemonic: options.mnemonic,
    name: options.name,
    privateKey: options.privateKey,
  });

  const API = getAPIbyChainId(options.chainId);

  const stringifiedTypes = JSON.stringify(options.types);
  const values = parseAbiValues(stringifiedTypes, options.values);

  const revertOptions = prepareRevertOptions(options);

  await confirmSolanaTx({
    api: API,
    message: values.join(", "),
    recipient: options.recipient,
    revertOptions: createRevertOptions(revertOptions, keypair.publicKey),
    sender: keypair.publicKey.toBase58(),
  });

  try {
    const tx = await solanaCall(
      {
        receiver: options.recipient,
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
