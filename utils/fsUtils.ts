import fs from "fs";

import { handleError } from "./handleError";

/**
 * Safely reads a file with proper error handling
 * @param path Path to the file to read
 * @param encoding File encoding (default: 'utf-8')
 * @returns Contents of the file
 */
export const safeReadFile = (
  path: string,
  encoding: BufferEncoding = "utf-8"
): string => {
  try {
    return fs.readFileSync(path, { encoding });
  } catch (error) {
    handleError({
      context: `Failed to read file at ${path}`,
      error,
      shouldThrow: true,
    });
    // This won't be reached due to shouldThrow, but needed for type checking
    return "";
  }
};

/**
 * Safely writes data to a file with proper error handling
 * @param path Path to the file to write
 * @param data Data to write to the file
 * @param options Write file options
 */
export const safeWriteFile = (
  path: string,
  data: string | Buffer | object,
  options?: fs.WriteFileOptions
): void => {
  try {
    // Handle objects by converting to JSON
    const content =
      typeof data === "object" && !(data instanceof Buffer)
        ? JSON.stringify(data, null, 2)
        : data;

    fs.writeFileSync(path, content, options);
  } catch (error) {
    handleError({
      context: `Failed to write to file at ${path}`,
      error,
      shouldThrow: true,
    });
  }
};

/**
 * Safely creates a directory with proper error handling
 * @param path Path to the directory to create
 * @param options Directory creation options
 */
export const safeMkdir = (
  path: string,
  options = { recursive: true }
): void => {
  try {
    fs.mkdirSync(path, options);
  } catch (error) {
    // Don't throw if directory already exists
    if (error instanceof Error && "code" in error && error.code === "EEXIST") {
      return;
    }

    handleError({
      context: `Failed to create directory at ${path}`,
      error,
      shouldThrow: true,
    });
  }
};

/**
 * Safely checks if a file or directory exists
 * @param path Path to check
 * @returns True if the path exists, false otherwise
 */
export const safeExists = (path: string): boolean => {
  try {
    return fs.existsSync(path);
  } catch (error) {
    handleError({
      context: `Failed to check if path exists at ${path}`,
      error,
      shouldThrow: false,
    });
    return false;
  }
};

/**
 * Safely deletes a file with proper error handling
 * @param path Path to the file to delete
 */
export const safeUnlink = (path: string): void => {
  try {
    fs.unlinkSync(path);
  } catch (error) {
    handleError({
      context: `Failed to delete file at ${path}`,
      error,
      shouldThrow: true,
    });
  }
};

/**
 * Safely reads a directory with proper error handling
 * @param path Path to the directory to read
 * @returns Array of directory contents
 */
export const safeReadDir = (path: string): string[] => {
  try {
    return fs.readdirSync(path);
  } catch (error) {
    handleError({
      context: `Failed to read directory at ${path}`,
      error,
      shouldThrow: true,
    });
    return [];
  }
};

/**
 * Safely reads and parses a JSON file
 * @param path Path to the JSON file
 * @returns Parsed JSON object
 */
export const safeReadJson = <T = unknown>(path: string): T => {
  const content = safeReadFile(path);
  try {
    return JSON.parse(content) as T;
  } catch (error) {
    handleError({
      context: `Failed to parse JSON from file at ${path}`,
      error,
      shouldThrow: true,
    });
    // This won't be reached due to shouldThrow, but needed for type checking
    return {} as T;
  }
};
