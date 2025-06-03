import { Address, toNano } from "@ton/core";
import { mnemonicToWalletKey } from "@ton/crypto";
import { TonClient, WalletContractV4 } from "@ton/ton";
import { Gateway } from "@zetachain/protocol-contracts-ton/dist/wrappers";
import { Command } from "commander";
import { z } from "zod";

import {
  DEFAULT_ENDPOINT,
  DEFAULT_GATEWAY_ADDR,
} from "../../../../types/ton.constants";
import { depositOptionsSchema } from "../../../../types/ton.types";
import { validateAndParseSchema } from "../../../../utils/validateAndParseSchema";

type DepositOptions = z.infer<typeof depositOptionsSchema>;

const main = async (options: DepositOptions) => {
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

  await gateway.sendDeposit(sender, toNano(options.amount), options.receiver);
};

export const depositCommand = new Command("deposit")
  .description("Deposit TON to an EOA or a contract on ZetaChain")
  .requiredOption("--amount <amount>", "Amount in TON")
  .requiredOption("--receiver <receiver>", "Receiver address on ZetaChain")
  .requiredOption("--mnemonic <mnemonic>", "24-word seed of the paying wallet")
  .option(
    "--gateway <gateway>",
    "Gateway contract address",
    DEFAULT_GATEWAY_ADDR
  )
  .option("--endpoint <endpoint>", "TON RPC endpoint", DEFAULT_ENDPOINT)
  .option("--api-key <apiKey>", "TON RPC API key")
  .action(async (raw) => {
    const options = validateAndParseSchema(raw, depositOptionsSchema, {
      exitOnError: true,
    });
    await main(options);
  });
