import { Address, beginCell, toNano } from "@ton/core";
import { stringToCell } from "@ton/core/dist/boc/utils/strings";
import { mnemonicToWalletKey } from "@ton/crypto";
import { TonClient, WalletContractV4 } from "@ton/ton";
import { Gateway } from "@zetachain/protocol-contracts-ton/dist/wrappers";
import { Command, Option } from "commander";
import { AbiCoder, ethers } from "ethers";
import { z } from "zod";

import {
  DEFAULT_ENDPOINT,
  DEFAULT_GATEWAY_ADDR,
} from "../../../../types/ton.constants";
import { depositAndCallOptionsSchema } from "../../../../types/ton.types";
import { handleError, hasErrorStatus } from "../../../../utils";
import { validateAndParseSchema } from "../../../../utils/validateAndParseSchema";

type DepositAndCallOptions = z.infer<typeof depositAndCallOptionsSchema>;

const main = async (options: DepositAndCallOptions) => {
  try {
    const client = new TonClient({
      endpoint: options.rpc,
      ...(options.apiKey && { apiKey: options.apiKey }),
    });

    const keyPair = await mnemonicToWalletKey(options.mnemonic.split(" "));

    const wallet = WalletContractV4.create({
      publicKey: keyPair.publicKey,
      workchain: 0,
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

export const depositAndCallCommand = new Command("deposit-and-call")
  .description("Deposit TON and call a universal contract on ZetaChain")
  .requiredOption("--amount <amount>", "Amount in TON")
  .requiredOption("--receiver <receiver>", "Receiver address on ZetaChain")
  .requiredOption("--mnemonic <mnemonic>", "24-word seed of the paying wallet")
  .option(
    "--gateway <gateway>",
    "Gateway contract address",
    DEFAULT_GATEWAY_ADDR
  )
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
  .option("--rpc <rpc>", "TON RPC endpoint", DEFAULT_ENDPOINT)
  .option("--api-key <apiKey>", "TON RPC API key")
  .action(async (raw) => {
    const options = validateAndParseSchema(raw, depositAndCallOptionsSchema, {
      exitOnError: true,
    });
    await main(options);
  });
