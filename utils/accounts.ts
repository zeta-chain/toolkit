import confirm from "@inquirer/confirm";
import { decodeSuiPrivateKey } from "@mysten/sui/cryptography";
import { Ed25519Keypair } from "@mysten/sui/keypairs/ed25519";
import { Secp256k1Keypair } from "@mysten/sui/keypairs/secp256k1";
import { Secp256r1Keypair } from "@mysten/sui/keypairs/secp256r1";
import { Keypair } from "@solana/web3.js";
import { mnemonicNew, mnemonicToWalletKey } from "@ton/crypto";
import { WalletContractV4 } from "@ton/ton";
import * as bitcoin from "bitcoinjs-lib";
import ECPairFactory from "ecpair";
import { ethers } from "ethers";
import path from "path";
import * as ecc from "tiny-secp256k1";

import {
  AccountData,
  accountDataSchema,
  AccountInfo,
  AvailableAccountTypes,
  BitcoinAccountData,
  EVMAccountData,
  SolanaAccountData,
  SuiAccountData,
} from "../types/accounts.types";
import {
  safeExists,
  safeMkdir,
  safeReadDir,
  safeReadFile,
  safeWriteFile,
} from "./fsUtils";
import { handleError } from "./handleError";
import { getAccountKeyPath, getAccountTypeDir } from "./keyPaths";
import { parseJson } from "./parseJson";

/**
 * Check if an account exists by name and type
 */
export const accountExists = (
  accountType: (typeof AvailableAccountTypes)[number],
  accountName?: string
): boolean => {
  if (!accountName) return false;
  const keyPath = getAccountKeyPath(accountType, accountName);
  return safeExists(keyPath);
};

/**
 * Get account data by account name and type
 * @typeparam T The expected account data type
 */
export const getAccountData = <
  T extends
    | EVMAccountData
    | SolanaAccountData
    | BitcoinAccountData
    | SuiAccountData
>(
  accountType: (typeof AvailableAccountTypes)[number],
  accountName: string
): T | undefined => {
  const keyPath = getAccountKeyPath(accountType, accountName);

  if (!safeExists(keyPath)) {
    return undefined;
  }

  try {
    const keyData = parseJson(safeReadFile(keyPath), accountDataSchema);
    return keyData as T;
  } catch {
    return undefined;
  }
};

const createEVMAccount = (privateKey?: string): AccountData => {
  const wallet = privateKey
    ? new ethers.Wallet(privateKey)
    : ethers.Wallet.createRandom();
  return {
    address: wallet.address,
    mnemonic: "mnemonic" in wallet ? wallet.mnemonic?.phrase : undefined,
    privateKey: wallet.privateKey,
  };
};

const createSolanaAccount = (privateKey?: string): AccountData => {
  const keypair = privateKey
    ? Keypair.fromSecretKey(Buffer.from(privateKey, "hex"))
    : Keypair.generate();
  return {
    address: keypair.publicKey.toBase58(),
    privateKey: `0x${Buffer.from(keypair.secretKey).toString("hex")}`,
    privateKeyEncoding: "hex",
    privateKeyScheme: "ed25519",
    publicKey: keypair.publicKey.toBase58(),
  };
};

const createSUIAccount = (privateKey?: string): AccountData => {
  let keypair: Ed25519Keypair | Secp256k1Keypair | Secp256r1Keypair;

  if (privateKey) {
    const pair = decodeSuiPrivateKey(privateKey);

    if (pair.schema === "ED25519") {
      keypair = Ed25519Keypair.fromSecretKey(pair.secretKey);
    } else if (pair.schema === "Secp256k1") {
      keypair = Secp256k1Keypair.fromSecretKey(pair.secretKey);
    } else if (pair.schema === "Secp256r1") {
      keypair = Secp256r1Keypair.fromSecretKey(pair.secretKey);
    } else {
      throw new Error(`Unsupported key schema: ${pair.schema}`);
    }
  } else {
    keypair = new Ed25519Keypair();
  }

  const secretKey = keypair.getSecretKey();
  return {
    address: keypair.toSuiAddress(),
    privateKey: secretKey,
    privateKeyEncoding: "hex",
    privateKeyScheme: keypair.getKeyScheme(),
    publicKey: keypair.getPublicKey().toBase64(),
  };
};

const createTONAccount = async (
  privateKey?: string,
  mnemonic?: string
): Promise<AccountData> => {
  let mnemonicArray: string[];
  let keyPair: { publicKey: Buffer; secretKey: Buffer };
  let fullPrivateKey: string;

  if (privateKey) {
    const clean = privateKey.startsWith("0x")
      ? privateKey.slice(2)
      : privateKey;
    const buf = Buffer.from(clean, "hex");
    if (buf.length !== 64)
      throw new Error("TON key must be 64 bytes (32 + 32)");
    keyPair = { publicKey: buf.slice(32), secretKey: buf.slice(0, 32) };
    mnemonicArray = mnemonic ? mnemonic.split(" ") : [];
    fullPrivateKey = `0x${keyPair.secretKey.toString("hex")}`;
  } else {
    mnemonicArray = mnemonic ? mnemonic.split(" ") : await mnemonicNew();
    keyPair = await mnemonicToWalletKey(mnemonicArray);
    fullPrivateKey = `0x${keyPair.secretKey.toString("hex")}`;
  }

  const wallet = WalletContractV4.create({
    publicKey: keyPair.publicKey,
    workchain: 0,
  });

  const address = wallet.address.toString({
    bounceable: false,
    testOnly: true,
    urlSafe: true,
  });

  return {
    address,
    mnemonic: mnemonicArray.join(" "),
    privateKey: fullPrivateKey,
    publicKey: `0x${keyPair.publicKey.toString("hex")}`,
  };
};

