import http from "http";
import { createApp } from "./app.js";
import { initWebSocket } from "./ws/server.js";
import { connectRedis } from "./config/redis.js";
import { env } from "./config/env.js";
import { logger } from "./utils/logger.js";

async function start() {
  await connectRedis();

  const app = createApp();
  const httpServer = http.createServer(app);

  // Attach the raw WebSocket server to the same HTTP server.
  await initWebSocket(httpServer);

  httpServer.listen(env.PORT, () => {
    logger.info(`ws-server (raw ws) listening on port ${env.PORT}`);
    logger.info(`instance id: ${env.INSTANCE_ID}`);
  });
}

start().catch((err) => {
  logger.error("Failed to start ws-server:", err);
  process.exit(1);
});
