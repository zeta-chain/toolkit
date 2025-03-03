import { utils } from "ethers";

export const toHexBytes = (data: string) => {
  return data.startsWith("0x") ? data : utils.toUtf8Bytes(data);
};
