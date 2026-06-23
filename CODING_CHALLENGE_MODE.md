# Coding Challenge Mode — Implementation

A first-class, HackerRank/CoderPad-style coding round, built to fit the existing HireNext architecture (Vapi voice + raw-WebSocket/Redis editor + Zustand + Monaco).

---

## 1. Architecture Analysis (as-is)

| Subsystem | How it works today | What we reused |
|---|---|---|
| **Vapi** | Client-only (`@vapi-ai/web@2.5.2`) in `start/page.jsx`. Events: `message`, `call-start/end`, `speech-*`, `error`. `message` carries `tool-calls`/`function-call`. **No server webhook.** | A **client-side function tool** → the model emits a structured `tool-calls` message we parse. No keyword matching. |
| **Realtime editor** | Raw WS singleton (`lib/websocket/client.js`) ↔ `ws-server`. Redis room state (`room:{id}:doc|status|...`). Server-authoritative timer via `startedAt` + `serverTime` offset. Reconnect re-syncs via `editor:init`/`room:sync`. | Same pattern: new `coding:*` events + `room:{id}:coding` Redis key + `coding:sync` on (re)connect. |
| **Monaco** | `monaco-workspace.jsx` holds `editorRef`; code synced through `use-editor-store`. | Registered the instance in the store for imperative focus; added a focus/reveal effect. |
| **Zustand** | `use-editor/room/presence/execution-store`; `event-registry.js` routes WS → stores. | New `use-coding-store`; new `coding:sync` route. |
| **Page layout** | Header + voice column + editor column (`WebSocketProvider`, technical only). | Modal at page level; pinned panel inside the editor column; "CODING" header badge. |
| **Timers** | Interview timer in `use-room-store` (server-authoritative). | Coding timer mirrors that exact pattern (offset + `startedAt`). |

**State decision:** Zustand (`use-coding-store`). The challenge is detected at the page level (Vapi handler) but rendered inside the editor column (a different provider subtree) — a singleton store crosses that boundary, exactly like the existing stores. Local state can't reach both; context would duplicate the existing Zustand pattern.

**Persistence decision:** **Redis room state + WS broadcast** (authoritative), restored via `coding:sync` on connect. Chosen because it already is the room source of truth, survives refresh/reconnect/network loss, and makes the round visible to the interviewer too. *sessionStorage* was rejected (redundant, risks divergence from the authoritative server state). *DB* was rejected (this is ephemeral round state; the final code submission is already persisted to `interview-feedback`). The 6h `ROOM_TTL_SECONDS` covers any interview length.

**Sync decision:** Goes through the WebSocket + Redis (not local-only). The server stamps the authoritative `startedAt`, so the timer is correct across refresh, reconnect, and on a second device (interviewer).

---

## 2. Files Modified / Added

**New**
- `web/store/use-coding-store.js` — coding state + optimistic actions + `syncCoding`.
- `web/components/editor/coding-challenge-modal.jsx` — "Coding Challenge Started" modal + Start Coding.
- `web/components/editor/coding-challenge-panel.jsx` — pinned panel above Monaco + live timer.

**Modified**
- `web/store/use-editor-store.js` — register the Monaco instance (`editor`/`setEditor`).
- `web/lib/websocket/event-registry.js` — route `coding:sync` → store.
- `web/components/editor/monaco-workspace.jsx` — register editor, render panel, focus/reveal on coding start.
- `web/app/interview/[interview_id]/start/page.jsx` — Vapi tools + prompt, `tool-calls` parsing, modal render, header "CODING" badge, session reset.
- `ws-server/src/rooms/roomState.js` — `getRoomCoding` / `saveRoomCoding` (`room:{id}:coding`).
- `ws-server/src/ws/connectionHandler.js` — `coding:present/start/end` handlers + initial `coding:sync`.

---

## 3–7. Implementation Highlights

### Vapi tools (structured event, no keyword matching) — `startCall()`
Two function tools are attached **only for Technical interviews**:
```js
present_coding_challenge({ title, description, difficulty, timeLimit })
end_coding_challenge()
```
The system prompt instructs the model to call `present_coding_challenge` *before* describing the problem aloud, to stay quiet while the candidate codes, then call `end_coding_challenge` and ask follow-ups.

### Parsing the tool-call — `handleMessage()`
`extractToolCall(message)` handles both the current `tool-calls` shape (`toolCallList`/`toolCalls` → `function.{name,arguments}`, arguments JSON-parsed) and the legacy `function-call` shape. On `present_coding_challenge` it updates the store optimistically and sends `coding:present` over the WS; on `end_coding_challenge` it ends and sends `coding:end`.

