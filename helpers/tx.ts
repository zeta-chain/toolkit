import axios from "axios";
import ora from "ora";
import WebSocket from "ws";

const URL = {
  API: "https://zetachain-athens.blockpi.network/lcd/v1/public/zeta-chain/crosschain",
  WSS: "wss://zetachain-athens.blockpi.network/rpc/v1/public/websocket",
};

export const trackCCTX = (inboundTxHash: string): Promise<void> => {
  return new Promise((resolve, reject) => {
    let cctx_index: string;
    let latest_status: string;

    const spinner = ora(
      "Looking for the cross-chain transaction (CCTX) on ZetaChain..."
    ).start();

    const socket = new WebSocket(URL.WSS);

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
      if (!cctx_index) {
        try {
          const url = `${URL.API}/inTxHashToCctx/${inboundTxHash}`;
          const apiResponse = await axios.get(url);
          const res = apiResponse?.data?.inTxHashToCctx?.cctx_index;
          if (res) {
            cctx_index = res;
            spinner.succeed(`CCTX hash found: ${cctx_index}\n`);
            spinner.start("Checking status of the CCTX...");
          }
        } catch (error) {}
      } else {
        try {
          const url = `${URL.API}/cctx/${cctx_index}`;
          const apiResponse = await axios.get(url);
          const cctx = apiResponse?.data?.CrossChainTx;
          const { status, status_message } = cctx.cctx_status;
          if (status != latest_status) {
            latest_status = status;
            spinner.info(`Status updated to "${status}": ${status_message}\n`);
            spinner.start("Checking status of the CCTX...");
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
