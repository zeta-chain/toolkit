import axios from "axios";
import moment from "moment";
import ora from "ora";
import WebSocket from "ws";
import { getEndpoints } from "@zetachain/networks";

export const trackCCTX = (inboundTxHash: string): Promise<void> => {
  const API = getEndpoints("cosmos-http", "zeta_testnet")[2]?.url;
  if (API === undefined) {
    throw new Error("getEndpoints: API endpoint not found");
  }

  const WSS = getEndpoints("tendermint-ws", "zeta_testnet")[0]?.url;
  if (WSS === undefined) {
    throw new Error("getEndpoints: WSS endpoint not found");
  }

  return new Promise((resolve, reject) => {
    let cctx_index: string;
    let latest_status: string;

    const spinner = ora(
      "Looking for the cross-chain transaction (CCTX) on ZetaChain..."
    ).start();

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

    socket.on("message", async (data: any) => {
      const jsonData = JSON.parse(data);
      const blockHeight = jsonData?.result?.data?.value?.block?.header?.height;
      if (!cctx_index) {
        try {
          const url = `${API}/zeta-chain/crosschain/inTxHashToCctx/${inboundTxHash}`;
          const apiResponse = await axios.get(url);
          const res = apiResponse?.data?.inTxHashToCctx?.cctx_index;
          if (res) {
            cctx_index = res;
            spinner.succeed(`CCTX hash found: ${cctx_index}\n`);
            spinner.start(`Checking status of the CCTX...`);
          }
        } catch (error) {}
      } else {
        try {
          const url = `${API}/zeta-chain/crosschain/cctx/${cctx_index}`;
          const apiResponse = await axios.get(url);
          const cctx = apiResponse?.data?.CrossChainTx;
          const finalizedBlock =
            cctx?.inbound_tx_params?.inbound_tx_finalized_zeta_height;
          const pendingBlocks = blockHeight - finalizedBlock;
          const { status, status_message } = cctx.cctx_status;
          if (status != latest_status) {
            latest_status = status;
            spinner.info(`Status updated to "${status}": ${status_message}\n`);

            // Disabled until https://github.com/zeta-chain/node/issues/766 is
            // fixed
            //
            // if (status === "PendingOutbound" && pendingBlocks > 100) {
            //   const time = moment
            //     .duration(pendingBlocks * 5, "seconds")
            //     .humanize();
            //   spinner.warn(
            //     `CCTX is pending for too long (${pendingBlocks} blocks, about ${time})\n`
            //   );
            // }
            spinner.start(`Checking status of the CCTX...`);
            if (/^(Aborted|Reverted|OutboundMined)$/.test(status)) {
              socket.close();
              spinner.succeed("CCTX has been finalized on ZetaChain");
              resolve();
              return;
            }
          }
        } catch (error) {}
      }
    });

    socket.on("error", (error: any) => {
      spinner.fail(`WebSocket error: ${error}`);
      reject(error);
    });

    socket.on("close", () => {
      spinner.stop();
      resolve();
    });
  });
};
