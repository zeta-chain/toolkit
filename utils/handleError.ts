/**
 * Utility for standardized error handling throughout the codebase
 */

/**
 * Extract an error message from an unknown error
 * @param error - The caught error of unknown type
 * @returns A string representation of the error
 */
export const getErrorMessage = (error: unknown): string => {
  return error instanceof Error ? error.message : "Unknown error";
};

/**
 * Options for error handling
 */
interface ErrorHandlingOptions {
  /** Optional context to add to the error message */
  context?: string;
  /** The error to handle */
  error: unknown;
  /** Whether to throw the error after logging */
  shouldThrow?: boolean;
}

/**
 * Handle an error with consistent logging
 * @param options - Error handling options
 * @returns The formatted error message that was logged
 */
export const handleError = (options: ErrorHandlingOptions): string => {
  const { error, context, shouldThrow } = options;
  const errorMessage = getErrorMessage(error);
  const formattedMessage = context
    ? `${context}: ${errorMessage}`
    : errorMessage;

  console.error(formattedMessage);

  if (shouldThrow) {
    throw new Error(formattedMessage);
  }

  return formattedMessage;
};
