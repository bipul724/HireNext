import { createClient } from "redis";
import { env } from "./env.js";
import { logger } from "../utils/logger.js";

// State client: read/write the editor document.
// reconnectStrategy keeps the client retrying after transient socket errors
// (EADDRNOTAVAIL, ECONNRESET, etc.) instead of giving up — capped exponential
// backoff. Duplicated clients (pub/sub) inherit these options.
export const redisClient = createClient({
  url: env.REDIS_URL,
  socket: {
    reconnectStrategy: (retries) => Math.min(retries * 200, 5000),
  },
});

// Pub/sub needs separate connections. A subscriber connection can't run
// normal commands, so publisher and subscriber must be distinct clients.
export const pubClient = redisClient.duplicate();
export const subClient = redisClient.duplicate();

for (const [name, client] of [
  ["state", redisClient],
  ["pub", pubClient],
  ["sub", subClient],
]) {
  client.on("error", (err) => logger.error(`Redis ${name} error:`, err.message));
}

export async function connectRedis() {
  await Promise.all([
    redisClient.connect(),
    pubClient.connect(),
    subClient.connect(),
  ]);
  logger.info("Redis connected (state + pub + sub)");
}
