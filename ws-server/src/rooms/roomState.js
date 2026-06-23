import { redisClient } from "../config/redis.js";

const roomKey = (interviewId) => `room:${interviewId}:doc`;
const usersKey = (interviewId) => `room:${interviewId}:users`;
const ROOM_TTL_SECONDS = 6 * 60 * 60; // 6h

const DEFAULT_DOC = {
  code: "// Write your solution here\n",
  language: "javascript",
  updatedAt: null,
};

export async function getRoomDoc(interviewId) {
  const raw = await redisClient.get(roomKey(interviewId));
  if (!raw) return { ...DEFAULT_DOC };
  try {
    return JSON.parse(raw);
  } catch {
    return { ...DEFAULT_DOC };
  }
}

export async function saveRoomDoc(interviewId, doc) {
  const payload = JSON.stringify({ ...doc, updatedAt: Date.now() });
  await redisClient.set(roomKey(interviewId), payload, { EX: ROOM_TTL_SECONDS });
}

const roomStatusKey = (interviewId) => `room:${interviewId}:status`;

const DEFAULT_STATUS = {
  interviewStatus: 'not_started',
  timerState: 'stopped',
  startedAt: null,
  pausedAt: null,
  elapsedTime: 0,
  editorLocked: false
};

export async function getRoomStatus(interviewId) {
  const raw = await redisClient.get(roomStatusKey(interviewId));
  let status = { ...DEFAULT_STATUS };
  if (raw) {
    try {
      status = JSON.parse(raw);
    } catch {}
  }
  return { ...status, serverTime: Date.now() };
}
/*
export async function updateRoomStatus(interviewId, mutateFn) {
  const key = roomStatusKey(interviewId);
  return await redisClient.executeIsolated(async (isolatedClient) => {
    while (true) {
      await isolatedClient.watch(key);
      const raw = await isolatedClient.get(key);
      let status = { ...DEFAULT_STATUS };
      if (raw) {
        try {
          status = JSON.parse(raw);
        } catch {}
      }
      
      const updatedStatus = mutateFn(status);
      if (!updatedStatus) {
        // Mutation rejected (state machine guard blocked it)
        await isolatedClient.unwatch();
        return { ...status, serverTime: Date.now() }; // Return unmutated
      }
      
      const payload = JSON.stringify(updatedStatus);
      const multi = isolatedClient.multi().set(key, payload, { EX: ROOM_TTL_SECONDS });
      const results = await multi.exec();
      
      if (results === null) {
        // Collision, watch key changed. Retry loop.
        continue;
      }
      
      return { ...updatedStatus, serverTime: Date.now() };
    }
  });
}*/

export async function updateRoomStatus(interviewId, mutateFn) {
  const key = roomStatusKey(interviewId);

  while (true) {
    await redisClient.watch(key);

    const raw = await redisClient.get(key);

    let status = { ...DEFAULT_STATUS };

    if (raw) {
      try {
        status = JSON.parse(raw);
      } catch {}
    }

    const updatedStatus = mutateFn(status);

    if (!updatedStatus) {
      await redisClient.unwatch();

      return {
        ...status,
        serverTime: Date.now(),
      };
    }

    const payload = JSON.stringify(updatedStatus);

    const multi = redisClient.multi();

    multi.set(key, payload, {
      EX: ROOM_TTL_SECONDS,
    });

    const result = await multi.exec();

    if (result === null) {
      // Another client modified the key.
      // Retry transaction.
      continue;
    }

    return {
      ...updatedStatus,
      serverTime: Date.now(),
    };
  }
}



// --- Coding Challenge Mode state -----------------------------------------
// Authoritative state for the active coding round, so it survives refresh,
// reconnect, and is visible to both candidate and interviewer.
const roomCodingKey = (interviewId) => `room:${interviewId}:coding`;

const DEFAULT_CODING = {
  phase: 'idle',     // 'idle' | 'presented' | 'coding' | 'ended'
  challenge: null,   // { title, description, difficulty, timeLimit }
  startedAt: null,   // server ms when the candidate began coding
};

export async function getRoomCoding(interviewId) {
  const raw = await redisClient.get(roomCodingKey(interviewId));
  let coding = { ...DEFAULT_CODING };
  if (raw) {
    try { coding = JSON.parse(raw); } catch {}
  }
  return { ...coding, serverTime: Date.now() };
}

export async function saveRoomCoding(interviewId, coding) {
  const payload = JSON.stringify({
    phase: coding.phase ?? 'idle',
    challenge: coding.challenge ?? null,
    startedAt: coding.startedAt ?? null,
  });
  await redisClient.set(roomCodingKey(interviewId), payload, { EX: ROOM_TTL_SECONDS });
}

// Remove coding state entirely. Called on genuine interview completion so a
// reopened interview link does not restore a stale challenge. Idempotent.
export async function clearRoomCoding(interviewId) {
  await redisClient.del(roomCodingKey(interviewId));
}

