export interface UTXO {
  txid: string;
  value: number;
  vout: number;
}

interface TransactionOutput {
  scriptpubkey: string;
  value: number;
}

export interface Transaction {
  vout: TransactionOutput[];
}
