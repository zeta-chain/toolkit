import { ethers } from "ethers";

import {
  Address,
  bitcoinEncode,
  BtcAddress,
  trimOx,
} from "../utils/bitcoinEncode";

describe("bitcoinEncode", () => {
  const receiverAddress: Address = "0xEA9808f0Ac504d1F521B5BbdfC33e6f1953757a7";
  const btcRevertAddress: BtcAddress =
    "tb1qj3jkxdlpmlgaj6n28u7gfpykcv08fcuyllhpyd";

  const mockOperation = {
    test: 1,
  };

  it("should encode arbitrary bytes data", () => {
    const payload = Buffer.from("some_payload_bytes");

    const result = bitcoinEncode(receiverAddress, payload, btcRevertAddress);

    expect(result).toMatch(
      "5a001007000000000000000000000000ea9808f0ac504d1f521b5bbdfc33e6f1953757a7000000000000000000000000000000000000000000000000000000000000006000000000000000000000000000000000000000000000000000000000000000a00000000000000000000000000000000000000000000000000000000000000012736f6d655f7061796c6f61645f62797465730000000000000000000000000000000000000000000000000000000000000000000000000000000000000000002a746231716a336a6b78646c706d6c67616a366e32387537676670796b63763038666375796c6c6870796400000000000000000000000000000000000000000000"
    );
  });

  it("should encode ABI encoded data", () => {
    const params = new ethers.AbiCoder().encode(
      ["address", "bytes", "bool"],
      [
        "0x05BA149A7bd6dC1F937fA9046A9e05C05f3b18b0",
        "0x4955a3F38ff86ae92A914445099caa8eA2B9bA32",
        true,
      ]
    );

    const message = new ethers.AbiCoder().encode(
      ["uint8", "bytes"],
      [mockOperation.test, params]
    );
    const payload = Buffer.from(trimOx(message), "hex");
    const result = bitcoinEncode(receiverAddress, payload, btcRevertAddress);

    expect(result).toMatch(
      "5a001007000000000000000000000000ea9808f0ac504d1f521b5bbdfc33e6f1953757a70000000000000000000000000000000000000000000000000000000000000060000000000000000000000000000000000000000000000000000000000000018000000000000000000000000000000000000000000000000000000000000001000000000000000000000000000000000000000000000000000000000000000001000000000000000000000000000000000000000000000000000000000000004000000000000000000000000000000000000000000000000000000000000000a000000000000000000000000005ba149a7bd6dc1f937fa9046a9e05c05f3b18b00000000000000000000000000000000000000000000000000000000000000060000000000000000000000000000000000000000000000000000000000000000100000000000000000000000000000000000000000000000000000000000000144955a3f38ff86ae92a914445099caa8ea2b9ba32000000000000000000000000000000000000000000000000000000000000000000000000000000000000002a746231716a336a6b78646c706d6c67616a366e32387537676670796b63763038666375796c6c6870796400000000000000000000000000000000000000000000"
    );
  });

  it("should produce different outputs for different payloads", () => {
    const payload1 = Buffer.from("payload1");
    const payload2 = Buffer.from("payload2");

    const result1 = bitcoinEncode(receiverAddress, payload1, btcRevertAddress);
    const result2 = bitcoinEncode(receiverAddress, payload2, btcRevertAddress);

    expect(result1).not.toEqual(result2);
  });

  it("should encode data with custom opCode", () => {
    const payload = Buffer.from("test payload");
    const customOpCode = 0b0010;

    const defaultResult = bitcoinEncode(
      receiverAddress,
      payload,
      btcRevertAddress
    );
    const customResult = bitcoinEncode(
      receiverAddress,
      payload,
      btcRevertAddress,
      customOpCode
    );

    expect(customResult).not.toEqual(defaultResult);
  });
});
