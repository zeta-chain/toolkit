import {
  Header,
  FieldsV0,
  EncodingFormat,
  OpCode,
  encodeToBytes,
} from "../packages/client/src/encodeToBytes";
import Web3 from "web3";

const web3 = new Web3();

describe("Memo Encoding Tests", () => {
  const receiver = "0xEA9808f0Ac504d1F521B5BbdfC33e6f1953757a7";
  const payload = new TextEncoder().encode("a payload");
  const revertAddress = "tb1q6rufg6myrxurdn0h57d2qhtm9zfmjw2mzcm05q";

  it("should correctly encode memo using ABI encoding", () => {
    const header = new Header(
      EncodingFormat.EncodingFmtABI,
      OpCode.DepositAndCall
    );
    const fields = new FieldsV0(receiver, payload, revertAddress);
    const encodedMemo = encodeToBytes(header, fields);
    const encodedMemoHex = web3.utils.bytesToHex(encodedMemo).slice(2);

    const expectedHex =
      "5a001007" + // header
      "000000000000000000000000ea9808f0ac504d1f521b5bbdfc33e6f1953757a7" + // receiver
      "0000000000000000000000000000000000000000000000000000000000000060" + // payload offset
      "00000000000000000000000000000000000000000000000000000000000000a0" + // revertAddress offset
      "0000000000000000000000000000000000000000000000000000000000000009" + // payload length
      "61207061796c6f61640000000000000000000000000000000000000000000000" + // payload
      "000000000000000000000000000000000000000000000000000000000000002a" + // revertAddress length
      "746231713672756667366d7972787572646e3068353764327168746d397a666d6a77326d7a636d30357100000000000000000000000000000000000000000000"; // revertAddress

    expect(encodedMemoHex).toBe(expectedHex);
  });

  it("should correctly encode memo using Compact Short encoding", () => {
    const header = new Header(
      EncodingFormat.EncodingFmtCompactShort,
      OpCode.DepositAndCall
    );
    const fields = new FieldsV0(receiver, payload, revertAddress);
    const encodedMemo = encodeToBytes(header, fields);
    const encodedMemoHex = web3.utils.bytesToHex(encodedMemo).slice(2);

    const expectedHex =
      "5a011007" + // header
      "ea9808f0ac504d1f521b5bbdfc33e6f1953757a7" + // receiver
      "0961207061796c6f6164" + // payload
      "2a746231713672756667366d7972787572646e3068353764327168746d397a666d6a77326d7a636d303571"; // revertAddress

    expect(encodedMemoHex).toBe(expectedHex);
  });

  it("should correctly encode memo using Compact Long encoding", () => {
    const header = new Header(
      EncodingFormat.EncodingFmtCompactLong,
      OpCode.DepositAndCall
    );
    const fields = new FieldsV0(receiver, payload, revertAddress);
    const encodedMemo = encodeToBytes(header, fields);
    const encodedMemoHex = web3.utils.bytesToHex(encodedMemo).slice(2);

    const expectedHex =
      "5a021007" + // header
      "ea9808f0ac504d1f521b5bbdfc33e6f1953757a7" + // receiver
      "090061207061796c6f6164" + // payload
      "2a00746231713672756667366d7972787572646e3068353764327168746d397a666d6a77326d7a636d303571"; // revertAddress

    expect(encodedMemoHex).toBe(expectedHex);
  });
});
