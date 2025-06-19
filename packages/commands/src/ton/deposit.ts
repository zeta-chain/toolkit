import { z } from "zod";

import { tonDeposit } from "../../../../src/lib/ton/deposit";
import { depositOptionsSchema } from "../../../../types/ton.types";
import {
  handleError,
  hasErrorStatus,
  validateAndParseSchema,
} from "../../../../utils";
import {
  createTonCommandWithCommonOptions,
  getAccount,
} from "../../../../utils/ton.command.helpers";

type DepositOptions = z.infer<typeof depositOptionsSchema>;

const main = async (options: DepositOptions) => {
  try {
    const { wallet, keyPair } = await getAccount({
      mnemonic: options.mnemonic,
      name: options.name,
    });

    await tonDeposit(
      {
        amount: options.amount,
        receiver: options.receiver,
      },
      {
        apiKey: options.apiKey,
        gateway: options.gateway,
        keyPair,
        rpc: options.rpc,
        wallet,
      }
    );
  } catch (error: unknown) {
    if (hasErrorStatus(error, 429)) {
      handleError({
        context: "TON RPC rate limit exceeded",
        error: new Error(
          "Too many requests to TON RPC endpoint. Please try again later or use an API key with --api-key option."
        ),
        shouldThrow: false,
      });
    } else {
      handleError({
        context: "Error sending TON deposit",
        error,
        shouldThrow: false,
      });
    }
    process.exit(1);
  }
};

export const depositCommand = createTonCommandWithCommonOptions("deposit")
  .description("Deposit TON to an EOA or a contract on ZetaChain")
  .requiredOption("--amount <amount>", "Amount in TON")
  .action(async (raw) => {
    const options = validateAndParseSchema(raw, depositOptionsSchema, {
      exitOnError: true,
    });
    await main(options);
  });
