import { utils } from "ethers";

export const toHexString = (data: string) => {
  return data.startsWith("0x") ? data : utils.hexlify(utils.toUtf8Bytes(data));
};
