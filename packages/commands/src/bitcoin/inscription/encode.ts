import { Buffer } from "buffer";
import { Command, Option } from "commander";
import { ethers } from "ethers";
import { z } from "zod";

import { formatEncodingChoices } from "../../../../../types/bitcoin.types";
import { typesAndValuesLengthRefineRule } from "../../../../../types/shared.schema";
import {
  bitcoinEncode,
  EncodingFormat,
  OpCode,
  trimOx,
} from "../../../../../utils/bitcoinEncode";

const encodeOptionsSchema = z
  .object({
    format: z.string().optional(),
    opCode: z.string().optional(),
    receiver: z.string(),
    revertAddress: z.string(),
    types: z.array(z.string()).optional().default([]),
    values: z.array(z.string()).optional().default([]),
  })
  .refine(typesAndValuesLengthRefineRule.rule, {
    message: typesAndValuesLengthRefineRule.message,
    path: typesAndValuesLengthRefineRule.path,
  });

type EncodeOptions = z.infer<typeof encodeOptionsSchema>;

const main = (options: EncodeOptions) => {
  // Ensure types and values are arrays even if not provided
  const types = options.types || [];
  const values = options.values || [];

  let payloadBuffer: Buffer;

  if (types.length === 0 && values.length === 0) {
    // Empty payload
    payloadBuffer = Buffer.from([]);
  } else {
    const encodedPayload = new ethers.AbiCoder().encode(types, values);
    payloadBuffer = Buffer.from(trimOx(encodedPayload), "hex");
  }

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
  .option("-t, --types <types...>", "ABI types (e.g. string uint256)", [])
  .option("-v, --values <values...>", "Values corresponding to types", [])
  .requiredOption("-a, --revert-address <address>", "Bitcoin revert address")
  .addOption(
    new Option("-o, --op-code <code>", "Operation code")
      .choices(Object.keys(OpCode).filter((key) => isNaN(Number(key))))
      .default("DepositAndCall")
  )
  .addOption(
    new Option("-f, --format <format>", "Encoding format")
      .choices(formatEncodingChoices)
      .default("ABI")
  )
  .action(main);
