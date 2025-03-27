import { CCTX } from "../types/trackCCTX.types";
import { formatStatusText, shortenHash } from "../utils/formatting";

// Define a partial CCTX type for tests that allows undefined status_message
type TestCCTX = Omit<CCTX, "status_message"> & {
  status_message?: string;
};

describe("shortenHash", () => {
  it("should shorten a hash correctly", () => {
    const hash =
      "0x123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef0";
    const shortened = shortenHash(hash);
    expect(shortened).toBe("0x12345678...9abcdef0");
  });

  it("should handle short hashes", () => {
    const hash = "0x1234";
    const shortened = shortenHash(hash);
    expect(shortened).toBe("0x1234");
  });
});

describe("formatStatusText", () => {
  it("should format status text with a message", () => {
    const tx: TestCCTX = {
      confirmed_on_destination: false,
      outbound_tx_hash: "hash",
      outbound_tx_tss_nonce: 1,
      receiver_chainId: "2",
      sender_chain_id: "1",
      status: "OutboundMined",
      status_message: "Success",
    };
    const formatted = formatStatusText(tx as CCTX);
    expect(formatted).toBe("OutboundMined (Success)");
  });

  it("should format status text without a message", () => {
    const tx: TestCCTX = {
      confirmed_on_destination: false,
      outbound_tx_hash: "hash",
      outbound_tx_tss_nonce: 1,
      receiver_chainId: "2",
      sender_chain_id: "1",
      status: "OutboundMined",
      status_message: "",
    };
    const formatted = formatStatusText(tx as CCTX);
    expect(formatted).toBe("OutboundMined");
  });

  it("should handle undefined status message", () => {
    const tx: TestCCTX = {
      confirmed_on_destination: false,
      outbound_tx_hash: "hash",
      outbound_tx_tss_nonce: 1,
      receiver_chainId: "2",
      sender_chain_id: "1",
      status: "OutboundMined",
      status_message: undefined,
    };
    const formatted = formatStatusText(tx as CCTX);
    expect(formatted).toBe("OutboundMined");
  });
});
