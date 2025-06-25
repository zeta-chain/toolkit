import { Address, beginCell, toNano } from "@ton/core";
import { stringToCell } from "@ton/core/dist/boc/utils/strings";
import { KeyPair, mnemonicToWalletKey, mnemonicValidate } from "@ton/crypto";
import { TonClient, WalletContractV4 } from "@ton/ton";
import { Gateway } from "@zetachain/protocol-contracts-ton/dist/wrappers";
import { AbiCoder, ethers } from "ethers";

import { ParseAbiValuesReturnType } from "../../../types/parseAbiValues.types";
import { getAddress } from "../../../utils/getAddress";

type tonDepositAndCallParams = {
  amount: string;
  data?: string;
  receiver: string;
  types?: string[];
  values?: ParseAbiValuesReturnType;
};

type tonOptions = {
  apiKey?: string;
  chainId: string;
  gateway?: string;
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

export const tonDepositAndCall = async (
  params: tonDepositAndCallParams,
  options: tonOptions
) => {
  const gatewayAddress = getAddress("gateway", Number(options.chainId));
  if (!gatewayAddress) {
    throw new Error("Gateway address not found");
  }
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

  const gatewayAddr = Address.parse(options.gateway || gatewayAddress);
  const gateway = client.open(Gateway.createFromAddress(gatewayAddr));

  let payload;

  if (params.types && params.values) {
    const abiCoder = AbiCoder.defaultAbiCoder();
    const encodedHex = abiCoder.encode(params.types, params.values);
    const encodedBin = ethers.getBytes(encodedHex);

    payload = beginCell().storeBuffer(Buffer.from(encodedBin)).endCell();
  } else if (params.data) {
    payload = stringToCell(params.data);
  } else {
    throw new Error("Either types and values or data must be provided");
  }

  await gateway.sendDepositAndCall(
    sender,
    toNano(params.amount),
    params.receiver,
    payload
  );
};
