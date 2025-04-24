/* eslint-disable @typescript-eslint/unbound-method */
import { describe, expect, it } from "@jest/globals";

import {
  CCTX,
  CCTXs,
  Emitter,
  PendingNonce,
  Spinners,
} from "../types/trackCCTX.types";
import {
  checkCompletionStatus,
  isValidBitcoinTxHash,
  isValidEVMTxHash,
  isValidSolanaTxHash,
  isValidTxHash,
  processNewCctxHashes,
  updateEmitter,
} from "../utils/transactions";

// Type for emit mock calls to address linter errors
type MockCall = [string, Record<string, unknown>];

describe("processNewCctxHashes", () => {
  it("should process new hashes correctly", () => {
    const hashes = ["hash1", "hash2"];
    const cctxs: CCTXs = { hash3: [] };
    const spinners: Spinners = { hash3: true };
    const emitter: Emitter = {
      emit: jest.fn(),
    };
    const json = false;

    const result = processNewCctxHashes(hashes, cctxs, spinners, emitter, json);

    expect(result.cctxs).toEqual({
      hash1: [],
      hash2: [],
      hash3: [],
    });

    // Both hash1 and hash2 should be added to spinners since they don't exist in spinners
    expect(result.spinners).toEqual({
      hash1: true,
      hash2: true,
      hash3: true,
    });

    const mockEmit = emitter.emit as jest.Mock;
    expect(mockEmit.mock.calls.length).toBe(2);

    const calls = mockEmit.mock.calls as MockCall[];
    expect(
      calls.some((call) => call[0] === "add" && call[1].hash === "hash1")
    ).toBe(true);

    expect(
      calls.some((call) => call[0] === "add" && call[1].hash === "hash2")
    ).toBe(true);
  });

  it("should handle existing entries", () => {
    const hashes = ["hash1", "hash2"];
    const cctxs: CCTXs = { hash1: [] };
    const spinners: Spinners = { hash2: true };
    const emitter = null;
    const json = false;

    const result = processNewCctxHashes(hashes, cctxs, spinners, emitter, json);

    // hash1 should already exist in cctxs and be preserved
    // hash2 should be added to cctxs since it doesn't exist there
    // newCctxs[hash] is only set if the hash doesn't exist in newCctxs AND doesn't exist in newSpinners
    // Since hash2 exists in spinners, it is not added to cctxs
    expect(result.cctxs).toEqual({
      hash1: [],
    });

    // hash2 should already exist in spinners and be preserved
    // The implementation only adds to spinners if (!newCctxs[hash] && !newSpinners[hash])
    // hash1 already exists in cctxs so it won't be added to spinners
    expect(result.spinners).toEqual({
      hash2: true,
    });
  });

  it("should not update anything in json mode", () => {
    const hashes = ["hash1", "hash2"];
    const cctxs: CCTXs = {};
    const spinners: Spinners = {};
    const emitter = {
      emit: jest.fn(),
    };
    const json = true;

    const result = processNewCctxHashes(hashes, cctxs, spinners, emitter, json);

    expect(result.cctxs).toEqual({
      hash1: [],
      hash2: [],
    });
    expect(result.spinners).toEqual({});

    const mockEmit = emitter.emit;
    expect(mockEmit.mock.calls.length).toBe(0);
  });
});

