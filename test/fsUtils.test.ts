import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  jest,
} from "@jest/globals";
import fs from "fs";

import {
  safeExists,
  safeMkdir,
  safeReadDir,
  safeReadFile,
  safeReadJson,
  safeUnlink,
  safeWriteFile,
} from "../utils/fsUtils";
import { handleError } from "../utils/handleError";

// Mock fs module
jest.mock("fs");

// Mock handleError utility
jest.mock("../utils/handleError");

describe("fsUtils", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  describe("safeReadFile", () => {
    it("should read file content successfully", () => {
      const mockContent = "file content";
      (fs.readFileSync as jest.Mock).mockReturnValue(mockContent);

      const result = safeReadFile("test.txt");

      expect(result).toBe(mockContent);
      expect(fs.readFileSync).toHaveBeenCalledWith("test.txt", {
        encoding: "utf-8",
      });
    });

    it("should handle errors when reading file", () => {
      const mockError = new Error("File not found");
      (fs.readFileSync as jest.Mock).mockImplementation(() => {
        throw mockError;
      });

      // This would throw, but we mock handleError
      safeReadFile("nonexistent.txt");

      expect(fs.readFileSync).toHaveBeenCalledWith("nonexistent.txt", {
        encoding: "utf-8",
      });
      expect(handleError).toHaveBeenCalledWith({
        context: "Failed to read file at nonexistent.txt",
        error: mockError,
        shouldThrow: true,
      });
    });
  });

  describe("safeWriteFile", () => {
    it("should write string content successfully", () => {
      (fs.writeFileSync as jest.Mock).mockImplementation(() => {});

      safeWriteFile("test.txt", "content");

      expect(fs.writeFileSync).toHaveBeenCalledWith(
        "test.txt",
        "content",
        undefined
      );
    });

    it("should convert object to JSON when writing", () => {
      const obj = { key: "value" };
      (fs.writeFileSync as jest.Mock).mockImplementation(() => {});

      safeWriteFile("test.json", obj);

      expect(fs.writeFileSync).toHaveBeenCalledWith(
        "test.json",
        JSON.stringify(obj, null, 2),
        undefined
      );
    });

    it("should handle errors when writing file", () => {
      const mockError = new Error("Permission denied");
      (fs.writeFileSync as jest.Mock).mockImplementation(() => {
        throw mockError;
      });

      safeWriteFile("protected.txt", "content");

      expect(fs.writeFileSync).toHaveBeenCalledWith(
        "protected.txt",
        "content",
        undefined
      );
      expect(handleError).toHaveBeenCalledWith({
        context: "Failed to write to file at protected.txt",
        error: mockError,
        shouldThrow: true,
      });
    });
  });

  describe("safeMkdir", () => {
    it("should create a directory successfully", () => {
      (fs.mkdirSync as jest.Mock).mockImplementation(() => {});

      safeMkdir("testdir");

      expect(fs.mkdirSync).toHaveBeenCalledWith("testdir", { recursive: true });
    });

    it("should ignore error if directory already exists", () => {
      const mockError = new Error("Directory exists");
      Object.defineProperty(mockError, "code", { value: "EEXIST" });

      (fs.mkdirSync as jest.Mock).mockImplementation(() => {
        throw mockError;
      });

      safeMkdir("existingdir");

      expect(fs.mkdirSync).toHaveBeenCalledWith("existingdir", {
        recursive: true,
      });
      expect(handleError).not.toHaveBeenCalled();
    });

    it("should handle other mkdir errors", () => {
      const mockError = new Error("Permission denied");
      (fs.mkdirSync as jest.Mock).mockImplementation(() => {
        throw mockError;
      });

      safeMkdir("protecteddir");

      expect(fs.mkdirSync).toHaveBeenCalledWith("protecteddir", {
        recursive: true,
      });
      expect(handleError).toHaveBeenCalledWith({
        context: "Failed to create directory at protecteddir",
        error: mockError,
        shouldThrow: true,
      });
    });
  });

  describe("safeExists", () => {
    it("should return true when file exists", () => {
      (fs.existsSync as jest.Mock).mockReturnValue(true);

      const result = safeExists("existing.txt");

      expect(result).toBe(true);
      expect(fs.existsSync).toHaveBeenCalledWith("existing.txt");
    });

    it("should return false when file doesn't exist", () => {
      (fs.existsSync as jest.Mock).mockReturnValue(false);

      const result = safeExists("nonexistent.txt");

      expect(result).toBe(false);
      expect(fs.existsSync).toHaveBeenCalledWith("nonexistent.txt");
    });

    it("should handle errors when checking existence", () => {
      const mockError = new Error("Path error");
      (fs.existsSync as jest.Mock).mockImplementation(() => {
        throw mockError;
      });

      const result = safeExists("bad/path");

      expect(result).toBe(false);
      expect(fs.existsSync).toHaveBeenCalledWith("bad/path");
      expect(handleError).toHaveBeenCalledWith({
        context: "Failed to check if path exists at bad/path",
        error: mockError,
        shouldThrow: false,
      });
    });
  });

  describe("safeReadJson", () => {
    it("should read and parse JSON file successfully", () => {
      const jsonObj = { key: "value" };
      const jsonStr = JSON.stringify(jsonObj);

      // Mock safeReadFile to return the JSON string
      (fs.readFileSync as jest.Mock).mockReturnValue(jsonStr);

      const result = safeReadJson("test.json");

      expect(result).toEqual(jsonObj);
      expect(fs.readFileSync).toHaveBeenCalledWith("test.json", {
        encoding: "utf-8",
      });
    });

    it("should handle JSON parsing errors", () => {
      const invalidJson = "{invalid: json}";
      (fs.readFileSync as jest.Mock).mockReturnValue(invalidJson);

      safeReadJson("invalid.json");

      // First call is for safeReadFile, which succeeds, but parsing fails
      expect(fs.readFileSync).toHaveBeenCalledWith("invalid.json", {
        encoding: "utf-8",
      });
      expect(handleError).toHaveBeenCalledWith(
        expect.objectContaining({
          context: "Failed to parse JSON from file at invalid.json",
          shouldThrow: true,
        })
      );
    });
  });

  describe("safeUnlink", () => {
    it("should delete a file successfully", () => {
      (fs.unlinkSync as jest.Mock).mockImplementation(() => {});

      safeUnlink("test.txt");

      expect(fs.unlinkSync).toHaveBeenCalledWith("test.txt");
    });

    it("should handle errors when deleting a file", () => {
      const mockError = new Error("No such file");
      (fs.unlinkSync as jest.Mock).mockImplementation(() => {
        throw mockError;
      });

      safeUnlink("nonexistent.txt");

      expect(fs.unlinkSync).toHaveBeenCalledWith("nonexistent.txt");
      expect(handleError).toHaveBeenCalledWith({
        context: "Failed to delete file at nonexistent.txt",
        error: mockError,
        shouldThrow: true,
      });
    });
  });

  describe("safeReadDir", () => {
    it("should read directory contents successfully", () => {
      const mockFiles = ["file1.txt", "file2.txt"];
      (fs.readdirSync as jest.Mock).mockReturnValue(mockFiles);

      const result = safeReadDir("testdir");

      expect(result).toEqual(mockFiles);
      expect(fs.readdirSync).toHaveBeenCalledWith("testdir");
    });

    it("should handle errors when reading a directory", () => {
      const mockError = new Error("Directory not found");
      (fs.readdirSync as jest.Mock).mockImplementation(() => {
        throw mockError;
      });

      safeReadDir("nonexistent-dir");

      expect(fs.readdirSync).toHaveBeenCalledWith("nonexistent-dir");
      expect(handleError).toHaveBeenCalledWith({
        context: "Failed to read directory at nonexistent-dir",
        error: mockError,
        shouldThrow: true,
      });
    });
  });
});
