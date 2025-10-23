import axios from "axios";

import { BtcUtxo } from "../types/bitcoin.types";

/**
 * Fetches unspent transaction outputs (UTXOs) for the given address
 */
export const fetchUtxos = async (
  address: string,
  api: string
): Promise<BtcUtxo[]> => {
  return (await axios.get<BtcUtxo[]>(`${api}/address/${address}/utxo`)).data;
};