describe("updateEmitter", () => {
  it("should update emitter for success", () => {
    const hash = "hash1";
    const tx: CCTX = {
      confirmed_on_destination: false,
      outbound_tx_hash: "hash1",
      outbound_tx_tss_nonce: 1,
      receiver_chainId: "2",
      sender_chain_id: "1",
      status: "OutboundMined",
      status_message: "Success",
    };
    const cctxs: CCTXs = {
      hash1: [
        {
          confirmed_on_destination: false,
          outbound_tx_hash: "hash1",
          outbound_tx_tss_nonce: 1,
          receiver_chainId: "2",
          sender_chain_id: "1",
          status: "Pending",
          status_message: "",
        },
      ],
    };
    const spinners: Spinners = { hash1: true };
    const pendingNonces: PendingNonce[] = [];
    const emitter: Emitter = {
      emit: jest.fn(),
    };
    const json = false;

    const result = updateEmitter(
      hash,
      tx,
      cctxs,
      spinners,
      pendingNonces,
      emitter,
      json
    );

    expect(result).toEqual({ hash1: false });

    const mockEmit = emitter.emit as jest.Mock;
    const calls = mockEmit.mock.calls as MockCall[];
    expect(calls.length).toBeGreaterThan(0);
    expect(calls[0][0]).toBe("succeed");
  });

  it("should update emitter for failure", () => {
    const hash = "hash1";
    const tx: CCTX = {
      confirmed_on_destination: false,
      outbound_tx_hash: "hash1",
      outbound_tx_tss_nonce: 1,
      receiver_chainId: "2",
      sender_chain_id: "1",
      status: "Reverted",
      status_message: "Error",
    };
    const cctxs: CCTXs = {
      hash1: [
        {
          confirmed_on_destination: false,
          outbound_tx_hash: "hash1",
          outbound_tx_tss_nonce: 1,
          receiver_chainId: "2",
          sender_chain_id: "1",
          status: "Pending",
          status_message: "",
        },
      ],
    };
    const spinners: Spinners = { hash1: true };
    const pendingNonces: PendingNonce[] = [];
    const emitter: Emitter = {
      emit: jest.fn(),
    };
    const json = false;

    const result = updateEmitter(
      hash,
      tx,
      cctxs,
      spinners,
      pendingNonces,
      emitter,
      json
    );

    expect(result).toEqual({ hash1: false });

    const mockEmit = emitter.emit as jest.Mock;
    const calls = mockEmit.mock.calls as MockCall[];
    expect(calls.length).toBeGreaterThan(0);
    expect(calls[0][0]).toBe("fail");
  });

  it("should update emitter for pending status", () => {
    const hash = "hash1";
    const tx: CCTX = {
      confirmed_on_destination: false,
      outbound_tx_hash: "hash1",
      outbound_tx_tss_nonce: 1,
      receiver_chainId: "2",
      sender_chain_id: "1",
      status: "Pending",
      status_message: "",
    };
    const cctxs: CCTXs = {
      hash1: [
        {
          confirmed_on_destination: false,
          outbound_tx_hash: "hash1",
          outbound_tx_tss_nonce: 1,
          receiver_chainId: "2",
          sender_chain_id: "1",
          status: "Pending",
          status_message: "",
        },
      ],
    };
    const spinners: Spinners = { hash1: true };
    const pendingNonces: PendingNonce[] = [];
    const emitter: Emitter = {
      emit: jest.fn(),
    };
    const json = false;

    const result = updateEmitter(
      hash,
      tx,
      cctxs,
      spinners,
      pendingNonces,
      emitter,
      json
    );

    expect(result).toEqual({ hash1: true });

    const mockEmit = emitter.emit as jest.Mock;
    const calls = mockEmit.mock.calls as MockCall[];
    expect(calls.length).toBeGreaterThan(0);
    expect(calls[0][0]).toBe("update");
  });
});

