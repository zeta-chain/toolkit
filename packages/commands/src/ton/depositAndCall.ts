import { Option } from "commander";
import { z } from "zod";

import { tonDepositAndCall } from "../../../../src/chains/ton/depositAndCall";
import { depositAndCallOptionsSchema } from "../../../../types/ton.types";
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

type DepositAndCallOptions = z.infer<typeof depositAndCallOptionsSchema>;

const main = async (options: DepositAndCallOptions) => {
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

    await tonDepositAndCall(
      {
        amount: options.amount,
        data: options.data,
        receiver: options.receiver,
        types: options.types,
        values: options.values,
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
  } catch (error) {
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
        context: "Error sending TON deposit and call",
        error,
        shouldThrow: false,
      });
    }

    process.exit(1);
  }
};

export const depositAndCallCommand = createTonCommandWithCommonOptions(
  "deposit-and-call"
)
  .summary("Deposit TON and call a contract on ZetaChain")
  .description("Deposit TON and call a universal contract on ZetaChain")
  .requiredOption("--amount <amount>", "Amount in TON")
  .addOption(new Option("--types <types...>", "ABI types").conflicts(["data"]))
  .addOption(
    new Option(
      "--values <values...>",
      "Values corresponding to types"
    ).conflicts(["data"])
  )
  .addOption(
    new Option("--data <data>", "Data to call the contract with").conflicts([
      "types",
      "values",
    ])
  )
  .action(async (raw) => {
    const options = validateAndParseSchema(raw, depositAndCallOptionsSchema, {
      exitOnError: true,
    });
    await main(options);
  });