### State + timer (server-authoritative)
- `coding:present` → Redis `phase:'presented'` → modal shows.
- Candidate clicks **Start Coding** → `coding:start` → server stamps `startedAt = Date.now()` → broadcast `coding:sync`.
- Panel computes `timeLeft = timeLimit − (now + serverTimeOffset − startedAt)`, ticking each second; turns red under 60s; auto-sends `coding:end` once at zero.
- On refresh/reconnect, `connectionHandler` sends `coding:sync` with the stored `startedAt` → the timer resumes exactly where it should (no drift, no reset).

### Monaco focus — `monaco-workspace.jsx`
On `phase === 'coding'`: `editor.focus()`, `revealLine(1)`, `setPosition({lineNumber:1,column:1})`, and scroll into view. The instance is registered via `setEditor` on mount.

### UX
- Page-level **modal** (accessible: `role="dialog"`, `aria-modal`, labelled, autofocuses Start), mobile responsive, matches the indigo/blue design system.
- **Pinned panel** above Monaco: title, difficulty chip, live countdown, scrollable statement, collapsible.
- Header **"CODING"** badge for clear mode distinction; subtle `animate-in` transitions.

---

## 8–9. Persistence & WebSocket Sync (recommended production architecture)

Authoritative state lives in Redis (`room:{id}:coding`) and is the single source of truth. Clients hold a mirror in Zustand. All transitions go through the WS server, which stamps server time and broadcasts `coding:sync` to **all** sockets (candidate tabs + interviewer). This gives: refresh-safe, reconnect-safe, network-blip-safe, and multi-viewer-consistent behavior — with no new infrastructure.

---

## 10. AI Prompt Changes
Implemented inline in `startCall()` (Technical branch): present the challenge via tool **before** speaking, allow silent coding, end via tool, then follow up. Non-technical interviews are unchanged (no tools, original prompt).

---

## Testing Checklist
1. **Trigger:** Technical interview; when the AI starts a coding question, the modal appears with title/difficulty/time/statement. (Console: `[INTERVIEW] {"event":"coding-present",...}`.)
2. **Start:** Click *Start Coding* → modal closes, panel pins above Monaco, editor is focused with the cursor on line 1, header shows **CODING**, timer counts down.
3. **Silent coding:** Stay quiet for several minutes → call stays connected (silence timeout already raised) and the timer keeps running.
4. **Refresh mid-round:** Reload `/start` → after WS reconnect, the panel + timer restore from Redis at the correct remaining time; editor code restores too.
5. **Network blip:** Drop network ~10s → on reconnect, `coding:sync` restores state; timer stays accurate (server `startedAt`).
6. **Expiry:** Let the timer hit 0 → turns red near the end, then auto-ends (`coding:end`), panel hides.
7. **AI ends round:** Model calls `end_coding_challenge` → panel/badge clear; follow-up questions proceed.
8. **Interviewer view:** Second (interviewer) session sees the same challenge + timer (broadcast).
9. **Non-technical:** Behavioral interview shows no tools, no modal/panel (unchanged).
10. **Submission:** On interview end, the latest code is still saved to `interview-feedback.code_submission`.

---

## Rollout Plan
1. **Deploy ws-server first** (additive `coding:*` handlers + Redis key; backward compatible — old clients ignore `coding:sync`).
2. **Deploy web** with the feature.
3. **Verify** with a Technical test interview using the checklist; watch `[INTERVIEW]` logs for `coding-present` / `Coding Challenge Started` analytics events.
4. **Tune** the prompt if the model presents challenges too eagerly/late; adjust default `timeLimit`.
5. **Rollback:** the feature is isolated — reverting `start/page.jsx` (tools + handlers) disables it; the `coding:*` server handlers then simply go unused. No schema migration to undo.

### Known limitations / follow-ups
- Vapi client-side function tools surface the call to the browser; if the model expects a tool *result*, the prompt instructs it to continue speaking. If you observe the model pausing for a result, add a `vapi.send` tool-result ack.
- The challenge content is model-generated from the question list. To guarantee exact, vetted problems, store challenges in the DB and have the tool pass an `id` the frontend resolves.
- Candidate-sent `coding:*` messages aren't role-restricted server-side (the candidate's browser legitimately drives them via Vapi). Add a role guard if you later want interviewer-only control.
