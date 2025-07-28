import * as bitcoin from "bitcoinjs-lib";

import {
  BITCOIN_LIMITS,
  BITCOIN_SCRIPT,
} from "../../../../types/bitcoin.constants";
import { calculateRevealFee } from "../../../../utils/bitcoin.helpers";

export interface CommitData {
  controlBlock: Buffer;
  internalKey: Buffer; // 32‑byte x‑only pubkey
  leafScript: Buffer; // compiled tapscript from the commit
}

/** Return type – ready for Dynamic Labs */
export interface RevealPsbtResult {
  // satoshi fee we just budgeted
  outputValue: number;
  // always [0] – only one input
  revealFee: number;
  // feed this to signPsbt
  signingIndexes: number[];
  unsignedPsbtBase64: string; // value that arrives at `to`
}

/**
 * Build a reveal‑TX PSBT.
 *
 * @param commitTxId  txid of the commit transaction
 * @param commitVout  output index spent (usually 0)
 * @param commitValue value (sat) locked in that output
 * @param to          gateway/recipient address
 * @param feeRate     sat/vbyte you want to pay for the reveal
 * @param commitData  controlBlock + internalKey + leafScript from makeCommitPsbt
 * @param network     bitcoin.networks.bitcoin | testnet | regtest …
 */
export const makeRevealPsbt = (
  commitTxId: string,
  commitVout: number,
  commitValue: number,
  to: string,
  feeRate: number,
  commitData: CommitData,
  network: bitcoin.Network,
  dust = BITCOIN_LIMITS.DUST_THRESHOLD.P2WPKH // keep same dust guard
): RevealPsbtResult => {
  const { output: commitScript } = bitcoin.payments.p2tr({
    internalPubkey: commitData.internalKey,
    network,
    scriptTree: { output: commitData.leafScript },
  });
  if (!commitScript) throw new Error("could not rebuild commit script");

  const { revealFee } = calculateRevealFee(commitData, feeRate);

  const outputValue = commitValue - revealFee;
  if (outputValue < dust) {
    throw new Error(
      `Commit output (${commitValue} sat) cannot cover reveal fee ` +
        `(${revealFee} sat) plus dust (${dust} sat)`
    );
  }

  const psbt = new bitcoin.Psbt({ network });

  psbt.addInput({
    hash: commitTxId,
    index: commitVout,
    tapLeafScript: [
      {
        controlBlock: commitData.controlBlock,
        leafVersion: BITCOIN_SCRIPT.LEAF_VERSION_TAPSCRIPT,
        script: commitData.leafScript,
      },
    ],
    witnessUtxo: { script: commitScript, value: commitValue },
  });

  psbt.addOutput({ address: to, value: outputValue });

  return {
    outputValue,
    revealFee,
    signingIndexes: [0],
    unsignedPsbtBase64: psbt.toBase64(),
  };
};
