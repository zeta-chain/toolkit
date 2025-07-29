import * as bitcoin from "bitcoinjs-lib";

import {
  BITCOIN_FEES,
  BITCOIN_SCRIPT,
  ESTIMATED_VIRTUAL_SIZE,
} from "../../../../types/bitcoin.constants";
import { calculateRevealFee } from "../../../../utils/bitcoin.helpers";

export const LEAF_VERSION_TAPSCRIPT = BITCOIN_SCRIPT.LEAF_VERSION_TAPSCRIPT;

export type PreparedUtxo = {
  scriptPubKey: Buffer;
  txid: string;
  value: number;
  vout: number;
};

// Insert parameter interface for the new single-object argument
export interface MakeCommitPsbtParams {
  amount: number;
  changeAddress: string;
  feeSat?: number;
  inscriptionData: Buffer;
  internalPubkey: Buffer;
  network: bitcoin.Network;
  utxos: PreparedUtxo[];
}

export const makeCommitPsbt = ({
  internalPubkey,
  utxos,
  changeAddress,
  inscriptionData,
  amount,
  network,
  feeSat = BITCOIN_FEES.DEFAULT_COMMIT_FEE_SAT,
}: MakeCommitPsbtParams): {
  controlBlock: Buffer;
  internalKey: Buffer;
  leafScript: Buffer;
  signingIndexes: number[];
  unsignedPsbtBase64: string;
} => {
  const scriptItems = [
    internalPubkey,
    bitcoin.opcodes.OP_CHECKSIG,
    bitcoin.opcodes.OP_FALSE,
    bitcoin.opcodes.OP_IF,
  ];

  const MAX_SCRIPT_ELEMENT_SIZE = 520;
  if (inscriptionData.length > MAX_SCRIPT_ELEMENT_SIZE) {
    for (let i = 0; i < inscriptionData.length; i += MAX_SCRIPT_ELEMENT_SIZE) {
      const end = Math.min(i + MAX_SCRIPT_ELEMENT_SIZE, inscriptionData.length);
      scriptItems.push(inscriptionData.slice(i, end));
    }
  } else {
    scriptItems.push(inscriptionData);
  }

  scriptItems.push(bitcoin.opcodes.OP_ENDIF);

  const leafScript = bitcoin.script.compile(scriptItems);

  const { output: commitScript, witness } = bitcoin.payments.p2tr({
    internalPubkey,
    network,
    redeem: { output: leafScript, redeemVersion: LEAF_VERSION_TAPSCRIPT },
    scriptTree: { output: leafScript },
  });

  if (!witness) throw new Error("taproot build failed");

  const { revealFee, vsize } = calculateRevealFee(
    {
      controlBlock: witness[witness.length - 1],
      internalKey: internalPubkey,
      leafScript,
    },
    BITCOIN_FEES.DEFAULT_REVEAL_FEE_RATE
  );

  const depositFee = Math.ceil(
    (ESTIMATED_VIRTUAL_SIZE * 2 * revealFee) / vsize
  );
  const amountSat = amount + revealFee + depositFee;

  const sortedUtxos = utxos.sort((a, b) => a.value - b.value);

  let inTotal = 0;
  const picks: PreparedUtxo[] = [];
  for (const u of sortedUtxos) {
    inTotal += u.value;
    picks.push(u);
    if (inTotal >= amountSat + feeSat) break;
  }
  if (inTotal < amountSat + feeSat) throw new Error("Not enough funds");

  const changeSat = inTotal - amountSat - feeSat;

  if (!commitScript) throw new Error("taproot build failed");

  const psbt = new bitcoin.Psbt({ network });
  psbt.addOutput({ script: commitScript, value: amountSat });
  if (changeSat > 0)
    psbt.addOutput({ address: changeAddress, value: changeSat });

  picks.forEach((u) => {
    psbt.addInput({
      hash: u.txid,
      index: u.vout,
      witnessUtxo: {
        script: u.scriptPubKey,
        value: u.value,
      },
    });
  });

  return {
    controlBlock: witness[witness.length - 1],
    internalKey: internalPubkey,
    leafScript,
    signingIndexes: picks.map((_, i) => i),
    unsignedPsbtBase64: psbt.toBase64(),
  };
};
