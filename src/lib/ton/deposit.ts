import { KeyPair, mnemonicToWalletKey, mnemonicValidate } from "@ton/crypto";
import { Address, toNano, TonClient, WalletContractV4 } from "@ton/ton";
import { Gateway } from "@zetachain/protocol-contracts-ton/dist/wrappers";

type tonDepositParams = {
  amount: string;
  receiver: string;
  token?: string;
};

type tonOptions = {
  apiKey?: string;
  gateway: string;
  keyPair?: KeyPair;
  rpc: string;
  signer?: string;
  wallet?: WalletContractV4;
};

const getAccountFromMnemonic = async (mnemonicRaw: string) => {
  // Remove extra spaces and newlines
  const mnemonic = mnemonicRaw.trim().replace(/\s+/g, " ");

  const mnemonicWords = mnemonic.split(" ");

  if (!(await mnemonicValidate(mnemonicWords))) {
    throw new Error("Invalid mnemonic phrase");
  }

  const keyPair = await mnemonicToWalletKey(mnemonicWords);

  const wallet = WalletContractV4.create({
    publicKey: keyPair.publicKey,
    workchain: 0,
  });

  return { keyPair, wallet };
};

export const tonDeposit = async (
  params: tonDepositParams,
  options: tonOptions
) => {
  let wallet, keyPair;
  if (options.wallet && options.keyPair) {
    wallet = options.wallet;
    keyPair = options.keyPair;
  } else if (options.signer) {
    const account = await getAccountFromMnemonic(options.signer);
    wallet = account.wallet;
    keyPair = account.keyPair;
  } else {
    throw new Error("No wallet or key pair provided");
  }

  const client = new TonClient({
    endpoint: options.rpc,
    ...(options.apiKey && { apiKey: options.apiKey }),
  });

  const openedWallet = client.open(wallet);
  const sender = openedWallet.sender(keyPair.secretKey);

  const gatewayAddr = Address.parse(options.gateway);
  const gateway = client.open(Gateway.createFromAddress(gatewayAddr));

  await gateway.sendDeposit(sender, toNano(params.amount), params.receiver);
};