describe("checkCompletionStatus", () => {
  it("should detect all transactions are complete and successful", () => {
    const cctxs: CCTXs = {
      hash1: [
        {
          confirmed_on_destination: false,
          outbound_tx_hash: "hash1",
          outbound_tx_tss_nonce: 1,
          receiver_chainId: "2",
          sender_chain_id: "1",
          status: "OutboundMined",
          status_message: "Success",
        },
      ],
      hash2: [
        {
          confirmed_on_destination: false,
          outbound_tx_hash: "hash2",
          outbound_tx_tss_nonce: 2,
          receiver_chainId: "2",
          sender_chain_id: "1",
          status: "OutboundMined",
          status_message: "Success",
        },
      ],
    };
    const emitter: Emitter = {
      emit: jest.fn(),
    };
    const json = false;

    const result = checkCompletionStatus(cctxs, emitter, json);

    expect(result).toEqual({ isComplete: true, isSuccessful: true });

    const mockEmit = emitter.emit as jest.Mock;
    const calls = mockEmit.mock.calls as MockCall[];
    expect(calls.length).toBeGreaterThan(0);
    expect(calls[0][0]).toBe("mined-success");
    expect(calls[0][1]).toEqual({ cctxs });
  });

  it("should detect complete but failed transactions", () => {
    const cctxs: CCTXs = {
      hash1: [
        {
          confirmed_on_destination: false,
          outbound_tx_hash: "hash1",
          outbound_tx_tss_nonce: 1,
          receiver_chainId: "2",
          sender_chain_id: "1",
          status: "OutboundMined",
          status_message: "Success",
        },
      ],
      hash2: [
        {
          confirmed_on_destination: false,
          outbound_tx_hash: "hash2",
          outbound_tx_tss_nonce: 2,
          receiver_chainId: "2",
          sender_chain_id: "1",
          status: "Reverted",
          status_message: "Error",
        },
      ],
    };
    const emitter: Emitter = {
      emit: jest.fn(),
    };
    const json = false;

    const result = checkCompletionStatus(cctxs, emitter, json);

    expect(result).toEqual({ isComplete: true, isSuccessful: false });

    const mockEmit = emitter.emit as jest.Mock;
    const calls = mockEmit.mock.calls as MockCall[];
    expect(calls.length).toBeGreaterThan(0);
    expect(calls[0][0]).toBe("mined-fail");
    expect(calls[0][1]).toEqual({ cctxs });
  });

  it("should detect incomplete transactions", () => {
    const cctxs: CCTXs = {
      hash1: [
        {
          confirmed_on_destination: false,
          outbound_tx_hash: "hash1",
          outbound_tx_tss_nonce: 1,
          receiver_chainId: "2",
          sender_chain_id: "1",
          status: "OutboundMined",
          status_message: "Success",
        },
      ],
      hash2: [
        {
          confirmed_on_destination: false,
          outbound_tx_hash: "hash2",
          outbound_tx_tss_nonce: 2,
          receiver_chainId: "2",
          sender_chain_id: "1",
          status: "Pending",
          status_message: "",
        },
      ],
    };
    const emitter: Emitter = {
      emit: jest.fn(),
    };
    const json = false;

    const result = checkCompletionStatus(cctxs, emitter, json);

    expect(result).toEqual({ isComplete: false, isSuccessful: false });

    const mockEmit = emitter.emit as jest.Mock;
    const calls = mockEmit.mock.calls as MockCall[];
    expect(calls.length).toBe(0);
  });
});

describe("isValidEVMTxHash", () => {
  it("should return true for valid EVM transaction hashes", () => {
    const validHashes = [
      "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef",
      "0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890",
      "0x0000000000000000000000000000000000000000000000000000000000000000",
    ];

    validHashes.forEach((hash) => {
      expect(isValidEVMTxHash(hash)).toBe(true);
    });
  });

  it("should return false for invalid EVM transaction hashes", () => {
    const invalidHashes = [
      "1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef", // Missing 0x prefix
      "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcde", // Too short
      "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdefg", // Too long
      "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdefg", // Invalid characters
      "0x1234567890QWERTY1234567890abcdef1234567890abcdef1234567890abcdef", // Invalid characters
      "", // Empty string
      "not a hash",
    ];

    invalidHashes.forEach((hash) => {
      expect(isValidEVMTxHash(hash)).toBe(false);
    });
  });
});

