export interface AccountData {
  [key: string]: string | undefined;
}

export interface AccountInfo {
  address: string;
  name: string;
  type: string;
}

export interface EVMAccountData {
  address: string;
  mnemonic?: string;
  name?: string;
  privateKey: string;
}

export interface SolanaAccountData {
  name?: string;
  publicKey: string;
  secretKey: string;
}
export interface AccountDetails {
  [key: string]: string;
}
