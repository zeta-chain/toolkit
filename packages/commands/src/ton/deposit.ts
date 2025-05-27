import { Address, toNano } from "@ton/core";
import { mnemonicToWalletKey } from "@ton/crypto";
import { TonClient, WalletContractV4 } from "@ton/ton";
import { Gateway } from "@zetachain/protocol-contracts-ton/dist/wrappers";
import { Command } from "commander";
import { z } from "zod";

import { validateAndParseSchema } from "../../../../utils/validateAndParseSchema";
import { depositOptionsSchema } from "../../../../types/ton.types";

const DEFAULT_GATEWAY_ADDR =
  "0:7a4d41496726aadb227cf4d313c95912f1fe6cc742c18ebde306ff59881d8816";
const DEFAULT_ENDPOINT = "https://testnet.toncenter.com/api/v2/jsonRPC";

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
  .description("Deposit TON -> ZetaChain via Gateway")
  .requiredOption("--amount <amount>", "Amount in TON")
  .requiredOption("--receiver <receiver>", "Destination 0x-EVM address")
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