describe("isValidBitcoinTxHash", () => {
  it("should return true for valid Bitcoin transaction hashes", () => {
    const validHashes = [
      "1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef",
      "abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890",
      "0000000000000000000000000000000000000000000000000000000000000000",
      "ABCDEF1234567890ABCDEF1234567890ABCDEF1234567890ABCDEF1234567890",
    ];

    validHashes.forEach((hash) => {
      expect(isValidBitcoinTxHash(hash)).toBe(true);
    });
  });

  it("should return false for invalid Bitcoin transaction hashes", () => {
    const invalidHashes = [
      "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef", // Has 0x prefix
      "1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcde", // Too short
      "1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdefgh", // Too long
      "1234567890QWERTY1234567890abcdef1234567890abcdef1234567890abcdef", // Invalid characters
      "", // Empty string
      "not a hash",
    ];

    invalidHashes.forEach((hash) => {
      expect(isValidBitcoinTxHash(hash)).toBe(false);
    });
  });
});

describe("isValidSolanaTxHash", () => {
  it("should return true for valid Solana transaction hashes", () => {
    // These are examples of base58 encoded strings with 64 bytes length when decoded
    const validHashes = [
      "5KtPn1LGuxhFqTWYNyxSFQJ6MBkpKwGgtJ5uPAKFyCcBz6uJQkQwjxpGzNBzE87J6YEBbZL3JWDEiXfFY6WXGx8p",
      "3NQmDb8ijKy8KQgFKTZKsFFxcPD8wGj8YBeM7G8aDkLm9oCGgPxvnFfVK7K29n3rsE1bhT7zrQ7FS4b9oEELMbMc",
      "3xbQrzp3GBw3PiocbGHN5NEpsaHVo45s8EuGA7p12AUL9bRfa34G84FPUEzFDfx5MQAnDAW1hijReN76wjFD2kbd",
    ];

    validHashes.forEach((hash) => {
      expect(isValidSolanaTxHash(hash)).toBe(true);
    });
  });

  it("should return false for invalid Solana transaction hashes", () => {
    const invalidHashes = [
      "invalid", // Too short
      "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef", // EVM format
      "1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef", // Bitcoin format
      "", // Empty string
      "abc123", // Too short base58 string
      "ABCDEFGHIJKLMNOPQRSTUVWXYZ", // Invalid base58 characters
      "IIIIIIIIOOOOOOOOLLLLLLL", // Invalid base58 characters (I, O, l are not used in base58)
    ];

    invalidHashes.forEach((hash) => {
      expect(isValidSolanaTxHash(hash)).toBe(false);
    });
  });
});

describe("isValidTxHash", () => {
  it("should return true for valid transaction hashes of various formats", () => {
    const validHashes = [
      // EVM
      "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef",
      // Bitcoin/TON
      "1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef",
      // Solana (base58 encoded)
      "5KtPn1LGuxhFqTWYNyxSFQJ6MBkpKwGgtJ5uPAKFyCcBz6uJQkQwjxpGzNBzE87J6YEBbZL3JWDEiXfFY6WXGx8p",
      // SUI - Transaction digest encoding
      "ScuFyUm9FN3iaLAe1pdfSkYd63gQaNCmr1pmJhzsGrU",
    ];

    validHashes.forEach((hash) => {
      expect(isValidTxHash(hash)).toBe(true);
    });
  });

  it("should return false for invalid transaction hashes", () => {
    const invalidHashes = [
      "0x123", // Too short EVM
      "123", // Too short Bitcoin/TON
      "invalid", // Invalid format
      null as unknown as string, // null
      undefined as unknown as string, // undefined
      [1, 2, 3] as unknown as string, // array
      { a: 1 } as unknown as string, // object
      100 as unknown as string, // number
      false as unknown as string, // boolean
      "", // Empty string
      "0xZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZ", // Invalid characters
      "ZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZ", // Invalid characters
    ];

    invalidHashes.forEach((hash) => {
      expect(isValidTxHash(hash)).toBe(false);
    });
  });
});
