import { ethers } from "ethers";
import { z } from "zod";

import { stringArraySchema } from "../../../types/shared.schema";
import { validateAndParseSchema } from "../../../utils/validateAndParseSchema";

const encodeOptionsSchema = z.object({
  data: z
    .string({
      required_error: "Data is required",
    })
    .refine((str) => !str.startsWith("0x") || /^0x[0-9a-fA-F]+$/.test(str), {
      message: "Hex data must be a valid hex string",
    }),
  objects: stringArraySchema
    .optional()
    .refine(
      (arr) => !arr || arr.every((obj) => /^0x[0-9a-fA-F]+$/.test(obj.trim())),
      { message: "Objects must be valid hex strings starting with 0x" }
    ),
  typeArguments: stringArraySchema
    .optional()
    .refine(
      (arr) =>
        !arr ||
        arr.every((type) =>
          /^0x[0-9a-fA-F]+(::[a-zA-Z_][a-zA-Z0-9_]*)+$/.test(type.trim())
        ),
      {
        message:
          "Type arguments must follow the format 0x{address}::{module}::{name}",
      }
    ),
});

export type EncodeOptions = z.infer<typeof encodeOptionsSchema>;

/**
 * Encodes data for Sui blockchain transactions using ethers.js
 *
 * @param {EncodeOptions} options - The encoding options
 * @param {string} options.data - The data to encode
 * @param {string[]} [options.typeArguments=[]] - Type arguments for generic functions
 * @param {string[]} [options.objects=[]] - Object references to include
 * @returns {string} The ABI-encoded data suitable for Sui transactions
 */
export const suiEncode = (options: EncodeOptions): string => {
  const {
    data,
    typeArguments = [],
    objects = [],
  } = validateAndParseSchema(options, encodeOptionsSchema);

  const paddedObjects = objects.map((obj) =>
    ethers.zeroPadValue(obj.trim(), 32)
  );

  // If data starts with 0x, treat it as a hex string, otherwise encode as UTF-8
  const encodedData = data.startsWith("0x")
    ? data
    : ethers.hexlify(ethers.toUtf8Bytes(data));

  const encoded = ethers.AbiCoder.defaultAbiCoder().encode(
    ["tuple(string[] typeArguments, bytes32[] objects, bytes message)"],
    [[typeArguments, paddedObjects, encodedData]]
  );

  return encoded;
};
