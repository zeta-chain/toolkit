/**
 * Bitcoin network constants
 */
export const BITCOIN_NETWORKS = {
  SIGNET: {
    BECH32: "tb",
    BIP32: {
      PRIVATE: 0x04358394,
      PUBLIC: 0x043587cf,
    },
    MESSAGE_PREFIX: "\x18Bitcoin Signed Message:\n",
    PUBKEY_HASH: 0x6f,
    SCRIPT_HASH: 0xc4,
    WIF: 0xef,
  },
};

/**
 * Bitcoin script and transaction constants
 */
export const BITCOIN_SCRIPT = {
  LEAF_VERSION_TAPSCRIPT: 0xc0,
};

/**
 * Transaction encoding constants
 */
export const BITCOIN_TX = {
  COMPACT_SIZE: {
    MARKER_UINT16: 0xfd,
  },
  // version+locktime
  P2WPKH_OUTPUT_VBYTES: 31,
  TX_OVERHEAD: 10,
};

/**
 * Bitcoin network limits
 */
export const BITCOIN_LIMITS = {
  DUST_THRESHOLD: {
    P2TR: 330,
    P2WPKH: 294,
    ZETACHAIN: 1000,
  },
  // Minimum amount for commit output
  ESTIMATED_REVEAL_FEE: 5000,
  MIN_COMMIT_AMOUNT: 546, // Estimated fee for reveal transaction
};

/**
 * Fee defaults
 */
export const BITCOIN_FEES = {
  DEFAULT_COMMIT_FEE_SAT: 15000,
  DEFAULT_REVEAL_FEE_RATE: 10,
  MIN_TOTAL_FEE: 20000, // Minimum total fee for both transactions
};

export const ESTIMATED_VIRTUAL_SIZE = 68;
export const EVM_ADDRESS_LENGTH = 20;
export const MAX_MEMO_LENGTH = 80;
