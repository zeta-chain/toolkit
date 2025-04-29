import { getErrorMessage, handleError } from "../utils/handleError";

describe("getErrorMessage", () => {
  it("should extract message from Error objects", () => {
    const error = new Error("Test error");
    expect(getErrorMessage(error)).toBe("Test error");
  });

  it("should return 'Unknown error' for non-Error objects", () => {
    expect(getErrorMessage("string error")).toBe("Unknown error");
    expect(getErrorMessage(null)).toBe("Unknown error");
    expect(getErrorMessage(undefined)).toBe("Unknown error");
    expect(getErrorMessage({ custom: "error" })).toBe("Unknown error");
  });
});

describe("handleError", () => {
  let consoleErrorSpy: jest.SpyInstance;

  beforeEach(() => {
    consoleErrorSpy = jest.spyOn(console, "error").mockImplementation();
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
  });

  it("should log error message using object param", () => {
    const error = new Error("Test error");
    const result = handleError({ error });

    expect(result).toBe("Test error");
    expect(consoleErrorSpy).toHaveBeenCalledWith("Test error");
  });

  it("should include context in the error message when provided in object", () => {
    const error = new Error("Test error");
    const result = handleError({ context: "Function failed", error });

    expect(result).toBe("Function failed: Test error");
    expect(consoleErrorSpy).toHaveBeenCalledWith("Function failed: Test error");
  });

  it("should throw error when shouldThrow is true in object", () => {
    const error = new Error("Test error");

    expect(() =>
      handleError({
        context: "Function failed",
        error,
        shouldThrow: true,
      })
    ).toThrow("Function failed: Test error");

    expect(consoleErrorSpy).toHaveBeenCalledWith("Function failed: Test error");
  });

  it("should not throw error when shouldThrow is false in object", () => {
    const error = new Error("Test error");

    expect(() =>
      handleError({
        context: "Function failed",
        error,
        shouldThrow: false,
      })
    ).not.toThrow();

    expect(consoleErrorSpy).toHaveBeenCalledWith("Function failed: Test error");
  });
});
