export const DEFAULT_API_URL =
  "https://zetachain-athens.blockpi.network/lcd/v1/public";
export const DEFAULT_EVM_RPC_URL =
  "https://zetachain-athens-evm.blockpi.network/v1/rpc/public";

// Default LCD endpoints for the public ZetaChain networks
// Keep the original DEFAULT_API_URL for backwards-compatibility (it still
// points to the Athens public testnet).
export const DEFAULT_API_TESTNET_URL = DEFAULT_API_URL;

// ⚠️  Mainnet endpoint – update if the public endpoint changes.
export const DEFAULT_API_MAINNET_URL =
  "https://zetachain.blockpi.network/lcd/v1/public";
