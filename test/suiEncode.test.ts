import { ZodIssue, ZodSchema, ZodTypeDef } from "zod";

import { suiEncode } from "../packages/client/src/suiEncode";
import * as validateUtils from "../utils/validateAndParseSchema";

// Mock validateAndParseSchema to prevent console logs during tests
jest.mock("../utils/validateAndParseSchema", () => {
  const formatValidationErrors = (errors: ZodIssue[]) => {
    return errors
      .map((err) => {
        const path = err.path.join(".");
        return path ? `${path}: ${err.message}` : err.message;
      })
      .join("\n");
  };

  return {
    validateAndParseSchema: jest
      .fn()
      .mockImplementation(
        <T, U = T>(args: unknown, schema: ZodSchema<T, ZodTypeDef, U>) => {
          const result = schema.safeParse(args);
          if (!result.success) {
            throw new Error(formatValidationErrors(result.error.errors));
          }
          return result.data;
        }
      ),
  };
});

describe("suiEncode", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should encode type arguments, objects and message correctly", () => {
    const input = {
      data: "0xa914ba15f2d1268994cbe658b2a34495926bd90c352ff17124c1ff6396b75fb7",
      objects: [
        "0xd602b62bf03791e660d3fcb828ad30a1d6505de7ee91849e42ee83d0da363a1f",
        "0xfc5293950ae8401435f84e7a4984a5b0a8ef591198330735cc4254d2e34e39a5",
        "0x688bdb0edba8ae291968ba10adb33c26fc4370360eb575698a3472e8962067ec",
        "0x71218d15d4899b7356f4eb9425e7b66a726151eab8d4dd687aa3bad3706a2d1d",
      ],
      typeArguments: [
        "0xc65bccdb25735cc25681c1f6f2d1f1a5882969da2ec0de2782b861f0cc32815a::token::TOKEN",
      ],
    };

    const expected =
      "0x00000000000000000000000000000000000000000000000000000000000000200000000000000000000000000000000000000000000000000000000000000060000000000000000000000000000000000000000000000000000000000000012000000000000000000000000000000000000000000000000000000000000001c00000000000000000000000000000000000000000000000000000000000000001000000000000000000000000000000000000000000000000000000000000002000000000000000000000000000000000000000000000000000000000000000503078633635626363646232353733356363323536383163316636663264316631613538383239363964613265633064653237383262383631663063633332383135613a3a746f6b656e3a3a544f4b454e000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000004d602b62bf03791e660d3fcb828ad30a1d6505de7ee91849e42ee83d0da363a1ffc5293950ae8401435f84e7a4984a5b0a8ef591198330735cc4254d2e34e39a5688bdb0edba8ae291968ba10adb33c26fc4370360eb575698a3472e8962067ec71218d15d4899b7356f4eb9425e7b66a726151eab8d4dd687aa3bad3706a2d1d0000000000000000000000000000000000000000000000000000000000000020a914ba15f2d1268994cbe658b2a34495926bd90c352ff17124c1ff6396b75fb7";

    const result = suiEncode(input);
    expect(result).toBe(expected);
    expect(validateUtils.validateAndParseSchema).toHaveBeenCalledTimes(1);
  });

  it("should throw an error when data is missing", () => {
    expect(() => suiEncode({} as { data: string })).toThrow(
      "data: Data is required"
    );
    expect(validateUtils.validateAndParseSchema).toHaveBeenCalledTimes(1);
  });

  it("should throw an error when data is not a string", () => {
    expect(() => suiEncode({ data: 123 as unknown as string })).toThrow(
      "data: Expected string, received number"
    );
    expect(validateUtils.validateAndParseSchema).toHaveBeenCalledTimes(1);
  });

  it("should throw an error when objects is not an array", () => {
    expect(() =>
      suiEncode({
        data: "test",
        objects: "not-an-array" as unknown as string[],
      })
    ).toThrow("objects: Expected array, received string");
    expect(validateUtils.validateAndParseSchema).toHaveBeenCalledTimes(1);
  });

  it("should throw an error when typeArguments is not an array", () => {
    expect(() =>
      suiEncode({
        data: "test",
        typeArguments: "not-an-array" as unknown as string[],
      })
    ).toThrow("typeArguments: Expected array, received string");
    expect(validateUtils.validateAndParseSchema).toHaveBeenCalledTimes(1);
  });

  it("should handle empty objects and typeArguments arrays", () => {
    const input = {
      data: "0xa914ba15f2d1268994cbe658b2a34495926bd90c352ff17124c1ff6396b75fb7",
      objects: [],
      typeArguments: [],
    };

    const result = suiEncode(input);
    // The encoding should still work with empty arrays
    expect(typeof result).toBe("string");
    expect(result.startsWith("0x")).toBe(true);
    expect(
      result.endsWith(
        "a914ba15f2d1268994cbe658b2a34495926bd90c352ff17124c1ff6396b75fb7"
      )
    ).toBe(true);
    expect(validateUtils.validateAndParseSchema).toHaveBeenCalledTimes(1);
  });

  it("should handle non-hex data as UTF-8", () => {
    const input = {
      data: "Hello World",
      objects: [],
      typeArguments: [],
    };

    const result = suiEncode(input);
    // The result should contain the UTF-8 encoded data
    expect(typeof result).toBe("string");
    expect(result.startsWith("0x")).toBe(true);
    expect(validateUtils.validateAndParseSchema).toHaveBeenCalledTimes(1);
  });

  it("should handle minimum input with only required data field", () => {
    const input = {
      data: "0x1234",
    };

    const result = suiEncode(input);
    expect(typeof result).toBe("string");
    expect(result.startsWith("0x")).toBe(true);
    expect(validateUtils.validateAndParseSchema).toHaveBeenCalledTimes(1);
  });

  it("should handle large input with many objects", () => {
    const objects = Array(20).fill(
      "0xd602b62bf03791e660d3fcb828ad30a1d6505de7ee91849e42ee83d0da363a1f"
    );

    const input = {
      data: "0xa914ba15f2d1268994cbe658b2a34495926bd90c352ff17124c1ff6396b75fb7",
      objects,
      typeArguments: [],
    };

    const result = suiEncode(input);
    expect(typeof result).toBe("string");
    expect(result.startsWith("0x")).toBe(true);
    expect(validateUtils.validateAndParseSchema).toHaveBeenCalledTimes(1);
  });

  it("should handle objects with whitespace that needs trimming", () => {
    const input = {
      data: "0x1234",
      objects: [" 0xabcd  ", "  0xef12 "],
      typeArguments: [],
    };

    const result = suiEncode(input);
    expect(typeof result).toBe("string");
    expect(result.startsWith("0x")).toBe(true);
    expect(validateUtils.validateAndParseSchema).toHaveBeenCalledTimes(1);
  });

  it("should handle many type arguments", () => {
    const typeArgs = Array(10).fill(
      "0xc65bccdb25735cc25681c1f6f2d1f1a5882969da2ec0de2782b861f0cc32815a::token::TOKEN"
    );

    const input = {
      data: "0x1234",
      objects: [],
      typeArguments: typeArgs,
    };

    const result = suiEncode(input);
    expect(typeof result).toBe("string");
    expect(result.startsWith("0x")).toBe(true);
    expect(validateUtils.validateAndParseSchema).toHaveBeenCalledTimes(1);
  });
});
