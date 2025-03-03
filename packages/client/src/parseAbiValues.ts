import { toHexString } from "./toHexString";

export const parseAbiValues = (types: string[], values: string[]) => {
  return values.map((value: string, index: number) => {
    const type = types[index];

    if (type === "bool") {
      try {
        return JSON.parse(value.toLowerCase());
      } catch (e) {
        throw new Error(`Invalid boolean value: ${value}`);
      }
    } else if (type.startsWith("uint") || type.startsWith("int")) {
      return BigInt(value);
    } else if (type === "bytes") {
      return toHexString(value);
    } else {
      return value;
    }
  });
};
