import { buildRevealWitness, compactSize } from "../utils/bitcoin.inscription.helpers";

describe("compactSize", () => {
  it("should encode small numbers as single byte", () => {
    const result = compactSize(10);
    expect(result).toEqual(Buffer.from([10]));
  });

  it("should encode larger numbers with marker byte", () => {
    const result = compactSize(300);
    const expected = Buffer.alloc(3);
    expected.writeUInt8(0xfd, 0);
    expected.writeUInt16LE(300, 1);
    expect(result).toEqual(expected);
  });
});

describe("buildRevealWitness", () => {
  it("should properly build a witness stack", () => {
    const leafScript = Buffer.from("leafScript");
    const controlBlock = Buffer.from("controlBlock");

    const result = buildRevealWitness(leafScript, controlBlock);

    // Should have correct format with stack items
    expect(result.length).toBeGreaterThan(0);

    // First byte should be the stack size (3 items)
    expect(result[0]).toBe(3);
  });
});
