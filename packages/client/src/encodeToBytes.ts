import { ethers } from "ethers";
import { Web3 } from "web3";
import { isAddress } from "web3-validator";

// Memo identifier byte
const MemoIdentifier = 0x5a;

// Enums
enum OpCode {
  Deposit = 0b0000,
  DepositAndCall = 0b0001,
  Call = 0b0010,
  Invalid = 0b0011,
}

enum EncodingFormat {
  EncodingFmtABI = 0b0000,
  EncodingFmtCompactShort = 0b0001,
  EncodingFmtCompactLong = 0b0010,
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
  receiver: string;
  payload: Uint8Array;
  revertAddress: string;

  constructor(receiver: string, payload: Uint8Array, revertAddress: string) {
    if (!isAddress(receiver)) {
      throw new Error("Invalid receiver address");
    }
    this.receiver = receiver;
    this.payload = payload;
    this.revertAddress = revertAddress;
  }
}

// Main Encoding Function
const encodeToBytes = (header: Header, fields: FieldsV0): Uint8Array => {
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
    case EncodingFormat.EncodingFmtABI:
      encodedFields = encodeFieldsABI(fields);
      break;
    case EncodingFormat.EncodingFmtCompactShort:
    case EncodingFormat.EncodingFmtCompactLong:
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
  const encodedData = ethers.utils.defaultAbiCoder.encode(types, values);
  return Uint8Array.from(Buffer.from(encodedData.slice(2), "hex"));
};

// Helper: Compact Encoding
const encodeFieldsCompact = (
  compactFmt: EncodingFormat,
  fields: FieldsV0
): Uint8Array => {
  const encodedReceiver = Buffer.from(Web3.utils.hexToBytes(fields.receiver));
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
  data: Uint8Array
): Uint8Array => {
  const dataLen = data.length;
  let encodedLength: Buffer;

  switch (compactFmt) {
    case EncodingFormat.EncodingFmtCompactShort:
      if (dataLen > 255) {
        throw new Error(
          "Data length exceeds 255 bytes for EncodingFmtCompactShort"
        );
      }
      encodedLength = Buffer.from([dataLen]);
      break;
    case EncodingFormat.EncodingFmtCompactLong:
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

  return Buffer.concat([encodedLength, data]);
};

export { encodeToBytes, EncodingFormat, FieldsV0, Header, OpCode };
