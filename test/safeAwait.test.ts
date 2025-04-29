import * as handleErrorModule from "../utils/handleError";
import { safeAwait, SafeAwaitOptions } from "../utils/safeAwait";

describe("safeAwait", () => {
  let handleErrorSpy: jest.SpyInstance;

  beforeEach(() => {
    // Mock the handleError function to prevent actual console.error calls
    handleErrorSpy = jest
      .spyOn(handleErrorModule, "handleError")
      .mockImplementation(() => "mocked-result");
  });

  afterEach(() => {
    handleErrorSpy.mockRestore();
  });

  describe("successful promise resolution", () => {
    it("should resolve with the value when promise succeeds", async () => {
      const mockValue = { data: "success" };
      const mockPromise = jest.fn().mockResolvedValue(mockValue);

      const result = await safeAwait(mockPromise);

      expect(result).toBe(mockValue);
      expect(mockPromise).toHaveBeenCalledTimes(1);
      expect(handleErrorSpy).not.toHaveBeenCalled();
    });

    describe("primitive type handling", () => {
      it("should pass through resolved number values correctly", async () => {
        const value = 123;
        const mockPromise = jest.fn().mockResolvedValue(value);
        const result = await safeAwait(mockPromise);

        expect(result).toBe(value);
        expect(mockPromise).toHaveBeenCalledTimes(1);
        expect(handleErrorSpy).not.toHaveBeenCalled();
      });

      it("should pass through resolved string values correctly", async () => {
        const value = "test";
        const mockPromise = jest.fn().mockResolvedValue(value);
        const result = await safeAwait(mockPromise);

        expect(result).toBe(value);
        expect(mockPromise).toHaveBeenCalledTimes(1);
        expect(handleErrorSpy).not.toHaveBeenCalled();
      });

      it("should pass through resolved boolean values correctly", async () => {
        const value = true;
        const mockPromise = jest.fn().mockResolvedValue(value);
        const result = await safeAwait(mockPromise);

        expect(result).toBe(value);
        expect(mockPromise).toHaveBeenCalledTimes(1);
        expect(handleErrorSpy).not.toHaveBeenCalled();
      });

      it("should pass through resolved null values correctly", async () => {
        const value = null;
        const mockPromise = jest.fn().mockResolvedValue(value);
        const result = await safeAwait(mockPromise);

        expect(result).toBe(value);
        expect(mockPromise).toHaveBeenCalledTimes(1);
        expect(handleErrorSpy).not.toHaveBeenCalled();
      });

      it("should pass through resolved undefined values correctly", async () => {
        const value = undefined;
        const mockPromise = jest.fn().mockResolvedValue(value);
        const result = await safeAwait(mockPromise);

        expect(result).toBe(value);
        expect(mockPromise).toHaveBeenCalledTimes(1);
        expect(handleErrorSpy).not.toHaveBeenCalled();
      });
    });
  });

  describe("error handling", () => {
    it("should call handleError and rethrow original error when promise rejects", async () => {
      const mockError = new Error("Test error");
      const mockPromise = jest.fn().mockRejectedValue(mockError);

      await expect(safeAwait(mockPromise)).rejects.toBe(mockError);
      expect(mockPromise).toHaveBeenCalledTimes(1);
      expect(handleErrorSpy).toHaveBeenCalledWith({
        context: "Operation failed",
        error: mockError,
      });
    });

    it("should use provided string context in error handling", async () => {
      const mockError = new Error("Test error");
      const mockPromise = jest.fn().mockRejectedValue(mockError);
      const errorContext = "Custom error context";

      await expect(safeAwait(mockPromise, errorContext)).rejects.toBe(
        mockError
      );
      expect(handleErrorSpy).toHaveBeenCalledWith({
        context: errorContext,
        error: mockError,
      });
    });

    it("should use context from options object if provided", async () => {
      const mockError = new Error("Test error");
      const mockPromise = jest.fn().mockRejectedValue(mockError);
      const options: SafeAwaitOptions = { errorContext: "Error from options" };

      await expect(safeAwait(mockPromise, options)).rejects.toBe(mockError);
      expect(handleErrorSpy).toHaveBeenCalledWith({
        context: options.errorContext,
        error: mockError,
      });
    });

    it("should transform the error if transformError option is true", async () => {
      const mockError = new Error("Original error");
      const mockPromise = jest.fn().mockRejectedValue(mockError);
      const options: SafeAwaitOptions = {
        errorContext: "Transformed context",
        transformError: true,
      };

      const asyncCall = async () => await safeAwait(mockPromise, options);

      await expect(asyncCall()).rejects.toThrow(
        "Transformed context: Original error"
      );

      // Verify it's a new error, not the original
      let thrownError: unknown;
      try {
        await asyncCall();
      } catch (error) {
        thrownError = error;
      }
      expect(thrownError).not.toBe(mockError);
      expect(thrownError).toBeInstanceOf(Error);

      expect(handleErrorSpy).toHaveBeenCalledWith({
        context: options.errorContext,
        error: mockError,
      });
    });

    describe("non-Error rejection handling", () => {
      it("should handle string error rejections", async () => {
        const value = "string error";
        const expected = "string error";
        const mockPromise = jest.fn().mockRejectedValue(value);
        const options: SafeAwaitOptions = {
          errorContext: "Non-error rejection",
          transformError: true,
        };

        const asyncCall = async () => await safeAwait(mockPromise, options);
        await expect(asyncCall()).rejects.toThrow(
          `Non-error rejection: ${expected}`
        );

        expect(handleErrorSpy).toHaveBeenCalledWith({
          context: options.errorContext,
          error: value,
        });
      });

      it("should handle number error rejections", async () => {
        const value = 123;
        const expected = "123";
        const mockPromise = jest.fn().mockRejectedValue(value);
        const options: SafeAwaitOptions = {
          errorContext: "Non-error rejection",
          transformError: true,
        };

        const asyncCall = async () => await safeAwait(mockPromise, options);
        await expect(asyncCall()).rejects.toThrow(
          `Non-error rejection: ${expected}`
        );

        expect(handleErrorSpy).toHaveBeenCalledWith({
          context: options.errorContext,
          error: value,
        });
      });

      it("should handle object error rejections", async () => {
        const value = { custom: "error" };
        const expected = "[object Object]";
        const mockPromise = jest.fn().mockRejectedValue(value);
        const options: SafeAwaitOptions = {
          errorContext: "Non-error rejection",
          transformError: true,
        };

        const asyncCall = async () => await safeAwait(mockPromise, options);
        await expect(asyncCall()).rejects.toThrow(
          `Non-error rejection: ${expected}`
        );

        expect(handleErrorSpy).toHaveBeenCalledWith({
          context: options.errorContext,
          error: value,
        });
      });
    });
  });

  describe("type inference", () => {
    it("should maintain type information from the promise", async () => {
      interface TestData {
        id: number;
        name: string;
      }

      const testData: TestData = { id: 1, name: "Test" };
      const mockPromise = jest.fn().mockResolvedValue(testData);

      // Type should be inferred as TestData
      const result = await safeAwait(mockPromise);

      // Use type assertion to verify the structure
      const typedResult = result as TestData;
      expect(typedResult.id).toBe(1);
      expect(typedResult.name).toBe("Test");
    });
  });
});
