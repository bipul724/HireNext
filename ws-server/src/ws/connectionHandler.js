import { randomUUID } from "crypto";
import { addToRoom, removeFromRoom, broadcastLocal } from "./roomRegistry.js";
import { publishToRoom } from "./pubsub.js";
import { getRoomDoc, saveRoomDoc, addPresence, removePresence, getRoomPresence, getRoomStatus, updateRoomStatus, lockExecution, releaseExecution, getExecutionResult, saveExecutionResult } from "../rooms/roomState.js";
import { executeCode } from "../utils/piston.js";
import { trackEvent } from "../utils/analytics.js";
import { saveSnapshot } from "../utils/snapshots.js";
import { logger } from "../utils/logger.js";

// Debounced Redis writes per room (don't hammer Redis on every keystroke).
const WRITE_DEBOUNCE_MS = 1000;
const pendingWrites = new Map(); // interviewId -> timer

function scheduleSave(interviewId, doc) {
  const existing = pendingWrites.get(interviewId);
  if (existing) clearTimeout(existing);
  const timer = setTimeout(async () => {
    pendingWrites.delete(interviewId);
    try {
      await saveRoomDoc(interviewId, doc);
    } catch (err) {
      logger.error(`saveRoomDoc failed for ${interviewId}:`, err.message);
    }
  }, WRITE_DEBOUNCE_MS);
  pendingWrites.set(interviewId, timer);
}

function send(ws, type, payload) {
  if (ws.readyState === ws.OPEN) {
    ws.send(JSON.stringify({ type, payload }));
  }
}

// Broadcast a message to the whole room: local sockets + other instances.
async function broadcastRoom(interviewId, message, senderTag, senderWs) {
  broadcastLocal(interviewId, message, senderWs); // this instance
  await publishToRoom(interviewId, message, senderTag); // other instances
}

