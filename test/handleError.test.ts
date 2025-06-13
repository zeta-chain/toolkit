import {
  getErrorMessage,
  handleError,
  hasErrorStatus,
} from "../utils/handleError";

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

describe("hasErrorStatus", () => {
  it("should return true when error has matching response status", () => {
    const error = {
      response: {
        status: 429,
      },
    };

    expect(hasErrorStatus(error, 429)).toBe(true);
  });

  it("should return false when error has different response status", () => {
    const error = {
      response: {
        status: 500,
      },
    };

    expect(hasErrorStatus(error, 429)).toBe(false);
  });

  it("should return false when error has no response property", () => {
    const error = {
      message: "Some error",
    };

    expect(hasErrorStatus(error, 429)).toBe(false);
  });

  it("should return false when error response has no status property", () => {
    const error = {
      response: {
        data: "Some data",
      },
    };

    expect(hasErrorStatus(error, 429)).toBe(false);
  });

  it("should handle null and undefined errors gracefully", () => {
    expect(hasErrorStatus(null, 429)).toBe(false);
    expect(hasErrorStatus(undefined, 429)).toBe(false);
  });

  it("should handle primitive types gracefully", () => {
    expect(hasErrorStatus("string error", 429)).toBe(false);
    expect(hasErrorStatus(42, 429)).toBe(false);
    expect(hasErrorStatus(true, 429)).toBe(false);
  });

  it("should work with axios-like error structure", () => {
    const axiosError = {
      message: "Request failed with status code 404",
      response: {
        data: { error: "Not found" },
        status: 404,
      },
    };

    expect(hasErrorStatus(axiosError, 404)).toBe(true);
    expect(hasErrorStatus(axiosError, 500)).toBe(false);
  });
});
