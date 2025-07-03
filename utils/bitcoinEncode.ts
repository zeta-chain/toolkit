import { ethers } from "ethers";

// Define types
export type Address = string;
export type BtcAddress = string;

// Memo identifier byte
const MemoIdentifier = 0x5a;

// Enums
export enum OpCode {
  Call = 0b0010,
  Deposit = 0b0000,
  DepositAndCall = 0b0001,
  Invalid = 0b0011,
}

export enum EncodingFormat {
  ABI = 0b0000,
  CompactLong = 0b0010,
  CompactShort = 0b0001,
}

// Header Class
class Header {
  encodingFmt: EncodingFormat;
  opCode: OpCode;

  constructor(encodingFmt: EncodingFormat, opCode: OpCode) {
    this.encodingFmt = encodingFmt;
    this.opCode = opCode;
  }
}

// FieldsV0 Class
class FieldsV0 {
  receiver: Address;
  payload: Buffer;
  revertAddress: BtcAddress;

  constructor(receiver: Address, payload: Buffer, revertAddress: BtcAddress) {
    this.receiver = receiver;
    this.payload = payload;
    this.revertAddress = revertAddress;
  }
}

/**
 * Encodes data for a Bitcoin transaction
 * @param receiver - The address of the receiver
 * @param payload - The payload to be sent
 * @param revertAddress - Bitcoin address to revert funds to in case of failure
 * @param opCode - The operation code (defaults to DepositAndCall)
 * @param encodingFormat - The encoding format (defaults to ABI)
 * @returns The encoded data as a hex string
 */
export const bitcoinEncode = (
  receiver: Address,
  payload: Buffer,
  revertAddress: BtcAddress,
  opCode: OpCode = OpCode.DepositAndCall,
  encodingFormat: EncodingFormat = EncodingFormat.ABI
): string => {
  // Create memo header
  const header = new Header(encodingFormat, opCode);

  // Create memo fields
  const fields = new FieldsV0(receiver, payload, revertAddress);

  return bytesToHex(encodeToBytes(header, fields));
};

// Main Encoding Function
export const encodeToBytes = (header: Header, fields: FieldsV0): Uint8Array => {
  if (!header || !fields) {
    throw new Error("Header and fields are required");
  }

  // Construct Header Bytes
  const headerBytes = new Uint8Array(4);
  headerBytes[0] = MemoIdentifier;
  headerBytes[1] = (0x00 << 4) | (header.encodingFmt & 0x0f);
  headerBytes[2] = ((header.opCode & 0x0f) << 4) | 0x00;
  headerBytes[3] = 0b00000111;

  // Encode Fields
  let encodedFields: Uint8Array;
  switch (header.encodingFmt) {
    case EncodingFormat.ABI:
      encodedFields = encodeFieldsABI(fields);
      break;
    case EncodingFormat.CompactShort:
    case EncodingFormat.CompactLong:
      encodedFields = encodeFieldsCompact(header.encodingFmt, fields);
      break;
    default:
      throw new Error("Unsupported encoding format");
  }

  // Combine Header and Fields
  return new Uint8Array(
    Buffer.concat([Buffer.from(headerBytes), Buffer.from(encodedFields)])
  );
};

// Helper: ABI Encoding
const encodeFieldsABI = (fields: FieldsV0): Uint8Array => {
  const types = ["address", "bytes", "string"];
  const values = [fields.receiver, fields.payload, fields.revertAddress];
  const encodedData = new ethers.AbiCoder().encode(types, values);
  return Uint8Array.from(Buffer.from(encodedData.slice(2), "hex"));
};

// Helper: Compact Encoding
const encodeFieldsCompact = (
  compactFmt: EncodingFormat,
  fields: FieldsV0
): Uint8Array => {
  const encodedReceiver = Buffer.from(hexStringToBytes(fields.receiver));
  const encodedPayload = encodeDataCompact(compactFmt, fields.payload);
  const encodedRevertAddress = encodeDataCompact(
    compactFmt,
    new TextEncoder().encode(fields.revertAddress)
  );

  return new Uint8Array(
    Buffer.concat([encodedReceiver, encodedPayload, encodedRevertAddress])
  );
};

// Helper: Compact Data Encoding
const encodeDataCompact = (
  compactFmt: EncodingFormat,
  data: Buffer | Uint8Array
): Buffer => {
  const dataLen = data.length;
  let encodedLength: Buffer;

  switch (compactFmt) {
    case EncodingFormat.CompactShort:
      if (dataLen > 255) {
        throw new Error(
          "Data length exceeds 255 bytes for EncodingFmtCompactShort"
        );
      }
      encodedLength = Buffer.from([dataLen]);
      break;
    case EncodingFormat.CompactLong:
      if (dataLen > 65535) {
        throw new Error(
          "Data length exceeds 65535 bytes for EncodingFmtCompactLong"
        );
      }
      encodedLength = Buffer.alloc(2);
      encodedLength.writeUInt16LE(dataLen);
      break;
    default:
      throw new Error("Unsupported compact format");
  }

  return Buffer.concat([encodedLength, Buffer.from(data)]);
};

const hexStringToBytes = (hexString: string): Uint8Array => {
  if (hexString.length % 2 !== 0) {
    throw new Error("Hex string must have an even length");
  }

  const bytes = new Uint8Array(hexString.length / 2);
  for (let i = 0; i < hexString.length; i += 2) {
    bytes[i / 2] = parseInt(hexString.substr(i, 2), 16);
  }
  return bytes;
};

const bytesToHex = (bytes: Uint8Array): string => {
  return Array.from(bytes)
    .map((byte) => byte.toString(16).padStart(2, "0")) // Convert each byte to a 2-digit hex
    .join("");
};
