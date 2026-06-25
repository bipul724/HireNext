import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

// Enforce strict rate-limiting configuration.
// If Redis credentials are missing in production, this will throw 
// immediately upon instantiation and crash the startup/request, 
// preventing silent fail-open.
const redisUrl = process.env.UPSTASH_REDIS_REST_URL;
const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN;

if (!redisUrl || !redisToken) {
  if (process.env.NODE_ENV === "production") {
    throw new Error("UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN are required in production for rate limiting.");
  }
}

export const aiRateLimit = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(5, "1 m"),
  analytics: true,
});
