import { Address, beginCell, toNano } from "@ton/core";
import { stringToCell } from "@ton/core/dist/boc/utils/strings";
import { TonClient } from "@ton/ton";
import { Gateway } from "@zetachain/protocol-contracts-ton/dist/wrappers";
import { Option } from "commander";
import { AbiCoder, ethers } from "ethers";
import { z } from "zod";

import { depositAndCallOptionsSchema } from "../../../../types/ton.types";
import { handleError, hasErrorStatus } from "../../../../utils";
import {
  createTonCommandWithCommonOptions,
  getAccount,
} from "../../../../utils/ton.command.helpers";
import { validateAndParseSchema } from "../../../../utils/validateAndParseSchema";

type DepositAndCallOptions = z.infer<typeof depositAndCallOptionsSchema>;

const main = async (options: DepositAndCallOptions) => {
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

    let payload;

    if (options.types && options.values) {
      const abiCoder = AbiCoder.defaultAbiCoder();
      const encodedHex = abiCoder.encode(options.types, options.values);
      const encodedBin = ethers.getBytes(encodedHex);

      payload = beginCell().storeBuffer(Buffer.from(encodedBin)).endCell();
    } else if (options.data) {
      payload = stringToCell(options.data);
    } else {
      throw new Error("Either types and values or data must be provided");
    }

    await gateway.sendDepositAndCall(
      sender,
      toNano(options.amount),
      options.receiver,
      payload
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
