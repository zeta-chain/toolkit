import { ethers } from "ethers";

export type Address = string;
export type BtcAddress = string;
export type RevertOptions = {
  abortAddress?: Address;
  callOnRevert?: boolean;
  revertAddress?: BtcAddress;
  revertMessage?: Buffer | Uint8Array;
};

const MemoIdentifier = 0x5a;

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

type Header = {
  encodingFmt: EncodingFormat;
  opCode: OpCode;
};

type FieldsV0 = {
  payload: Buffer;
  receiver: Address;
  revertOptions: RevertOptions;
};

/**
 * Encodes data for a Bitcoin transaction
 * @param receiver - The address of the receiver
 * @param payload - The payload to be sent
 * @param revertOptions - Revert options
 * @param opCode - The operation code (defaults to DepositAndCall)
 * @param encodingFormat - The encoding format (defaults to ABI)
 * @returns The encoded data as a hex string
 */
export const bitcoinEncode = (
  receiver: Address,
  payload: Buffer,
  revertOptions: RevertOptions,
  opCode: OpCode = OpCode.DepositAndCall,
  encodingFormat: EncodingFormat = EncodingFormat.ABI
): string => {
  // Validation: Deposit must not carry non-empty payload
  if (opCode === OpCode.Deposit && payload && payload.length > 0) {
    throw new Error("payload is not allowed for deposit operation");
  }

  const header = { encodingFmt: encodingFormat, opCode };

  const fields = { payload, receiver, revertOptions };

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

  // Data flags (bit layout v0):
  // bit0: receiver, bit1: payload, bit2: revertAddress, bit3: abortAddress, bit4: revertMessage present (only when callOnRevert=true)
  let flags = 0;
  if (isNonZeroAddress(fields.receiver)) {
    flags |= 1 << 0;
  }
  if (fields.payload && fields.payload.length > 0) {
    flags |= 1 << 1;
  }
  if (fields.revertOptions?.revertAddress) {
    flags |= 1 << 2;
  }
  if (fields.revertOptions?.abortAddress) {
    flags |= 1 << 3;
  }
  if (fields.revertOptions?.callOnRevert) {
    // bit4 marks presence of revert message argument; empty allowed
    flags |= 1 << 4;
  }
  headerBytes[3] = flags & 0xff;

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

  return new Uint8Array(
    Buffer.concat([Buffer.from(headerBytes), Buffer.from(encodedFields)])
  );
};

const encodeFieldsABI = (fields: FieldsV0): Uint8Array => {
  const types: string[] = [];
  const values = [];

  if (isNonZeroAddress(fields.receiver)) {
    types.push("address");
    values.push(fields.receiver);
  }
  if (fields.payload && fields.payload.length > 0) {
    types.push("bytes");
    values.push(fields.payload);
  }
  if (fields.revertOptions?.revertAddress) {
    types.push("string");
    values.push(fields.revertOptions.revertAddress);
  }
  if (fields.revertOptions?.abortAddress) {
    types.push("address");
    values.push(fields.revertOptions.abortAddress);
  }
  if (fields.revertOptions?.callOnRevert) {
    types.push("bytes");
    const msg = fields.revertOptions.revertMessage || Buffer.from([]);
    values.push(msg);
  }

  const encodedData = new ethers.AbiCoder().encode(types, values);
  return Uint8Array.from(Buffer.from(encodedData.slice(2), "hex"));
};

const encodeFieldsCompact = (
  compactFmt: EncodingFormat,
  fields: FieldsV0
): Uint8Array => {
  const parts: Buffer[] = [];

  if (isNonZeroAddress(fields.receiver)) {
    const encodedReceiver = Buffer.from(addressToBytes(fields.receiver));
    parts.push(Buffer.from(encodedReceiver));
  }

  if (fields.payload && fields.payload.length > 0) {
    const encodedPayload = encodeDataCompact(compactFmt, fields.payload);
    parts.push(Buffer.from(encodedPayload));
  }

  if (fields.revertOptions?.revertAddress) {
    const encodedRevertAddress = encodeDataCompact(
      compactFmt,
      new TextEncoder().encode(fields.revertOptions.revertAddress)
    );
    parts.push(Buffer.from(encodedRevertAddress));
  }

  if (fields.revertOptions?.abortAddress) {
    const encodedAbort = Buffer.from(
      addressToBytes(fields.revertOptions.abortAddress)
    );
    parts.push(encodedAbort);
  }

  if (fields.revertOptions?.callOnRevert) {
    const msg = fields.revertOptions.revertMessage || Buffer.from([]);
    const encodedMsg = encodeDataCompact(compactFmt, msg);
    parts.push(Buffer.from(encodedMsg));
  }

  return new Uint8Array(Buffer.concat(parts));
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
  const clean = hexString.startsWith("0x") ? hexString.slice(2) : hexString;
  if (clean.length % 2 !== 0) {
    throw new Error("Hex string must have an even length");
  }
  const bytes = new Uint8Array(clean.length / 2);
  for (let i = 0; i < clean.length; i += 2) {
    bytes[i / 2] = parseInt(clean.substr(i, 2), 16);
  }
  return bytes;
};

const addressToBytes = (addr: string): Uint8Array => {
  const s = addr.startsWith("0x") ? addr.slice(2) : addr;
  if (s.length !== 40) {
    throw new Error("address must be 20 bytes");
  }
  return hexStringToBytes(s);
};

const isNonZeroAddress = (addr?: string): boolean => {
  if (!addr) return false;
  const s = addr.startsWith("0x") ? addr.slice(2) : addr;
  if (s.length !== 40) return false;
  return !/^0{40}$/i.test(s);
};

const bytesToHex = (bytes: Uint8Array): string => {
  return Array.from(bytes)
    .map((byte) => byte.toString(16).padStart(2, "0")) // Convert each byte to a 2-digit hex
    .join("");
};