// Remove room status (timer/lock) on genuine interview completion. Idempotent.
export async function clearRoomStatus(interviewId) {
  await redisClient.del(roomStatusKey(interviewId));
}

// Remove the editor doc on genuine interview completion. Idempotent.
// Safe only AFTER the candidate's code has been fetched/persisted to
// interview-feedback (the canonical interview:complete path guarantees this);
// prevents a reopened link from restoring stale code via editor:init.
export async function clearRoomDoc(interviewId) {
  await redisClient.del(roomKey(interviewId));
}

// Atomic read-modify-write for coding state, mirroring updateRoomStatus().
// mutateFn(coding) returns the next state, or null to abort (no write).
// Guarantees no lost updates / stale overwrites across concurrent
// coding:present / coding:start / coding:end messages.
export async function updateRoomCoding(interviewId, mutateFn) {
  const key = roomCodingKey(interviewId);

  while (true) {
    await redisClient.watch(key);

    const raw = await redisClient.get(key);

    let coding = { ...DEFAULT_CODING };
    if (raw) {
      try { coding = JSON.parse(raw); } catch {}
    }

    const updated = mutateFn(coding);

    if (!updated) {
      // Guard rejected the transition — release the watch, write nothing.
      await redisClient.unwatch();
      return { ...coding, serverTime: Date.now() };
    }

    const payload = JSON.stringify({
      phase: updated.phase ?? 'idle',
      challenge: updated.challenge ?? null,
      startedAt: updated.startedAt ?? null,
    });

    const multi = redisClient.multi();
    multi.set(key, payload, { EX: ROOM_TTL_SECONDS });
    const result = await multi.exec();

    if (result === null) {
      // Another client modified the key mid-transaction — retry.
      continue;
    }

    return { ...updated, serverTime: Date.now() };
  }
}

const executionResultKey = (interviewId) => `room:${interviewId}:executionResult`;
const executionLockKey = (interviewId) => `room:${interviewId}:executionLock`;

export async function lockExecution(interviewId) {
  // Try to set lock with 30s expiration (NX ensures only one succeeds)
  const acquired = await redisClient.set(executionLockKey(interviewId), "LOCKED", { NX: true, EX: 30 });
  return acquired !== null;
}

export async function releaseExecution(interviewId) {
  await redisClient.del(executionLockKey(interviewId));
}

export async function getExecutionResult(interviewId) {
  const raw = await redisClient.get(executionResultKey(interviewId));
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export async function saveExecutionResult(interviewId, result) {
  const payload = JSON.stringify(result);
  await redisClient.set(executionResultKey(interviewId), payload, { EX: ROOM_TTL_SECONDS });
}

const presenceKey = (interviewId) => `room:${interviewId}:presence`;

export async function addPresence(interviewId, connectionId, userPayload) {
  const payload = JSON.stringify({ ...userPayload, joinedAt: Date.now() });
  
  // 1. Store connection metadata
  await redisClient.hSet(usersKey(interviewId), connectionId, payload);
  await redisClient.expire(usersKey(interviewId), ROOM_TTL_SECONDS);

  // 2. Add to presence ZSET with current timestamp
  await heartbeatPresence(interviewId, connectionId);
}

export async function heartbeatPresence(interviewId, connectionId) {
  await redisClient.zAdd(presenceKey(interviewId), [
    { score: Date.now(), value: connectionId }
  ]);
  await redisClient.expire(presenceKey(interviewId), ROOM_TTL_SECONDS);
}

export async function removePresence(interviewId, connectionId) {
  await redisClient.hDel(usersKey(interviewId), connectionId);
  await redisClient.zRem(presenceKey(interviewId), connectionId);
}

export async function getRoomPresence(interviewId) {
  // 1. Cleanup stale connections (older than 45 seconds)
  const staleThreshold = Date.now() - 45000;
  await redisClient.zRemRangeByScore(presenceKey(interviewId), '-inf', staleThreshold);

  // 2. Get active connection IDs
  const activeConnections = await redisClient.zRange(presenceKey(interviewId), 0, -1);
  if (activeConnections.length === 0) return {};

  // 3. Fetch metadata for active connections
  const rawUsers = await redisClient.hmGet(usersKey(interviewId), activeConnections);

  // 4. Aggregate by userId (to handle multi-tab correctly by identity)
  const aggregatedById = {};
  for (const raw of rawUsers) {
    if (!raw) continue;
    try {
      const user = JSON.parse(raw);
      if (user.userId) {
        aggregatedById[user.userId] = user;
      }
    } catch {
      // ignore malformed
    }
  }

  // 5. Emit payload keyed by email to preserve frontend contracts
  const finalPayload = {};
  for (const user of Object.values(aggregatedById)) {
    finalPayload[user.email] = {
      email: user.email,
      role: user.role
    };
  }

  return finalPayload;
}
