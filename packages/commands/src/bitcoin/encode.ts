import { Command } from "commander";
import { bitcoinEncode, trimOx } from "../../../client/src/bitcoinEncode";
import { Buffer } from "buffer";
import { ethers } from "ethers";

interface EncodeOptions {
  receiver: string;
  types: string;
  values: string[];
  revertAddress: string;
  opCode?: string;
  format?: string;
}

const main = async (options: EncodeOptions) => {
  let types: string[];
  let values: any[];
  try {
    types = JSON.parse(options.types);
    values = JSON.parse(options.values[0]);
    if (!Array.isArray(types)) {
      throw new Error("Types must be an array");
    }
    if (!Array.isArray(values)) {
      throw new Error("Values must be an array");
    }
    if (types.length !== values.length) {
      throw new Error("Number of types must match number of values");
    }
  } catch (e) {
    throw new Error(
      "Invalid format. Expected JSON arrays for both types and values"
    );
  }

  // Encode using ABI
  const encodedPayload = new ethers.AbiCoder().encode(types, values);
  const payloadBuffer = Buffer.from(trimOx(encodedPayload), "hex");

  // Parse opCode and format as numbers
  const opCode = parseInt(options.opCode || "1");
  const encodingFormat = parseInt(options.format || "0");

  // Validate opCode and format
  if (opCode < 0 || opCode > 3) {
    throw new Error("Op code must be between 0 and 3");
  }
  if (encodingFormat < 0 || encodingFormat > 2) {
    throw new Error("Encoding format must be between 0 and 2");
  }

  // Encode the data
  const result = bitcoinEncode(
    options.receiver,
    payloadBuffer,
    options.revertAddress,
    opCode,
    encodingFormat
  );

  console.log(result);
};

export const encodeCommand = new Command()
  .name("encode")
  .description("Encode data for Bitcoin transactions using ABI encoding")
  .requiredOption("-r, --receiver <address>", "Receiver address")
  .requiredOption(
    "-t, --types <types>",
    'ABI types as JSON array (e.g. \'["string","uint256"]\')'
  )
  .requiredOption("-v, --values <values...>", "Values corresponding to types")
  .requiredOption("-a, --revert-address <address>", "Bitcoin revert address")
  .option("-o, --op-code <code>", "Operation code (0-3)", "1")
  .option("-f, --format <format>", "Encoding format (0-2)", "0")
  .action(main);
