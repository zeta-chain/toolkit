import { z } from "zod";

import { tonDeposit } from "../../../../src/chains/ton/deposit";
import { depositOptionsSchema } from "../../../../types/ton.types";
import {
  handleError,
  hasErrorStatus,
  validateAndParseSchema,
} from "../../../../utils";
import { confirmTransaction } from "../../../../utils/common.command.helpers";
import { getAddress } from "../../../../utils/getAddress";
import {
  createTonCommandWithCommonOptions,
  getAccount,
} from "../../../../utils/ton.command.helpers";

type DepositOptions = z.infer<typeof depositOptionsSchema>;

const main = async (options: DepositOptions) => {
  try {
    const { wallet, keyPair, address } = await getAccount({
      mnemonic: options.mnemonic,
      name: options.name,
    });

    const gateway =
      options.gateway || getAddress("gateway", Number(options.chainId));

    const isConfirmed = await confirmTransaction({
      amount: options.amount,
      receiver: options.receiver,
      rpc: options.rpc,
      sender: address,
    });
    if (!isConfirmed) return;

    await tonDeposit(
      {
        amount: options.amount,
        receiver: options.receiver,
      },
      {
        apiKey: options.apiKey,
        chainId: options.chainId,
        gateway,
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
  .summary("Deposit tokens from TON")
  .description("Deposit tokens to an EOA or a contract on ZetaChain")
  .requiredOption("--amount <amount>", "Amount in TON")
  .action(async (raw) => {
    const options = validateAndParseSchema(raw, depositOptionsSchema, {
      exitOnError: true,
    });
    await main(options);
  });
