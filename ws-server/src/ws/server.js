import { WebSocketServer } from "ws";
import { authenticateUpgrade } from "./auth.js";
import { handleConnection } from "./connectionHandler.js";
import { startSubscriber } from "./pubsub.js";
import { logger } from "../utils/logger.js";

const HEARTBEAT_INTERVAL_MS = 30000;

export async function initWebSocket(httpServer) {
  // noServer: we handle the HTTP upgrade ourselves so we can authenticate
  // BEFORE accepting the socket.
  const wss = new WebSocketServer({ noServer: true });

  // Start the cross-instance subscriber.
  await startSubscriber();

  httpServer.on("upgrade", async (request, socket, head) => {
    const auth = await authenticateUpgrade(request);

    if (!auth.ok) {
      // Map custom codes to standard HTTP status strings
      const statusStr = 
        auth.code === 4404 ? "404 Not Found" :
        auth.code === 4403 ? "403 Forbidden" :
        auth.code === 4400 ? "400 Bad Request" :
        "401 Unauthorized";

      // Reject the upgrade with an HTTP error before the socket opens.
      socket.write(`HTTP/1.1 ${statusStr}\r\nConnection: close\r\n\r\n`);
      socket.destroy();
      logger.warn(`Rejected ws upgrade: ${auth.code} ${auth.reason}`);
      return;
    }

    wss.handleUpgrade(request, socket, head, (ws) => {
      handleConnection(ws, {
        user: auth.user,
        interviewId: auth.interviewId,
        role: auth.role,
      });
    });
  });

  // Heartbeat: ping all clients periodically; terminate any that didn't pong.
  const interval = setInterval(() => {
    for (const ws of wss.clients) {
      if (ws.isAlive === false) {
        ws.terminate();
        continue;
      }
      ws.isAlive = false;
      ws.ping();
      
      // Update ZSET presence score
      if (ws.interviewId && ws.connectionId) {
        import("../rooms/roomState.js")
          .then(({ heartbeatPresence }) => heartbeatPresence(ws.interviewId, ws.connectionId))
          .catch(err => logger.error("Heartbeat update failed:", err.message));
      }
    }
  }, HEARTBEAT_INTERVAL_MS);

  wss.on("close", () => clearInterval(interval));

  logger.info("WebSocket server initialized (noServer + heartbeat)");
  return wss;
}
