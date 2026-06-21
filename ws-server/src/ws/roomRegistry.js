// Tracks which sockets on THIS server instance belong to which interview room.
// (Cross-instance fan-out is handled separately via Redis pub/sub.)
//
// rooms: Map<interviewId, Set<ws>>
const rooms = new Map();

export function addToRoom(interviewId, ws) {
  let set = rooms.get(interviewId);
  if (!set) {
    set = new Set();
    rooms.set(interviewId, set);
  }
  set.add(ws);
}

export function removeFromRoom(interviewId, ws) {
  const set = rooms.get(interviewId);
  if (!set) return;
  set.delete(ws);
  if (set.size === 0) rooms.delete(interviewId);
}

// Find a local socket in a room by its unique tag (or null if not here).
export function getRoomSocket(interviewId, tag) {
  const set = rooms.get(interviewId);
  if (!set) return null;
  for (const ws of set) {
    if (ws.__tag === tag) return ws;
  }
  return null;
}

// Send a message to every socket in a room on THIS instance.
// `exclude` is an optional ws to skip (usually the original sender).
export function broadcastLocal(interviewId, message, exclude = null) {
  const set = rooms.get(interviewId);
  if (!set) return;

  const data = JSON.stringify(message);
  for (const ws of set) {
    if (ws === exclude) continue;
    if (ws.readyState === ws.OPEN) {
      ws.send(data);
    }
  }
}
