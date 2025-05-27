import { Address, toNano } from "@ton/core";
import { mnemonicToWalletKey } from "@ton/crypto";
import { TonClient, WalletContractV4 } from "@ton/ton";
import { Gateway } from "@zetachain/protocol-contracts-ton/dist/wrappers";
import { Command } from "commander";
import { z } from "zod";

import { validateAndParseSchema } from "../../../../utils/validateAndParseSchema";

const DEFAULT_GATEWAY_ADDR =
  "0:7a4d41496726aadb227cf4d313c95912f1fe6cc742c18ebde306ff59881d8816";

const depositOptionsSchema = z.object({
  amount: z.string(),
  mnemonic: z.string(),
  receiver: z
    .string()
    .regex(
      /^0x[0-9a-fA-F]{40}$/,
      "EVM address must be 0x-prefixed 20-byte hex"
    ),
  gateway: z.string(),
});

type DepositOptions = z.infer<typeof depositOptionsSchema>;

const main = async (options: DepositOptions) => {
  const client = new TonClient({
    endpoint: "https://testnet.toncenter.com/api/v2/jsonRPC",
  });

  const keyPair = await mnemonicToWalletKey(options.mnemonic.split(" "));

  const wallet = WalletContractV4.create({
    publicKey: keyPair.publicKey,
    workchain: 0,
  });

  const openedWallet = client.open(wallet);
  const sender = openedWallet.sender(keyPair.secretKey);

  const gatewayAddr = Address.parse(options.gateway);
  const gateway = client.open(await Gateway.createFromAddress(gatewayAddr));

  const receiverEVM = Buffer.from(options.receiver.slice(2), "hex").toString();
  await gateway.sendDeposit(sender, toNano(options.amount), receiverEVM);

  console.log(
    `✅ Sent deposit of ${options.amount} TON → ${options.receiver}. ` +
      "Watch the tx in the Ton explorer; the EVM side will emit once confirmations finalise."
  );
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
  .action(async (raw) => {
    const options = validateAndParseSchema(raw, depositOptionsSchema, {
      exitOnError: true,
    });
    await main(options);
  });
