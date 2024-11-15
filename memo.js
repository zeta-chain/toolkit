const { Web3, eth } = require('web3');
const web3 = new Web3();
const { ethers } = require("ethers");
const { isAddress } = require('web3-validator');

// Memo identifier byte
const MemoIdentifier = 0x5A;

// Enums
const OpCode = Object.freeze({
    Deposit: 0b0000,
    DepositAndCall: 0b0001,
    Call: 0b0010,
    Invalid: 0b0011,
});

const EncodingFormat = Object.freeze({
    EncodingFmtABI: 0b0000,
    EncodingFmtCompactShort: 0b0001,
    EncodingFmtCompactLong: 0b0010,
});

// Header Class
class Header {
    constructor(encodingFmt, opCode) {
        this.encodingFmt = encodingFmt;
        this.opCode = opCode;
    }
}

// FieldsV0 Class
class FieldsV0 {
    constructor(receiver, payload, revertAddress) {
        if (!isAddress(receiver)) {
            throw new Error("Invalid receiver address");
        }
        this.receiver = receiver;
        this.payload = payload;
        this.revertAddress = revertAddress;
    }
}

// Main Encoding Function
function EncodeToBytes(header, fields) {
    if (!header || !fields) {
        throw new Error("Header and fields are required");
    }

    // Construct Header Bytes
    const headerBytes = new Uint8Array(4);
    headerBytes[0] = MemoIdentifier;
    headerBytes[1] = (0x00 << 4) | (header.encodingFmt & 0x0F);
    headerBytes[2] = ((header.opCode & 0x0F) << 4) | 0x00;
    headerBytes[3] = 0b00000111;

    // Encode Fields
    let encodedFields;
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
    return new Uint8Array(Buffer.concat([Buffer.from(headerBytes), Buffer.from(encodedFields)]));
}

// Helper: ABI Encoding
function encodeFieldsABI(fields) {
    const types = ["address", "bytes", "string"];
    const values = [fields.receiver, fields.payload, fields.revertAddress];
    const encodedData = ethers.utils.defaultAbiCoder.encode(types, values);
    return Uint8Array.from(Buffer.from(encodedData.slice(2), "hex"));
}

// Helper: Compact Encoding
function encodeFieldsCompact(compactFmt, fields) {
    const encodedReceiver = Buffer.from(web3.utils.hexToBytes(fields.receiver));
    const encodedPayload = encodeDataCompact(compactFmt, fields.payload);
    const encodedRevertAddress = encodeDataCompact(compactFmt, new TextEncoder().encode(fields.revertAddress));

    return new Uint8Array(Buffer.concat([encodedReceiver, encodedPayload, encodedRevertAddress]));
}

// Helper: Compact Data Encoding
function encodeDataCompact(compactFmt, data) {
    const dataLen = data.length;
    let encodedLength;

    switch (compactFmt) {
        case EncodingFormat.EncodingFmtCompactShort:
            if (dataLen > 255) {
                throw new Error("Data length exceeds 255 bytes for EncodingFmtCompactShort");
            }
            encodedLength = Buffer.from([dataLen]);
            break;
        case EncodingFormat.EncodingFmtCompactLong:
            if (dataLen > 65535) {
                throw new Error("Data length exceeds 65535 bytes for EncodingFmtCompactLong");
            }
            encodedLength = Buffer.alloc(2);
            encodedLength.writeUInt16LE(dataLen);
            break;
        default:
            throw new Error("Unsupported compact format");
    }

    return Buffer.concat([encodedLength, data]);
}

module.exports = { Header, FieldsV0, EncodingFormat, OpCode, EncodeToBytes };
