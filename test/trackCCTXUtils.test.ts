import { PendingNoncesSDKType } from "@zetachain/sdk-cosmos/zetachain/zetacore/observer/pending_nonces";

import { CCTX, CCTXs } from "../types/trackCCTX.types";
import {
  TransactionState,
  updateState,
  validateState,
} from "../utils/trackCCTX";

describe("updateState", () => {
  it("should update state immutably", () => {
    const initialState: TransactionState = {
      cctxs: {},
      pendingNonces: [],
      pollCount: 0,
      spinners: {},
    };

    const updatedState = updateState(initialState, { pollCount: 1 });

    expect(updatedState).not.toBe(initialState); // Check that it's a new object
    expect(updatedState.pollCount).toBe(1);
    expect(initialState.pollCount).toBe(0); // Original unchanged
  });

  it("should merge objects correctly", () => {
    const initialState: TransactionState = {
      cctxs: { "0x123": [] },
      pendingNonces: [],
      pollCount: 0,
      spinners: {},
    };

    const newCctxs: CCTXs = {
      "0x123": [],
      "0x456": [],
    };

    const updatedState = updateState(initialState, { cctxs: newCctxs });

    expect(updatedState.cctxs).toEqual(newCctxs);
    expect(Object.keys(updatedState.cctxs).length).toBe(2);
  });
});

describe("validateState", () => {
  it("should validate a correct state", () => {
    const validState: TransactionState = {
      cctxs: {},
      pendingNonces: [],
      pollCount: 0,
      spinners: {},
    };

    expect(validateState(validState)).toBe(true);
  });

  it("should reject null state", () => {
    expect(validateState(null as unknown as TransactionState)).toBe(false);
  });

  it("should reject missing cctxs", () => {
    const invalidState: unknown = {
      pendingNonces: [],
      pollCount: 0,
      spinners: {},
    };

    expect(validateState(invalidState as TransactionState)).toBe(false);
  });

  it("should reject non-object cctxs", () => {
    const invalidState: unknown = {
      cctxs: "not an object",
      pendingNonces: [],
      pollCount: 0,
      spinners: {},
    };

    expect(validateState(invalidState as TransactionState)).toBe(false);
  });

  it("should reject missing spinners", () => {
    const invalidState: unknown = {
      cctxs: {},
      pendingNonces: [],
      pollCount: 0,
    };

    expect(validateState(invalidState as TransactionState)).toBe(false);
  });

  it("should reject non-array pendingNonces", () => {
    const invalidState: unknown = {
      cctxs: {},
      pendingNonces: "not an array",
      pollCount: 0,
      spinners: {},
    };

    expect(validateState(invalidState as TransactionState)).toBe(false);
  });

  it("should reject non-numeric pollCount", () => {
    const invalidState: unknown = {
      cctxs: {},
      pendingNonces: [],
      pollCount: "0",
      spinners: {},
    };

    expect(validateState(invalidState as TransactionState)).toBe(false);
  });
});

describe("state management utilities", () => {
  it("should construct a valid initial state", () => {
    const initialState: TransactionState = {
      cctxs: {},
      pendingNonces: [],
      pollCount: 0,
      spinners: {},
    };

    expect(validateState(initialState)).toBe(true);
  });

  it("should handle complex state updates", () => {
    const initialState: TransactionState = {
      cctxs: {},
      pendingNonces: [],
      pollCount: 0,
      spinners: {},
    };

    const mockTx: CCTX = {
      confirmed_on_destination: false,
      outbound_tx_hash: "0x123",
      outbound_tx_tss_nonce: 1,
      receiver_chainId: "1",
      sender_chain_id: "2",
      status: "OutboundMined",
      status_message: "Success",
    };

    // Simulate several state updates in sequence
    let currentState = initialState;

    // Update 1: Add a transaction
    currentState = updateState(currentState, {
      cctxs: { "0x123": [mockTx] },
      spinners: { "0x123": true },
    });

    expect(currentState.cctxs["0x123"]).toHaveLength(1);
    expect(currentState.spinners["0x123"]).toBe(true);

    // Update 2: Increment poll count
    currentState = updateState(currentState, { pollCount: 1 });
    expect(currentState.pollCount).toBe(1);

    // Update 3: Add pending nonces
    const pendingNonces: PendingNoncesSDKType[] = [
      {
        chain_id: BigInt(1),
        nonce_high: BigInt(0),
        nonce_low: BigInt(0),
        tss: "test-tss",
      },
    ];
    currentState = updateState(currentState, { pendingNonces });

    expect(currentState.pendingNonces).toEqual(pendingNonces);
    expect(validateState(currentState)).toBe(true);
  });
});
