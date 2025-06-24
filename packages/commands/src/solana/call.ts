import { z } from "zod";

import { solanaCall } from "../../../../src/lib/solana/call";
import { handleError, validateAndParseSchema } from "../../../../utils";
import { parseAbiValues } from "../../../../utils/parseAbiValues";
import {
  confirmSolanaTx,
  createRevertOptions,
  createSolanaCommandWithCommonOptions,
  getAPI,
  getChainIdFromNetwork,
  getKeypair,
  solanaCallOptionsSchema,
} from "../../../../utils/solana.commands.helpers";

type CallOptions = z.infer<typeof solanaCallOptionsSchema>;

const main = async (options: CallOptions) => {
  const keypair = await getKeypair({
    mnemonic: options.mnemonic,
    name: options.name,
    privateKey: options.privateKey,
  });

  const API = getAPI(options.network);

  const stringifiedTypes = JSON.stringify(options.types);
  const values = parseAbiValues(stringifiedTypes, options.values);

  await confirmSolanaTx({
    api: API,
    message: values.join(", "),
    recipient: options.recipient,
    revertOptions: createRevertOptions(options, keypair.publicKey),
    sender: keypair.publicKey.toBase58(),
  });

  try {
    const revertOptions = {
      abortAddress: options.abortAddress,
      callOnRevert: options.callOnRevert,
      onRevertGasLimit: options.onRevertGasLimit,
      revertAddress: options.revertAddress,
      revertMessage: options.revertMessage,
    };

    await solanaCall(
      {
        receiver: options.recipient,
        revertOptions,
        types: options.types,
        values,
      },
      {
        chainId: getChainIdFromNetwork(options.network),
        signer: keypair,
      }
    );
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
