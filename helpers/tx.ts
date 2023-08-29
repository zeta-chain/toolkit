import { getEndpoints } from "@zetachain/networks";
import axios from "axios";
import clc from "cli-color";
import Spinnies from "spinnies";
import WebSocket from "ws";

const getEndpoint = (key: any): string => {
  const endpoint = getEndpoints(key, "zeta_testnet")[0]?.url;
  if (!endpoint) {
    throw new Error(`getEndpoints: ${key} endpoint not found`);
  }
  return endpoint;
};

const fetchCCTXByInbound = async (
  hash: string,
  spinnies: any,
  API: string,
  cctxList: any
) => {
  try {
    const url = `${API}/zeta-chain/crosschain/inTxHashToCctx/${hash}`;
    const apiResponse = await axios.get(url);
    const res = apiResponse?.data?.inTxHashToCctx?.cctx_index;
    res.forEach((cctxHash: any) => {
      if (cctxHash && !cctxList[cctxHash]) {
        cctxList[cctxHash] = [];
      }
      if (!spinnies.spinners[`spinner-${cctxHash}`]) {
        spinnies.add(`spinner-${cctxHash}`, {
          text: `${cctxHash}`,
        });
      }
    });
  } catch (error) {}
};

const SUBSCRIBE_MESSAGE = {
  id: 1,
  jsonrpc: "2.0",
  method: "subscribe",
  params: ["tm.event='NewBlock'"],
};

const fetchCCTXData = async (
  cctxHash: string,
  spinnies: any,
  API: string,
  cctxList: any
) => {
  const cctx = await getCCTX(cctxHash, API);
  const tx = {
    receiver_chainId: cctx.outbound_tx_params[0].receiver_chainId,
    sender_chain_id: cctx.inbound_tx_params.sender_chain_id,
    status: cctx.cctx_status.status,
    status_message: cctx.cctx_status.status_message,
  };
  const lastCCTX = cctxList[cctxHash][cctxList[cctxHash].length - 1];
  const isEmpty = cctxList[cctxHash].length === 0;
  if (isEmpty || lastCCTX?.status !== tx.status) {
    cctxList[cctxHash].push(tx);
    const sender = cctxList[cctxHash]?.[0].sender_chain_id;
    const receiver = cctxList[cctxHash]?.[0].receiver_chainId;
    const path = cctxList[cctxHash]
      .map(
        (x: any) =>
          `${clc.bold.underline(x.status)} ${
            x.status_message && "(" + x.status_message + ")"
          }`
      )
      .join(" → ");
    const text = {
      text: `${cctxHash}: ${sender} → ${receiver}: ${path}`,
    };
    const id = `spinner-${cctxHash}`;
    switch (tx.status) {
      case "OutboundMined":
      case "Reverted":
        spinnies.succeed(id, text);
        break;
      case "Aborted":
        spinnies.fail(id, text);
        break;
      default:
        spinnies.update(id, text);
        break;
    }
  }
};

const getCCTX = async (hash: string, API: string) => {
  try {
    const url = `${API}/zeta-chain/crosschain/cctx/${hash}`;
    const apiResponse = await axios.get(url);
    return apiResponse?.data?.CrossChainTx;
  } catch (e) {}
};

export const trackCCTX = async (inboundTxHash: string): Promise<void> => {
  const spinnies = new Spinnies();

  const API = getEndpoint("cosmos-http");
  const WSS = getEndpoint("tendermint-ws");

  return new Promise((resolve, reject) => {
    let cctxList: any = {};
    const socket = new WebSocket(WSS);
    socket.on("open", () => socket.send(JSON.stringify(SUBSCRIBE_MESSAGE)));
    socket.on("message", async () => {
      if (Object.keys(cctxList).length === 0) {
        spinnies.add(`search`, {
          text: `Looking for cross-chain transactions (CCTXs) on ZetaChain...\n`,
        });
        await fetchCCTXByInbound(inboundTxHash, spinnies, API, cctxList);
      }
      if ((await getCCTX(inboundTxHash, API)) && !cctxList[inboundTxHash]) {
        cctxList[inboundTxHash] = [];
        if (!spinnies.spinners[`spinner-${inboundTxHash}`]) {
          spinnies.add(`spinner-${inboundTxHash}`, {
            text: `${inboundTxHash}`,
          });
        }
      }
      await fetchCCTXByInbound(inboundTxHash, spinnies, API, cctxList);
      for (const txHash in cctxList) {
        await fetchCCTXByInbound(txHash, spinnies, API, cctxList);
      }
      if (Object.keys(cctxList).length > 0) {
        if (spinnies.spinners["search"]) {
          spinnies.succeed(`search`, {
            text: `CCTXs on ZetaChain found.\n`,
          });
        }
        for (const cctxHash in cctxList) {
          try {
            fetchCCTXData(cctxHash, spinnies, API, cctxList);
          } catch (error) {}
        }
      }
      if (
        Object.keys(cctxList).length > 0 &&
        Object.keys(cctxList)
          .map((c: any) => {
            const last = cctxList[c][cctxList[c].length - 1];
            return last?.status;
          })
          .filter((s) => !["OutboundMined", "Aborted", "Reverted"].includes(s))
          .length === 0
      ) {
        socket.close();
      }
    });
    socket.on("error", (error: any) => {
      reject(error);
    });
    socket.on("close", () => {
      resolve();
    });
  });
};
