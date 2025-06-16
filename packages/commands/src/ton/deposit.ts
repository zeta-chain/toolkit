import { Address, toNano } from "@ton/core";
import { TonClient } from "@ton/ton";
import { Gateway } from "@zetachain/protocol-contracts-ton/dist/wrappers";
import { z } from "zod";

import { depositOptionsSchema } from "../../../../types/ton.types";
import {
  handleError,
  hasErrorStatus,
  validateAndParseSchema,
} from "../../../../utils";
import {
  createTonCommandWithCommonOptions,
  getAccount,
  confirmTransaction,
} from "../../../../utils/ton.command.helpers";

type DepositOptions = z.infer<typeof depositOptionsSchema>;

const main = async (options: DepositOptions) => {
  try {
    const client = new TonClient({
      endpoint: options.rpc,
      ...(options.apiKey && { apiKey: options.apiKey }),
    });

    const { wallet, keyPair } = await getAccount({
      mnemonic: options.mnemonic,
      name: options.name,
    });

    const openedWallet = client.open(wallet);
    const sender = openedWallet.sender(keyPair.secretKey);

    const gatewayAddr = Address.parse(options.gateway);
    const gateway = client.open(Gateway.createFromAddress(gatewayAddr));
    const senderAddress = wallet.address.toString({
      bounceable: false,
      testOnly: true,
    });

    const isConfirmed = await confirmTransaction({
      amount: options.amount,
      sender: senderAddress,
      receiver: options.receiver,
      rpc: options.rpc,
    });
    if (!isConfirmed) return;

    await gateway.sendDeposit(sender, toNano(options.amount), options.receiver);
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
