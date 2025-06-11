import { describe, expect, it } from "@jest/globals";

import { exactlyOneOf } from "../utils";

describe("exactlyOneOf", () => {
  // Test with simple boolean properties
  it("should return true when exactly one property is truthy (first truthy)", () => {
    const data = { a: true, b: false };
    const predicate = exactlyOneOf<typeof data>("a", "b");

    expect(predicate(data)).toBe(true);
  });

  it("should return true when exactly one property is truthy (second truthy)", () => {
    const data = { a: false, b: true };
    const predicate = exactlyOneOf<typeof data>("a", "b");

    expect(predicate(data)).toBe(true);
  });

  it("should return false when both properties are truthy", () => {
    const data = { a: true, b: true };
    const predicate = exactlyOneOf<typeof data>("a", "b");

    expect(predicate(data)).toBe(false);
  });

  it("should return false when both properties are falsy", () => {
    const data = { a: false, b: false };
    const predicate = exactlyOneOf<typeof data>("a", "b");

    expect(predicate(data)).toBe(false);
  });

  // Test with string properties (truthy/falsy behavior)
  it("should work with string properties - non-empty vs empty", () => {
    const data = { password: "", username: "john" };
    const predicate = exactlyOneOf<typeof data>("username", "password");

    expect(predicate(data)).toBe(true);
  });

  it("should work with string properties - both non-empty", () => {
    const data = { password: "secret", username: "john" };
    const predicate = exactlyOneOf<typeof data>("username", "password");

    expect(predicate(data)).toBe(false);
  });

  it("should work with string properties - both empty", () => {
    const data = { password: "", username: "" };
    const predicate = exactlyOneOf<typeof data>("username", "password");

    expect(predicate(data)).toBe(false);
  });

  // Test with number properties (truthy/falsy behavior)
  it("should work with number properties - zero vs non-zero", () => {
    const data = { count: 5, total: 0 };
    const predicate = exactlyOneOf<typeof data>("count", "total");

    expect(predicate(data)).toBe(true);
  });

  it("should work with number properties - both non-zero", () => {
    const data = { count: 5, total: 10 };
    const predicate = exactlyOneOf<typeof data>("count", "total");

    expect(predicate(data)).toBe(false);
  });

  // Test with null/undefined properties
  it("should work with null vs defined", () => {
    const data = { apiKey: "secret", token: null };
    const predicate = exactlyOneOf<typeof data>("apiKey", "token");

    expect(predicate(data)).toBe(true);
  });

  it("should work with undefined vs defined", () => {
    const data = { apiKey: undefined, token: "abc123" };
    const predicate = exactlyOneOf<typeof data>("apiKey", "token");

    expect(predicate(data)).toBe(true);
  });

  it("should work with both null/undefined", () => {
    const data = { apiKey: null, token: undefined };
    const predicate = exactlyOneOf<typeof data>("apiKey", "token");

    expect(predicate(data)).toBe(false);
  });

  // Test with array properties
  it("should work with arrays - both are truthy even when empty", () => {
    const data = { items: [1, 2, 3], tags: [] };
    const predicate = exactlyOneOf<typeof data>("items", "tags");

    expect(predicate(data)).toBe(false); // Both arrays are truthy objects (even empty arrays)
  });

  it("should work with arrays - array vs null", () => {
    const data = { items: [1, 2, 3], tags: null };
    const predicate = exactlyOneOf<typeof data>("items", "tags");

    expect(predicate(data)).toBe(true); // Array is truthy, null is falsy
  });

  // Test with object properties
  it("should work with objects - empty vs non-empty", () => {
    const data = { config: { debug: true }, metadata: {} };
    const predicate = exactlyOneOf<typeof data>("config", "metadata");

    expect(predicate(data)).toBe(false); // Both objects are truthy, even empty objects
  });

  // Test reusability of the predicate function
  it("should create reusable predicate functions", () => {
    const predicate = exactlyOneOf<{ mnemonic?: string; privateKey?: string }>(
      "privateKey",
      "mnemonic"
    );

    expect(predicate({ mnemonic: undefined, privateKey: "abc123" })).toBe(true);
    expect(predicate({ mnemonic: "word1 word2", privateKey: undefined })).toBe(
      true
    );
    expect(predicate({ mnemonic: "word1 word2", privateKey: "abc123" })).toBe(
      false
    );
    expect(predicate({ mnemonic: undefined, privateKey: undefined })).toBe(
      false
    );
  });

  // Test type safety with different object shapes
  it("should work with complex object types", () => {
    interface UserAuth {
      email?: string;
      phoneNumber?: string;
      socialLogin?: { id: string; provider: string };
    }

    const predicate = exactlyOneOf<UserAuth>("email", "socialLogin");

    const user1: UserAuth = { email: "test@example.com" };
    const user2: UserAuth = { socialLogin: { id: "123", provider: "google" } };
    const user3: UserAuth = {
      email: "test@example.com",
      socialLogin: { id: "123", provider: "google" },
    };

    expect(predicate(user1)).toBe(true);
    expect(predicate(user2)).toBe(true);
    expect(predicate(user3)).toBe(false);
  });
});
