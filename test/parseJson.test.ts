import { describe, expect, it } from "@jest/globals";
import { z } from "zod";

import { parseJson } from "../utils";

describe("parseJson", () => {
  it("should parse a valid JSON array of numbers", () => {
    const jsonString = "[1, 2, 3]";
    const schema = z.array(z.number());
    const result = parseJson(jsonString, schema);
    expect(result).toEqual([1, 2, 3]);
  });

  it("should parse a valid JSON object", () => {
    const jsonString = '{"name": "Alice", "age": 30}';
    const schema = z.object({
      age: z.number(),
      name: z.string(),
    });
    const result = parseJson(jsonString, schema);
    expect(result).toEqual({ age: 30, name: "Alice" });
  });

  it("should throw an error for invalid JSON", () => {
    const jsonString = "not a valid JSON";
    const schema = z.array(z.number());
    expect(() => parseJson(jsonString, schema)).toThrow("Failed to parse JSON");
  });

  it("should throw an error for JSON with incorrect structure", () => {
    const jsonString = '{"name": "Alice"}';
    const schema = z.object({
      age: z.number(), // Missing in JSON
      name: z.string(),
    });
    expect(() => parseJson(jsonString, schema)).toThrow("Invalid JSON data");
  });
});
