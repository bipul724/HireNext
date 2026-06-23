import { randomUUID } from "crypto";
import { addToRoom, removeFromRoom, broadcastLocal } from "./roomRegistry.js";
import { publishToRoom } from "./pubsub.js";
import { getRoomDoc, saveRoomDoc, addPresence, removePresence, getRoomPresence, getRoomStatus, updateRoomStatus, lockExecution, releaseExecution, getExecutionResult, saveExecutionResult, getRoomCoding, updateRoomCoding, clearRoomCoding, clearRoomStatus, clearRoomDoc } from "../rooms/roomState.js";
import { executeCode } from "../utils/piston.js";
import { trackEvent } from "../utils/analytics.js";
import { saveSnapshot } from "../utils/snapshots.js";
import { logger } from "../utils/logger.js";

// Debounced Redis writes per room (don't hammer Redis on every keystroke).
const WRITE_DEBOUNCE_MS = 1000;
const pendingWrites = new Map(); // interviewId -> timer
const pendingDocs = new Map(); // interviewId -> latest doc awaiting persistence

function scheduleSave(interviewId, doc) {
  const existing = pendingWrites.get(interviewId);
  if (existing) clearTimeout(existing);
  // Remember the latest doc so an explicit flush can persist it immediately.
  pendingDocs.set(interviewId, doc);
  const timer = setTimeout(async () => {
    pendingWrites.delete(interviewId);
    pendingDocs.delete(interviewId);
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

// --- Coding Challenge validation -----------------------------------------
const VALID_DIFFICULTIES = new Set(["Easy", "Medium", "Hard"]);
const CODING_MIN_SECONDS = 300;    // 5 minutes
const CODING_MAX_SECONDS = 7200;   // 120 minutes

// Sanitize/clamp an incoming challenge payload. Returns a safe object or null
// if the payload is invalid (rejected). Prevents arbitrary timeLimit/difficulty
// and bounds string sizes.
function sanitizeChallenge(raw) {
  if (!raw || typeof raw.title !== "string" || !raw.title.trim()) return null;
  const timeLimit = Math.min(
    Math.max(Number(raw.timeLimit) || 1800, CODING_MIN_SECONDS),
    CODING_MAX_SECONDS
  );
  return {
    title: raw.title.trim().slice(0, 200),
    description: typeof raw.description === "string" ? raw.description.slice(0, 5000) : "",
    difficulty: VALID_DIFFICULTIES.has(raw.difficulty) ? raw.difficulty : "Medium",
    timeLimit,
  };
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

    // Restore any active coding challenge (survives refresh/reconnect).
    const coding = await getRoomCoding(interviewId);
    if (coding.phase && coding.phase !== "idle") {
      send(ws, "coding:sync", coding);
    }

    // 4. Announce arrival to everyone else (detached → has its own .catch)
    broadcastRoom(
      interviewId,
      { type: "presence:join", payload: { email: ws.email, role: ws.role } },
      ws.connectionId,
      ws
    ).catch((err) => logger.error(`[init] presence:join broadcast failed for ${interviewId}:`, err.message));
  })().catch((err) => {
    // A Redis failure during connection init must not become an unhandled
    // rejection. Log with context; the client can retry on reconnect.
    logger.error(`[init] connection init failed for interview:${interviewId} (${ws.email}):`, err.message);
  });

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

    try {
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

      case "editor:flush": {
        const payload = msg.payload || {};

        // Cancel any pending debounced write so we persist exactly once, now.
        const existing = pendingWrites.get(interviewId);
        if (existing) clearTimeout(existing);
        pendingWrites.delete(interviewId);

        try {
          // Prefer an explicit payload; otherwise persist the latest pending
          // editor:change, falling back to whatever is already stored. This
          // guarantees we always ack — even when the client flushes without a
          // payload (e.g. on interview end) — so the client never times out.
          let doc;
          if (typeof payload.code === "string" && typeof payload.language === "string") {
            doc = { code: payload.code, language: payload.language };
          } else {
            doc = pendingDocs.get(interviewId) || (await getRoomDoc(interviewId));
          }

          pendingDocs.delete(interviewId);

          await saveRoomDoc(interviewId, doc);
          send(ws, "editor:flush:ack", { success: true });
        } catch (err) {
          logger.error(`Flush saveRoomDoc failed for ${interviewId}:`, err.message);
          send(ws, "editor:flush:ack", { success: false, error: err.message });
        }
        break;
      }

      // --- Canonical interview completion ------------------------------
      // Sent by the client when the interview truly ends (candidate End, AI
      // completed, or duration expired). Clears this interview's realtime state
      // so a reopened link starts fresh. Idempotent and only sent at genuine
      // completion — never on reconnect/refresh — so active sessions are safe.
      case "interview:complete": {
        if (ws.role !== "candidate" && ws.role !== "interviewer") break;
        await clearRoomCoding(interviewId);
        await clearRoomStatus(interviewId);
        // Safe here: the client fetches/persists the code submission BEFORE
        // sending interview:complete, so clearing the doc only removes stale
        // live-editor state and prevents old code restoring on a reopen.
        await clearRoomDoc(interviewId);
        trackEvent(interviewId, ws.email, ws.role, "Interview Completed", { reason: msg.payload?.reason || "unknown" });
        break;
      }

      // --- Coding Challenge Mode ---------------------------------------
      // Authorization model: the coding round is driven by the AI tool-call,
      // which is received in the CANDIDATE's browser (there is no server-side
      // Vapi webhook). The candidate connection is therefore the legitimate
      // source; the interviewer may also drive it for oversight. Both are
      // authenticated room members (see auth.js). Integrity is enforced by the
      // state-machine guards + input validation below, NOT by role alone.
      case "coding:present":
      case "coding:start":
      case "coding:end": {
        if (ws.role !== "candidate" && ws.role !== "interviewer") break;

        if (msg.type === "coding:present") {
          // Fix #2: validate + clamp the payload (reject arbitrary values).
          const challenge = sanitizeChallenge(msg.payload?.challenge);
          if (!challenge) break;

          let changed = false;
          const result = await updateRoomCoding(interviewId, (coding) => {
            // Don't wipe an in-progress round; allow (re)present only when
            // idle / ended / already presented.
            if (coding.phase === "coding") return null;
            changed = true;
            return { phase: "presented", challenge, startedAt: null };
          });

          if (changed) {
            await broadcastRoom(interviewId, { type: "coding:sync", payload: result }, ws.connectionId, null);
            trackEvent(interviewId, ws.email, ws.role, "Coding Challenge Presented", { title: challenge.title, difficulty: challenge.difficulty });
          }
          break;
        }

        if (msg.type === "coding:start") {
          // Fix #1: only presented -> coding, exactly once. startedAt is set
          // once and never overwritten (no timer reset / extension).
          let started = false;
          const result = await updateRoomCoding(interviewId, (coding) => {
            if (coding.phase !== "presented" || !coding.challenge) return null;
            started = true;
            return { phase: "coding", challenge: coding.challenge, startedAt: Date.now() };
          });

          if (started) {
            await broadcastRoom(interviewId, { type: "coding:sync", payload: result }, ws.connectionId, null);
            trackEvent(interviewId, ws.email, ws.role, "Coding Challenge Started", { title: result.challenge?.title });
          }
          break;
        }

        // coding:end — only from an active/presented round.
        let ended = false;
        const result = await updateRoomCoding(interviewId, (coding) => {
          if (coding.phase !== "coding" && coding.phase !== "presented") return null;
          ended = true;
          return { phase: "ended", challenge: coding.challenge, startedAt: coding.startedAt };
        });

        if (ended) {
          await broadcastRoom(interviewId, { type: "coding:sync", payload: result }, ws.connectionId, null);
          trackEvent(interviewId, ws.email, ws.role, "Coding Challenge Ended", { title: result.challenge?.title });
        }
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
            getRoomDoc(interviewId)
              .then(doc => saveSnapshot(interviewId, ws.email, doc.code, doc.language, 'Interview Started'))
              .catch(err => logger.error(`[timer:start] snapshot getRoomDoc failed for ${interviewId}:`, err.message));
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
            getRoomDoc(interviewId)
              .then(doc => saveSnapshot(interviewId, ws.email, doc.code, doc.language, 'Interview Ended'))
              .catch(err => logger.error(`[timer:end] snapshot getRoomDoc failed for ${interviewId}:`, err.message));
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

        // Interview genuinely ended (interviewer pressed End) → drop any coding
        // state so a reopened link can't restore a stale challenge. timer:end is
        // never sent on reconnect/refresh, so active sessions are never affected.
        if (msg.type === "timer:end" && newStatus.interviewStatus === "ended") {
          await clearRoomCoding(interviewId);
        }
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
    } catch (err) {
      // Any Redis (or other) failure inside a message handler is caught here so a
      // transient disconnect can't produce an unhandled rejection or kill the
      // server. The socket stays open; the client retries on the next message.
      logger.error(`[message] handler failed (interview:${interviewId}, type:${msg?.type}):`, err.message);
    }
  });

  ws.on("close", async () => {
    removeFromRoom(interviewId, ws);

    try {
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
        ).catch((err) => logger.error(`[close] presence:leave broadcast failed for ${interviewId}:`, err.message));
        logger.info(`${ws.email} completely left interview:${interviewId}`);
        trackEvent(interviewId, ws.email, ws.role, `${ws.role === 'candidate' ? 'Candidate' : 'Interviewer'} Left`);
      } else {
        logger.info(`${ws.email} closed one tab, but is still online in interview:${interviewId}`);
      }
    } catch (err) {
      // Redis failure during disconnect cleanup must not crash the server.
      logger.error(`[close] cleanup failed for interview:${interviewId} (${ws.email}):`, err.message);
    }
  });

  ws.on("error", (err) => {
    logger.error(`socket error (${ws.email}):`, err.message);
  });
}
