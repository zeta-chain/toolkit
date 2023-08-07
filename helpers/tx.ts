import { getEndpoints } from "@zetachain/networks";
import axios from "axios";
import WebSocket from "ws";
import Spinnies from "spinnies";
import clc from "cli-color";

export const trackCCTX = async (inboundTxHash: string): Promise<void> => {
  const spinnies = new Spinnies();

  const API = getEndpoints("cosmos-http", "zeta_testnet")[0]?.url;
  if (API === undefined) {
    throw new Error("getEndpoints: API endpoint not found");
  }
  const WSS = getEndpoints("tendermint-ws", "zeta_testnet")[0]?.url;
  if (WSS === undefined) {
    throw new Error("getEndpoints: WSS endpoint not found");
  }
  return new Promise((resolve, reject) => {
    let cctxList: any = {};
    const socket = new WebSocket(WSS);
    socket.on("open", () => {
      const subscribeMessage = {
        id: 1,
        jsonrpc: "2.0",
        method: "subscribe",
        params: ["tm.event='NewBlock'"],
      };
      socket.send(JSON.stringify(subscribeMessage));
    });
    socket.on("message", async () => {
      const fetchCCTX = async (hash: string) => {
        try {
          const url = `${API}/zeta-chain/crosschain/inTxHashToCctx/${hash}`;
          const apiResponse = await axios.get(url);
          const res = apiResponse?.data?.inTxHashToCctx?.cctx_index;
          if (res) {
            if (!cctxList[res]) {
              cctxList[res] = [];
            }
          }
          if (!spinnies.spinners[`spinner-${res}`]) {
            spinnies.add(`spinner-${res}`, {
              text: `${res}`,
            });
          }
        } catch (error) {}
      };
      if (Object.keys(cctxList).length === 0) {
        spinnies.add(`search`, {
          text: `Looking for cross-chain transactions (CCTXs) on ZetaChain...\n`,
        });
        await fetchCCTX(inboundTxHash);
      }
      if (Object.keys(cctxList).length > 0) {
        spinnies.succeed(`search`, {
          text: `CCTXs on ZetaChain found.\n`,
        });
      }
      for (const txHash in cctxList) {
        await fetchCCTX(txHash);
      }
      if (Object.keys(cctxList).length > 0) {
        for (const cctxHash in cctxList) {
          try {
            const url = `${API}/zeta-chain/crosschain/cctx/${cctxHash}`;
            const apiResponse = await axios.get(url);
            const cctx = apiResponse?.data?.CrossChainTx;
            const { status, status_message } = cctx.cctx_status;
            const { sender_chain_id } = cctx.inbound_tx_params;
            const { receiver_chainId } = cctx.outbound_tx_params[0];
            const tx = {
              status,
              status_message,
              sender_chain_id,
              receiver_chainId,
            };
            const lastCCTX = cctxList[cctxHash][cctxList[cctxHash].length - 1];
            const isEmpty = cctxList[cctxHash].length === 0;
            if (isEmpty || lastCCTX?.status !== status) {
              cctxList[cctxHash].push(tx);
              const sender = cctxList[cctxHash]?.[0].sender_chain_id;
              const receiver = cctxList[cctxHash]?.[0].receiver_chainId;
              const path = cctxList[cctxHash]
                .map(
                  (x) =>
                    `${clc.bold.underline(x.status)} ${
                      x.status_message && "(" + x.status_message + ")"
                    }`
                )
                .join(" → ");
              const text = {
                text: `${cctxHash}: ${sender} → ${receiver}: ${path}`,
              };
              const id = `spinner-${cctxHash}`;
              switch (status) {
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
