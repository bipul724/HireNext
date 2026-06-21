import { pubClient, subClient } from "../config/redis.js";
import { env } from "../config/env.js";
import { broadcastLocal, getRoomSocket } from "./roomRegistry.js";
import { logger } from "../utils/logger.js";

// Single channel all instances publish to / subscribe from. Each envelope
// names its target room; every instance fans it out to its own local sockets.
const CHANNEL = "editor:broadcast";

// Publish a room message to ALL instances (ourselves included). We carry the
// sender's unique tag so each instance can skip echoing back to that socket.
export async function publishToRoom(interviewId, message, senderTag) {
  const envelope = {
    origin: env.INSTANCE_ID,
    interviewId,
    senderTag,
    message,
  };
  await pubClient.publish(CHANNEL, JSON.stringify(envelope));
}

// Subscribe once at startup; relay every incoming envelope to local sockets.
export async function startSubscriber() {
  await subClient.subscribe(CHANNEL, (raw) => {
    let envelope;
    try {
      envelope = JSON.parse(raw);
    } catch {
      return;
    }

    const { interviewId, message, senderTag } = envelope;

    // Exclude the original sender if that socket lives on THIS instance.
    const senderSocket = getRoomSocket(interviewId, senderTag);
    broadcastLocal(interviewId, message, senderSocket);
  });

  logger.info("Subscribed to Redis channel:", CHANNEL);
}
