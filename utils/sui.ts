import { SuiClient } from "@mysten/sui/client";
import { Ed25519Keypair } from "@mysten/sui/keypairs/ed25519";
import { mnemonicToSeedSync } from "bip39";
import { HDKey } from "ethereum-cryptography/hdkey";

export const GAS_BUDGET = 100_000_000;

export const getCoin = async (
  client: SuiClient,
  owner: string,
  coinType: string,
  excludeObjectId?: string
): Promise<string> => {
  const coins = await client.getCoins({
    coinType,
    owner,
  });
  if (!coins.data.length) {
    throw new Error(`No coins of type ${coinType} found in this account`);
  }

  if (excludeObjectId) {
    const otherCoin = coins.data.find(
      (coin) => coin.coinObjectId !== excludeObjectId
    );
    if (!otherCoin) {
      throw new Error(`No other SUI coins found for gas payment`);
    }
    return otherCoin.coinObjectId;
  }

  return coins.data[0].coinObjectId;
};

export const getKeypairFromMnemonic = (mnemonic: string): Ed25519Keypair => {
  const seed = mnemonicToSeedSync(mnemonic);
  const hdKey = HDKey.fromMasterSeed(seed);
  const derivedKey = hdKey.derive("m/44'/784'/0'/0'/0'");
  return Ed25519Keypair.fromSecretKey(derivedKey.privateKey!);
};

export const getKeypairFromPrivateKey = (
  privateKey: string
): Ed25519Keypair => {
  try {
    // Remove 0x prefix if present
    const cleanKey = privateKey.startsWith("0x")
      ? privateKey.slice(2)
      : privateKey;
    const keyBytes = Uint8Array.from(Buffer.from(cleanKey, "hex"));
    return Ed25519Keypair.fromSecretKey(keyBytes);
  } catch (error) {
    throw new Error("Invalid private key format");
  }
};
