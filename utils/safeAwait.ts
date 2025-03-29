import { handleError } from "./handleError";

/**
 * Options for error handling in safeAwait
 */
export interface SafeAwaitOptions {
  /**
   * Context description for the error
   */
  errorContext?: string;
  /**
   * Whether to log the error (defaults to true)
   */
  logError?: boolean;

  /**
   * Whether to transform the error with additional context
   */
  transformError?: boolean;
}

/**
 * Safely awaits a promise with consistent error handling
 *
 * @param promiseFactory A function that returns the promise to resolve
 * @param contextOrOptions Error context string or options object
 * @returns The resolved value of the promise with its original type
 * @throws The original error or transformed error with context
 *
 * @example
 * // Basic usage
 * const result = await safeAwait(() => fetchData());
 *
 * // With custom error context
 * const result = await safeAwait(() => fetchData(), "Failed to fetch user data");
 *
 * // With advanced options
 * const result = await safeAwait(() => fetchData(), {
 *   context: "User data fetch failed",
 *   transformError: true
 * });
 */
export const safeAwait = async <T>(
  promiseFactory: () => Promise<T>,
  contextOrOptions?: string | SafeAwaitOptions
): Promise<T> => {
  try {
    return await promiseFactory();
  } catch (error) {
    // Determine error handling options
    let context = "Operation failed";
    let transformError = false;
    let shouldLog = true;

    if (typeof contextOrOptions === "string") {
      context = contextOrOptions;
    } else if (contextOrOptions) {
      context = contextOrOptions.errorContext || context;
      transformError = contextOrOptions.transformError || false;
      shouldLog = contextOrOptions.logError || true;
    }

    // Log the error through central error handler
    if (shouldLog) {
      // Log the error through central error handler
      handleError({
        context,
        error,
      });
    }

    // Either transform the error or rethrow the original
    if (transformError) {
      throw new Error(
        `${context}: ${error instanceof Error ? error.message : String(error)}`
      );
    } else {
      throw error;
    }
  }
};