export function handleConnection(ws, ctx) {
  const { user, interviewId, role } = ctx;

  // 1. Store metadata directly on the websocket instance
  ws.connectionId = randomUUID();
  ws.userId = user.id || user.email; // Fallback if no ID
  ws.email = user.email;
  ws.interviewId = interviewId;
  ws.role = role;
  ws.isAlive = true; // heartbeat flag

  addToRoom(interviewId, ws);
  logger.info(`${ws.email} (${ws.role}) joined interview:${interviewId} on conn:${ws.connectionId}`);

  // Async initialization (code and presence sync)
  (async () => {
    // 1. Check existing presence for deduplication
    const currentPresence = await getRoomPresence(interviewId);
    if (!currentPresence[ws.email]) {
      trackEvent(interviewId, ws.email, ws.role, `${ws.role === 'candidate' ? 'Candidate' : 'Interviewer'} Joined`);
    }

    // 2. Add connection to Redis presence ZSET/HASH
    await addPresence(interviewId, ws.connectionId, { userId: ws.userId, email: ws.email, role: ws.role });

    // 2. Fetch full room state (Code + Aggregated Presence + Room Status + Last Execution)
    const [doc, users, status, executionResult] = await Promise.all([
      getRoomDoc(interviewId),
      getRoomPresence(interviewId),
      getRoomStatus(interviewId),
      getExecutionResult(interviewId)
    ]);

    // 3. Send state to the newly connected client
    send(ws, "editor:init", doc);
    send(ws, "presence:sync", users);
    send(ws, "room:sync", status);
    if (executionResult) {
      send(ws, "code:result", executionResult);
    }

    // 4. Announce arrival to everyone else
    broadcastRoom(
      interviewId,
      { type: "presence:join", payload: { email: ws.email, role: ws.role } },
      ws.connectionId,
      ws
    );
  })();

  ws.on("pong", () => {
    ws.isAlive = true;
  });

  ws.on("message", async (raw) => {
    let msg;
    try {
      msg = JSON.parse(raw.toString());
    } catch {
      return; // ignore malformed
    }

    switch (msg.type) {
      case "editor:change": {
        const payload = msg.payload || {};
        if (typeof payload.code !== "string") return;

        // P0: Server-Side Lock Enforcement
        if (ws.role === "candidate") {
          const status = await getRoomStatus(interviewId);
          if (status.editorLocked) {
            logger.warn(`[SECURITY] Rejected editor:change from locked candidate ${ws.email}`);
            return;
          }
        }

        const doc = {
          code: payload.code,
          language: payload.language || "javascript",
        };

        await broadcastRoom(
          interviewId,
          { type: "editor:change", payload: { ...doc, from: ws.email } },
          ws.connectionId,
          ws
        );
        
        // Track language changes
        if (payload.language && payload.language !== "javascript") { // basic check, better to check previous state but this works for explicit payloads that include language
          // Actually, we should check if language actually changed by fetching doc, but that's expensive.
          // Let's just assume if it's sent, it's the current language. We'll track it with metadata.
          trackEvent(interviewId, ws.email, ws.role, 'Language Changed', { language: payload.language });
        }

        scheduleSave(interviewId, doc);
        break;
      }

      case "editor:cursor": {
        // P0: Server-Side Lock Enforcement
        if (ws.role === "candidate") {
          const status = await getRoomStatus(interviewId);
          if (status.editorLocked) return;
        }

        await broadcastRoom(
          interviewId,
          {
            type: "editor:cursor",
            payload: { email: ws.email, pos: msg.payload?.pos },
          },
          ws.connectionId,
          ws
        );
        break;
      }

      case "timer:start":
      case "timer:pause":
      case "timer:resume":
      case "timer:end":
      case "room:lock":
      case "room:unlock": {
        if (ws.role !== "interviewer") {
          logger.warn(`Unauthorized attempt by candidate ${ws.email} to execute ${msg.type}`);
          return;
        }

        // P0: Timer State Machine & P1: Redis Concurrency
        const newStatus = await updateRoomStatus(interviewId, (status) => {
          const now = Date.now();
          const mutated = { ...status };
          let changed = false;

          if (msg.type === "timer:start" && status.timerState !== "running") {
            mutated.interviewStatus = "running";
            mutated.timerState = "running";
            mutated.startedAt = now;
            mutated.pausedAt = null;
            changed = true;
            trackEvent(interviewId, ws.email, ws.role, 'Interview Started');
            getRoomDoc(interviewId).then(doc => saveSnapshot(interviewId, ws.email, doc.code, doc.language, 'Interview Started'));
          } else if (msg.type === "timer:pause" && status.timerState === "running") {
            mutated.timerState = "paused";
            mutated.pausedAt = now;
            mutated.elapsedTime += (now - status.startedAt);
            changed = true;
            trackEvent(interviewId, ws.email, ws.role, 'Interview Paused');
          } else if (msg.type === "timer:resume" && status.timerState === "paused") {
            mutated.timerState = "running";
            mutated.startedAt = now;
            mutated.pausedAt = null;
            changed = true;
            trackEvent(interviewId, ws.email, ws.role, 'Interview Resumed');
          } else if (msg.type === "timer:end" && status.interviewStatus !== "ended") {
            if (status.timerState === "running") {
              mutated.elapsedTime += (now - status.startedAt);
            }
            mutated.interviewStatus = "ended";
            mutated.timerState = "stopped";
            mutated.startedAt = null;
            mutated.pausedAt = null;
            changed = true;
            trackEvent(interviewId, ws.email, ws.role, 'Interview Ended');
            getRoomDoc(interviewId).then(doc => saveSnapshot(interviewId, ws.email, doc.code, doc.language, 'Interview Ended'));
          } else if (msg.type === "room:lock" && !status.editorLocked) {
            mutated.editorLocked = true;
            changed = true;
            trackEvent(interviewId, ws.email, ws.role, 'Editor Locked');
          } else if (msg.type === "room:unlock" && status.editorLocked) {
            mutated.editorLocked = false;
            changed = true;
            trackEvent(interviewId, ws.email, ws.role, 'Editor Unlocked');
          }

          return changed ? mutated : null; // Return null to abort mutation
        });
        
        await broadcastRoom(
          interviewId,
          { type: "room:sync", payload: newStatus },
          ws.connectionId,
          ws
        );
        break;
      }

      case "code:run": {
        const payload = msg.payload || {};
        const { code, language } = payload;
        
        // P0: Payload Validation
        if (typeof code !== "string" || typeof language !== "string") return;
        if (code.length > 50000) {
          logger.warn(`[SECURITY] Rejected oversized code execution from ${ws.email}`);
          return;
        }

        const validLanguages = ["javascript", "typescript", "python", "java", "cpp", "c"];
        if (!validLanguages.includes(language)) {
          logger.warn(`[SECURITY] Rejected invalid language ${language} from ${ws.email}`);
          return;
        }

        // P0: Execution Lock
        const locked = await lockExecution(interviewId);
        if (!locked) {
          logger.warn(`[EXECUTION] Dropped duplicate execution request for ${interviewId}`);
          return;
        }

        // P1: Execution IDs
        const executionId = randomUUID();

        // Broadcast running state so everyone sees the spinner
        await broadcastRoom(
          interviewId,
          { type: "code:running", payload: { by: ws.email, executionId } },
          null, // broadcast to sender too
          ws
        );
        trackEvent(interviewId, ws.email, ws.role, 'Code Execution Started', { language, executionId });

        try {
          const startMs = Date.now();
          const result = await executeCode(language, code);
          const executionTime = Date.now() - startMs;

          const executionResult = {
            stdout: result.run?.stdout || "",
            stderr: result.run?.stderr || "",
            exitCode: result.run?.code || 0,
            executionTime,
            by: ws.email,
            executionId
          };

          // P1: Persistence
          await saveExecutionResult(interviewId, executionResult);

          await broadcastRoom(
            interviewId,
            { type: "code:result", payload: executionResult },
            null,
            ws
          );

          trackEvent(interviewId, ws.email, ws.role, result.run?.code === 0 ? 'Code Execution Succeeded' : 'Code Execution Failed', { 
            exitCode: result.run?.code || 0, 
            executionTime, 
            executionId 
          });

          if (result.run?.code === 0) {
            saveSnapshot(interviewId, ws.email, code, language, 'Execution Succeeded');
          }
        } catch (error) {
          logger.error(`Code execution failed for ${ws.email}:`, error.message);
          
          const errorResult = {
            stdout: "",
            stderr: `Execution System Error: ${error.message}`,
            exitCode: 1,
            executionTime: 0,
            by: ws.email,
            executionId
          };

          // P1: Persistence of failures
          await saveExecutionResult(interviewId, errorResult);

          await broadcastRoom(
            interviewId,
            { type: "code:result", payload: errorResult },
            null,
            ws
          );
          trackEvent(interviewId, ws.email, ws.role, 'Code Execution Failed', { 
            error: error.message, 
            executionId 
          });
        } finally {
          // P1: Failure Recovery
          await releaseExecution(interviewId);
        }
        break;
      }

      default:
        // Unknown type — ignore.
        break;
    }
  });

  ws.on("close", async () => {
    removeFromRoom(interviewId, ws);
    
    // 1. Remove this specific connection from Redis
    await removePresence(interviewId, ws.connectionId);
    
    // 2. Check if the user has any OTHER connections still active
    const currentPresence = await getRoomPresence(interviewId);
    
    // 3. If the user is truly gone, broadcast the leave event
    if (!currentPresence[ws.email]) {
      broadcastRoom(
        interviewId,
        { type: "presence:leave", payload: { email: ws.email, role: ws.role } },
        ws.connectionId,
        ws
      );
      logger.info(`${ws.email} completely left interview:${interviewId}`);
      trackEvent(interviewId, ws.email, ws.role, `${ws.role === 'candidate' ? 'Candidate' : 'Interviewer'} Left`);
    } else {
      logger.info(`${ws.email} closed one tab, but is still online in interview:${interviewId}`);
    }
  });

  ws.on("error", (err) => {
    logger.error(`socket error (${ws.email}):`, err.message);
  });
}