export const createAccountForType = async (
  type: (typeof AvailableAccountTypes)[number],
  name: string,
  privateKey?: string,
  mnemonic?: string
): Promise<void> => {
  try {
    const baseDir = getAccountTypeDir(type);
    safeMkdir(baseDir);

    const keyPath = getAccountKeyPath(type, name);

    if (safeExists(keyPath)) {
      const shouldOverwrite = await confirm({
        default: false,
        message: `File ${keyPath} already exists. Overwrite?`,
      });
      if (!shouldOverwrite) {
        console.log(`Operation cancelled for ${type} account.`);
        return;
      }
    }

    let keyData: AccountData;

    if (type === "evm") {
      keyData = createEVMAccount(privateKey);
    } else if (type === "solana") {
      keyData = createSolanaAccount(privateKey);
    } else if (type === "sui") {
      keyData = createSUIAccount(privateKey);
    } else if (type === "bitcoin") {
      keyData = createBitcoinAccount(privateKey);
    } else if (type === "ton") {
      keyData = await createTONAccount(privateKey, mnemonic);
    } else {
      throw new Error(`Unsupported account type: ${type as string}`);
    }
    safeWriteFile(keyPath, keyData);
    console.log(`${type.toUpperCase()} account created successfully!`);
    console.log(`Key saved to: ${keyPath}`);

    const address =
      type === "bitcoin" ? keyData.mainnetAddress : keyData.address;
    console.log(`Address: ${address}`);
  } catch (error: unknown) {
    handleError({
      context: "Failed to create or save account",
      error,
      shouldThrow: true,
    });
  }
};

const createBitcoinAccount = (privateKey?: string): AccountData => {
  const ECPair = ECPairFactory(ecc);

  // Generate or use provided keypair
  const keyPair = privateKey
    ? ECPair.fromPrivateKey(Buffer.from(privateKey, "hex"))
    : ECPair.makeRandom();

  // Store the raw private key bytes (hex encoded for storage)
  const privateKeyBytes = keyPair.privateKey?.toString("hex") || "";
  if (!privateKeyBytes) {
    throw new Error("Failed to generate Bitcoin private key");
  }

  // Create testnet WIF
  const testnetWIF = ECPair.fromPrivateKey(
    Buffer.from(privateKeyBytes, "hex"),
    {
      network: bitcoin.networks.testnet,
    }
  ).toWIF();

  // Create mainnet WIF
  const mainnetWIF = ECPair.fromPrivateKey(
    Buffer.from(privateKeyBytes, "hex"),
    {
      network: bitcoin.networks.bitcoin,
    }
  ).toWIF();

  // Generate a SegWit (P2WPKH) address for mainnet
  const { address: mainnetAddress } = bitcoin.payments.p2wpkh({
    network: bitcoin.networks.bitcoin,
    pubkey: keyPair.publicKey,
  });

  // Generate a SegWit (P2WPKH) address for testnet
  const { address: testnetAddress } = bitcoin.payments.p2wpkh({
    network: bitcoin.networks.testnet,
    pubkey: keyPair.publicKey,
  });

  if (!mainnetAddress || !testnetAddress)
    throw new Error("Unable to generate Bitcoin addresses");

  return {
    mainnetAddress,
    mainnetWIF,
    privateKey: privateKeyBytes,
    testnetAddress,
    testnetWIF,
  };
};

export const listChainAccounts = (
  chainType: (typeof AvailableAccountTypes)[number]
): AccountInfo[] => {
  const chainDir = getAccountTypeDir(chainType);
  if (!safeExists(chainDir)) return [];

  const files = safeReadDir(chainDir).filter((file) => file.endsWith(".json"));

  const accounts = files.flatMap((file) => {
    const keyPath = path.join(chainDir, file);
    const keyData = parseJson(safeReadFile(keyPath), accountDataSchema);
    const name = file.replace(".json", "");

    if (chainType === "evm") {
      return [
        {
          address: (keyData as AccountData).address,
          name,
          type: chainType,
        },
      ];
    } else if (chainType === "solana") {
      return [
        {
          address: (keyData as AccountData).address,
          name,
          type: chainType,
        },
      ];
    } else if (chainType === "sui") {
      return [
        {
          address: (keyData as AccountData).address,
          name,
          type: chainType,
        },
      ];
    } else if (chainType === "bitcoin") {
      // Return both mainnet and testnet addresses as separate entries
      return [
        {
          address: (keyData as AccountData).mainnetAddress,
          name,
          type: "bitcoin",
        },
        {
          address: (keyData as AccountData).testnetAddress,
          name,
          type: "bitcoin",
        },
      ];
    } else if (chainType === "ton") {
      return [
        {
          address: (keyData as AccountData).address,
          name,
          type: chainType,
        },
      ];
    }

    return [];
  });

  return accounts.filter(
    (account): account is AccountInfo => account.address !== undefined
  );
};
