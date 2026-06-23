import http from "http";
import { createApp } from "./app.js";
import { initWebSocket } from "./ws/server.js";
import { connectRedis } from "./config/redis.js";
import { env } from "./config/env.js";
import { logger } from "./utils/logger.js";

// Global safety net: a transient Redis disconnect rejects in-flight command
// promises. Without this, Node escalates an unhandled rejection to an uncaught
// exception and kills the server. We log and KEEP RUNNING — the Redis client
// reconnects on its own (see config/redis.js reconnectStrategy).
process.on("unhandledRejection", (reason) => {
  logger.error("Unhandled promise rejection (keeping process alive):", reason?.message || reason);
});
process.on("uncaughtException", (err) => {
  logger.error("Uncaught exception (keeping process alive):", err?.message || err);
});

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
