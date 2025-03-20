import axios from "axios";

import {
  CCTXs,
  CrossChainTxResponse,
  Emitter,
  InboundHashToCctxResponseReturnType,
  PendingNonce,
  PendingNoncesResponse,
  Spinners,
  TssResponse,
} from "../../../types/trackCCTX.types";
import { handleError } from "../../../utils";
import type { ZetaChainClient } from "./client";

const apiFetch = async <T>(url: string) => {
  const response = await axios.get<T>(url);
  const isResponseOk = response.status >= 200 && response.status < 300;
  if (!isResponseOk) {
    throw new Error(`Fetch failed with status: ${response.status}`);
  }
  return response.data;
};

const fetchCCTXByInbound = async (
  hash: string,
  emitter: Emitter | null,
  spinners: Spinners,
  API: string,
  cctxs: CCTXs,
  json: boolean
) => {
  try {
    const url = `${API}/zeta-chain/crosschain/inTxHashToCctx/${hash}`;
    const apiResponseData = await apiFetch<InboundHashToCctxResponseReturnType>(
      url
    );
    const cctxIndex = apiResponseData?.inboundHashToCctx?.cctx_index;

    cctxIndex.forEach((hash) => {
      if (hash && !cctxs[hash] && !spinners[hash]) {
        cctxs[hash] = [];
        if (!json && emitter) {
          emitter?.emit("add", { hash, text: hash });
          spinners[hash] = true;
        }
      }
    });
  } catch (error: unknown) {
    handleError({
      context: "Something failed fetching CCTX By Inbound hash",
      error,
    });
  }
};

const getCCTX = async (hash: string, API: string) => {
  try {
    const url = `${API}/zeta-chain/crosschain/cctx/${hash}`;
    const apiResponseData = await apiFetch<CrossChainTxResponse>(url);
    return apiResponseData?.CrossChainTx;
  } catch (error: unknown) {
    handleError({ context: "Something failed fetching CCTX", error });
  }
};

const fetchNonces = async (API: string, TSS: string) => {
  try {
    const url = `${API}/zeta-chain/observer/pendingNonces`;
    const apiResponseData = await apiFetch<PendingNoncesResponse>(url);
    const nonces = apiResponseData?.pending_nonces;
    return nonces.filter((n) => n.tss === TSS);
  } catch (error: unknown) {
    handleError({ context: "Something failed fetching Nonces", error });
  }
};

const fetchTSS = async (API: string) => {
  try {
    const url = `${API}/zeta-chain/observer/TSS`;
    const apiResponseData = await apiFetch<TssResponse>(url);
    return apiResponseData?.TSS.tss_pubkey;
  } catch (error: unknown) {
    handleError({ context: "Something failed fetching TSS", error });
  }
};

// eslint-disable-next-line prefer-arrow/prefer-arrow-functions
const fetchCCTXData = async function (
  this: ZetaChainClient,
  hash: string,
  emitter: Emitter | null,
  spinners: Spinners,
  API: string,
  cctxs: CCTXs,
  pendingNonces: PendingNonce[],
  json: boolean
) {
  const cctx = await getCCTX(hash, API);

  if (!cctx) {
    throw new Error(`CCTX not found for hash: ${hash}`);
  }

  const receiver_chainId = cctx.outbound_params[0].receiver_chainId;
  const outbound_tx_hash = cctx.outbound_params[0].outbound_tx_hash;
  const confirmed_on_destination = false;

  const tx = {
    confirmed_on_destination,
    outbound_tx_hash,
    outbound_tx_tss_nonce: cctx.outbound_params[0].outbound_tx_tss_nonce,
    receiver_chainId,
    sender_chain_id: cctx.inbound_params.sender_chain_id,
    status: cctx.cctx_status.status,
    status_message: cctx.cctx_status.status_message,
  };

  const lastCCTX = cctxs[hash][cctxs[hash].length - 1];
  const isEmpty = cctxs[hash].length === 0;
  const statusDefined =
    tx.status !== undefined && tx.status_message !== undefined;

  if (isEmpty || (statusDefined && lastCCTX.status !== tx.status)) {
    cctxs[hash].push(tx);
    const sender = cctxs[hash]?.[0].sender_chain_id;
    const receiver = cctxs[hash]?.[0].receiver_chainId;
    let queue;
    if (pendingNonces) {
      const pending =
        pendingNonces.find((n) => n.chain_id === tx.receiver_chainId)
          ?.nonce_low || "0";
      const current = tx.outbound_tx_tss_nonce;
      const diff = current - Number(pending);
      queue = diff > 0 ? ` (${diff} in queue)` : "";
    }
    const path = cctxs[hash]
      .map(
        (x) => `${x.status} ${x.status_message && "(" + x.status_message + ")"}`
      )
      .join(" → ");
    const text = `${hash}: ${sender} → ${receiver}${queue}: ${path}`;

    if (!json && spinners[hash] && emitter) {
      const s = tx.status;
      if (s == "OutboundMined" || s == "Reverted") {
        emitter.emit("succeed", { hash, text });
        spinners[hash] = false;
      } else if (s == "Aborted") {
        emitter.emit("fail", { hash, text });
        spinners[hash] = false;
      } else {
        emitter.emit("update", { hash, text });
      }
    }
  }
};

