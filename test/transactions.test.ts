/* eslint-disable @typescript-eslint/unbound-method */
import {
  CCTX,
  CCTXs,
  Emitter,
  PendingNonce,
  Spinners,
} from "../types/trackCCTX.types";
import {
  checkCompletionStatus,
  processNewCctxHashes,
  updateEmitter,
  validateTransactionHash,
} from "../utils/transactions";

// Type for emit mock calls to address linter errors
type MockCall = [string, Record<string, unknown>];

describe("processNewCctxHashes", () => {
  it("should process new hashes correctly", () => {
    // Arrange
    const hashes = ["hash1", "hash2"];
    const cctxs: CCTXs = { hash3: [] };
    const spinners: Spinners = { hash3: true };
    const emitter: Emitter = {
      emit: jest.fn(),
    };
    const json = false;

    // Act
    const result = processNewCctxHashes(hashes, cctxs, spinners, emitter, json);

    // Assert
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
    // Arrange
    const hashes = ["hash1", "hash2"];
    const cctxs: CCTXs = { hash1: [] };
    const spinners: Spinners = { hash2: true };
    const emitter = null;
    const json = false;

    // Act
    const result = processNewCctxHashes(hashes, cctxs, spinners, emitter, json);

    // Assert
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
    // Arrange
    const hashes = ["hash1", "hash2"];
    const cctxs: CCTXs = {};
    const spinners: Spinners = {};
    const emitter = {
      emit: jest.fn(),
    };
    const json = true;

    // Act
    const result = processNewCctxHashes(hashes, cctxs, spinners, emitter, json);

    // Assert
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
    // Arrange
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

    // Act
    const result = updateEmitter(
      hash,
      tx,
      cctxs,
      spinners,
      pendingNonces,
      emitter,
      json
    );

    // Assert
    expect(result).toEqual({ hash1: false });

    const mockEmit = emitter.emit as jest.Mock;
    const calls = mockEmit.mock.calls as MockCall[];
    expect(calls.length).toBeGreaterThan(0);
    expect(calls[0][0]).toBe("succeed");
  });

  it("should update emitter for failure", () => {
    // Arrange
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

    // Act
    const result = updateEmitter(
      hash,
      tx,
      cctxs,
      spinners,
      pendingNonces,
      emitter,
      json
    );

    // Assert
    expect(result).toEqual({ hash1: false });

    const mockEmit = emitter.emit as jest.Mock;
    const calls = mockEmit.mock.calls as MockCall[];
    expect(calls.length).toBeGreaterThan(0);
    expect(calls[0][0]).toBe("fail");
  });

  it("should update emitter for pending status", () => {
    // Arrange
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

    // Act
    const result = updateEmitter(
      hash,
      tx,
      cctxs,
      spinners,
      pendingNonces,
      emitter,
      json
    );

    // Assert
    expect(result).toEqual({ hash1: true });

    const mockEmit = emitter.emit as jest.Mock;
    const calls = mockEmit.mock.calls as MockCall[];
    expect(calls.length).toBeGreaterThan(0);
    expect(calls[0][0]).toBe("update");
  });
});

describe("checkCompletionStatus", () => {
  it("should detect all transactions are complete and successful", () => {
    // Arrange
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

    // Act
    const result = checkCompletionStatus(cctxs, emitter, json);

    // Assert
    expect(result).toEqual({ isComplete: true, isSuccessful: true });

    const mockEmit = emitter.emit as jest.Mock;
    const calls = mockEmit.mock.calls as MockCall[];
    expect(calls.length).toBeGreaterThan(0);
    expect(calls[0][0]).toBe("mined-success");
    expect(calls[0][1]).toEqual({ cctxs });
  });

  it("should detect complete but failed transactions", () => {
    // Arrange
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

    // Act
    const result = checkCompletionStatus(cctxs, emitter, json);

    // Assert
    expect(result).toEqual({ isComplete: true, isSuccessful: false });

    const mockEmit = emitter.emit as jest.Mock;
    const calls = mockEmit.mock.calls as MockCall[];
    expect(calls.length).toBeGreaterThan(0);
    expect(calls[0][0]).toBe("mined-fail");
    expect(calls[0][1]).toEqual({ cctxs });
  });

  it("should detect incomplete transactions", () => {
    // Arrange
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

    // Act
    const result = checkCompletionStatus(cctxs, emitter, json);

    // Assert
    expect(result).toEqual({ isComplete: false, isSuccessful: false });

    const mockEmit = emitter.emit as jest.Mock;
    const calls = mockEmit.mock.calls as MockCall[];
    expect(calls.length).toBe(0);
  });
});

describe("validateTransactionHash", () => {
  it("should validate correct transaction hash", () => {
    // Arrange
    const hash =
      "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef";

    // Act
    const result = validateTransactionHash(hash);

    // Assert
    expect(result).toBe(true);
  });

  it("should reject invalid transaction hash formats", () => {
    // Arrange
    const invalidHashes = [
      "1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef", // no 0x prefix
      "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcde", // too short
      "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdefg", // invalid character
      "0x1234567890ABCDEF1234567890ABCDEF1234567890ABCDEF1234567890ABCDEF1234", // too long
      "0xZZZZ567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef", // invalid characters
      "", // empty string
    ];

    // Act & Assert
    invalidHashes.forEach((hash) => {
      expect(validateTransactionHash(hash)).toBe(false);
    });
  });
});
