import { Address, beginCell, toNano } from "@ton/core";
import { stringToCell } from "@ton/core/dist/boc/utils/strings";
import { mnemonicToWalletKey } from "@ton/crypto";
import { TonClient, WalletContractV4 } from "@ton/ton";
import { Gateway } from "@zetachain/protocol-contracts-ton/dist/wrappers";
import { Command, Option } from "commander";
import { AbiCoder, ethers } from "ethers";
import { z } from "zod";

import { depositAndCallOptionsSchema } from "../../../../types/ton.types";
import { validateAndParseSchema } from "../../../../utils/validateAndParseSchema";
import {
  DEFAULT_GATEWAY_ADDR,
  DEFAULT_ENDPOINT,
} from "../../../../types/ton.constants";

type DepositAndCallOptions = z.infer<typeof depositAndCallOptionsSchema>;

const main = async (options: DepositAndCallOptions) => {
  const client = new TonClient({
    endpoint: options.endpoint,
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
  .option("--endpoint <endpoint>", "TON RPC endpoint", DEFAULT_ENDPOINT)
  .option("--api-key <apiKey>", "TON RPC API key")
  .action(async (raw) => {
    const options = validateAndParseSchema(raw, depositAndCallOptionsSchema, {
      exitOnError: true,
    });
    await main(options);
  });
