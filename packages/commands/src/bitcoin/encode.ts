import { Buffer } from "buffer";
import { Command, Option } from "commander";
import { ethers } from "ethers";

import {
  bitcoinEncode,
  EncodingFormat,
  OpCode,
  trimOx,
} from "../../../client/src/bitcoinEncode";

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

  // Encode the data
  const result = bitcoinEncode(
    options.receiver,
    payloadBuffer,
    options.revertAddress,
    OpCode[options.opCode as keyof typeof OpCode],
    EncodingFormat[options.format as keyof typeof EncodingFormat]
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
  .addOption(
    new Option("-o, --op-code <code>", "Operation code")
      .choices(Object.keys(OpCode).filter((key) => isNaN(Number(key))))
      .default("DepositAndCall")
  )
  .addOption(
    new Option("-f, --format <format>", "Encoding format")
      .choices(Object.keys(EncodingFormat).filter((key) => isNaN(Number(key))))
      .default("EncodingFmtABI")
  )
  .action(main);