export const trackCCTX = async function (
  this: ZetaChainClient,
  {
    hash,
    json = false,
    emitter = null,
  }: { emitter: Emitter | null; hash: string; json: boolean }
): Promise<CCTXs> {
  const spinners: Spinners = {};

  const API = this.getEndpoint("cosmos-http", `zeta_${this.network}`);
  const TSS = await fetchTSS(API);

  if (!TSS) {
    throw new Error("TSS not found");
  }

  return new Promise((resolve, reject) => {
    const cctxs: CCTXs = {};
    let pendingNonces: PendingNonce[] | undefined = [];

    const intervalID = setInterval(() => {
      void (async () => {
        try {
          pendingNonces = await fetchNonces(API, TSS);
          if (Object.keys(cctxs).length === 0) {
            if (!json && emitter) {
              const text = `Looking for cross-chain transactions (CCTXs) on ZetaChain...\n`;
              emitter.emit("search-add", { text });
              spinners["search"] = true;
            }
            await fetchCCTXByInbound(hash, emitter, spinners, API, cctxs, json);
          }
          if (
            Object.keys(cctxs).length === 0 &&
            !cctxs[hash] &&
            (await getCCTX(hash, API)) &&
            !cctxs[hash]
          ) {
            cctxs[hash] = [];
            if (!spinners[hash] && !json && emitter) {
              spinners[hash] = true;
              emitter.emit("add", { hash, text: hash });
              spinners[hash] = true;
            }
          }
          for (const txHash in cctxs) {
            await fetchCCTXByInbound(
              txHash,
              emitter,
              spinners,
              API,
              cctxs,
              json
            );
          }
          if (Object.keys(cctxs).length > 0 && pendingNonces) {
            if (spinners["search"] && !json && emitter) {
              emitter.emit("search-end", {
                text: `CCTXs on ZetaChain found.\n`,
              });
              spinners["search"] = false;
            }

            for (const hash in cctxs) {
              try {
                await fetchCCTXData.call(
                  this,
                  hash,
                  emitter,
                  spinners,
                  API,
                  cctxs,
                  pendingNonces,
                  json
                );
              } catch (error: unknown) {
                handleError({
                  context: "Something failed on Fetch CCTX call",
                  error,
                });
              }
            }
          }
          if (
            Object.keys(cctxs).length > 0 &&
            Object.keys(cctxs)
              .map((c) => {
                const last = cctxs[c][cctxs[c].length - 1];
                return last?.status;
              })
              .filter(
                (s) => !["OutboundMined", "Aborted", "Reverted"].includes(s)
              ).length === 0
          ) {
            const allOutboundMined = Object.keys(cctxs)
              .map((c) => {
                const last = cctxs[c][cctxs[c].length - 1];
                return last?.status;
              })
              .every((s) => s === "OutboundMined");

            clearInterval(intervalID);

            if (!allOutboundMined) {
              emitter?.emit("mined-fail", {
                cctxs,
              });
              reject(new Error("CCTX aborted or reverted"));
            } else {
              emitter?.emit("mined-success", {
                cctxs,
              });
              if (json) console.log(JSON.stringify(cctxs, null, 2));
              resolve(cctxs);
            }
          }
        } catch (error: unknown) {
          handleError({ context: "Error in interval", error });
          clearInterval(intervalID);
          reject(new Error("Error in interval"));
        }
      })();
    }, 3000);
  });
};
