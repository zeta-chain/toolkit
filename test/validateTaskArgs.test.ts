import { expect } from "chai";
import { z } from "zod";

import { validateTaskArgs } from "../utils/validateTaskArgs";

describe("validateTaskArgs", () => {
  it("should return parsed data when validation succeeds", () => {
    const schema = z.object({
      age: z.number(),
      isActive: z.boolean().optional(),
      name: z.string(),
    });
    const args = {
      age: 25,
      isActive: true,
      name: "Test User",
    };

    const result = validateTaskArgs(args, schema);

    expect(result).to.deep.equal(args);
  });

  it("should throw an error when validation fails", () => {
    const schema = z.object({
      age: z.number(),
      name: z.string(),
    });
    const args = {
      age: "25",
      name: "Test User", // Type error: string instead of number
    };

    expect(() =>
      validateTaskArgs(args, schema, {
        exitOnError: false,
        shouldLogError: false,
      })
    ).to.throw("age: Expected number, received string");
  });

  it("should handle optional fields correctly", () => {
    const schema = z.object({
      age: z.number().optional(),
      name: z.string(),
    });
    const args = {
      name: "Test User",
    };

    const result = validateTaskArgs(args, schema);

    expect(result).to.deep.equal(args);
  });

  it("should handle array fields correctly", () => {
    const schema = z.object({
      name: z.string(),
      tags: z.array(z.string()),
    });
    const args = {
      name: "Test User",
      tags: ["developer", "tester"],
    };

    const result = validateTaskArgs(args, schema);

    expect(result).to.deep.equal(args);
  });
});
