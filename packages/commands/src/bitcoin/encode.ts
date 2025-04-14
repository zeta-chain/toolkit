import { Buffer } from "buffer";
import { Command } from "commander";
import { ethers } from "ethers";

import { bitcoinEncode, trimOx } from "../../../client/src/bitcoinEncode";

interface EncodeOptions {
  format?: string;
  opCode?: string;
  receiver: string;
  revertAddress: string;
  types: string[];
  values: string[];
}

const main = (options: EncodeOptions) => {
  if (options.types.length !== options.values.length) {
    throw new Error("Number of types must match number of values");
  }

  const encodedPayload = new ethers.AbiCoder().encode(
    options.types,
    options.values
  );
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
  .requiredOption("-t, --types <types...>", "ABI types (e.g. string uint256)")
  .requiredOption("-v, --values <values...>", "Values corresponding to types")
  .requiredOption("-a, --revert-address <address>", "Bitcoin revert address")
  .option("-o, --op-code <code>", "Operation code (0-3)", "1")
  .option("-f, --format <format>", "Encoding format (0-2)", "0")
  .action(main);
