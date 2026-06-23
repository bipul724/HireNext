# Root Cause Investigation — Abrupt Interview Termination

**Scope:** HireNext interview platform (`web/` Next.js app + `ws-server/` realtime server)
**Symptom:** A live interview ended on its own — candidate was answering/coding, had code in the editor, never clicked **End Interview** — and the page jumped to the completion screen.

---

## 1. Architecture Overview

There are **two independent realtime systems** running during an interview, and they are **not coordinated**:

| System | Purpose | Who controls end-of-interview? |
|---|---|---|
| **Vapi voice call** (`@vapi-ai/web`, client-side only) | The spoken AI interview | **Yes — exclusively.** A Vapi `call-end` event is the *only* thing that finalizes the interview and navigates the candidate to `/completed`. |
| **WebSocket editor server** (`ws-server/`, Redis-backed) | Collaborative code editor, presence, timer, code persistence | **No.** It tracks a Redis `interviewStatus` (`not_started/running/paused/ended`) used only to lock the editor and show a timer. It never navigates the candidate and never ends the Vapi call. |

Key consequence: **the entire interview lifecycle hinges on a single client-side event** — Vapi `call-end`. Anything that ends the Vapi call ends the interview.

Findings of note:
- **No Vapi webhooks / server-url exist anywhere** (`grep webhook|serverUrl|server-url` → nothing). All Vapi handling is in `web/app/interview/[interview_id]/start/page.jsx`.
- **No database `status` column is ever set to `completed`/`cancelled`/`expired`.** The only DB write at interview end is an insert into the `interview-feedback` table. There is no cron job, background worker, or scheduled expiry.
- **`interviewInfo` lives only in React Context memory** (set on the lobby page, read on the start page). A refresh of `/start` loses it.

---

## 2. Interview Lifecycle Diagram

```
                         LOBBY  (interview/[interview_id]/page.jsx)
                         └─ joinInterview(): setInterviewInfo(ctx) ─ router.push(/start)
                                            │
                                            ▼
                  START PAGE  (interview/[interview_id]/start/page.jsx)
                                            │
        useEffect[interviewInfo] ───────────┼───────────── WebSocketProvider (technical only)
        callStartedRef → startCall()        │                └─ wsClient.connect()  ── editor:init/change/flush
        vapi.start(assistantOptions)        │                    (Redis persistence; heartbeat 30s)
                                            ▼
                              ┌─────────  VAPI CALL  ─────────┐
                              │  call-start → timer interval  │
                              │  message    → setConversation │
                              │  speech-*   → activeUser UI   │
                              └───────────────┬───────────────┘
                                              │  call-end  (THE ONLY EXIT)
                                              ▼
                          handleCallEnd() → GenerateFeedback()
                                              │
                  ┌───────────────────────────┼───────────────────────────┐
                  │ (technical) flushEditor + fetch code from ws-server     │
                  │ insert interview-feedback row                           │
                  │ router.replace(/completed)   ◄── PAGE LEAVES HERE       │
                  │ fire-and-forget POST /api/ai-feedback (server persists) │
                  └─────────────────────────────────────────────────────────┘

  call-end can be fired by:
    (a) user clicks red phone → AlertConfirmation → stopInterview() → vapi.stop()   [intended]
    (b) Vapi SILENCE timeout (default 30s of no speech)                              [BUG]
    (c) Vapi MAX DURATION reached (default 600s = 10 min)                            [BUG]
    (d) Vapi/transport error or "ejection" (network blip, model/provider failure)    [BUG]
    (e) component unmount cleanup → vapi.stop()                                       [edge]
```

The interviewer's **"End Interview"** button (`interview-control-bar.jsx`) only sends `timer:end` over the WebSocket → sets Redis status `ended` → locks the candidate's editor. **It does not stop the candidate's Vapi call and does not navigate the candidate.** So that is not the termination path either.

---

## 3. Findings by Subsystem

### 3.1 Vapi integration — `start/page.jsx` (lines 136–247)

The assistant is started with **no timeout configuration**:

```js
// start/page.jsx ~142
const assistantOptions = {
    name: "AI Recruiter",
    firstMessage: `Hi ${interviewInfo?.userName}, ...`,
    model: { provider: "google", model: "gemini-2.0-flash", messages: [ /* system */ ] }
    // ❌ no silenceTimeoutSeconds
    // ❌ no maxDurationSeconds
    // ❌ no startSpeakingPlan
    // ❌ interviewData.duration is never passed to Vapi
};
vapi.start(assistantOptions);
```

Because nothing is set, **Vapi applies its defaults** (verified against Vapi docs/community):
- `silenceTimeoutSeconds` **default = 30** — the call ends after **30 seconds of silence**.
- `maxDurationSeconds` **default = 600** — the call hard-stops after **10 minutes**, regardless of the interview's configured `duration`.

The end handler finalizes unconditionally:

```js
// start/page.jsx ~180
const handleCallEnd = () => {
    toast("Interview Ended... Generating feedback.");
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
    GenerateFeedback();          // → router.replace(/completed)
};
```

`handleCallEnd` does not look at *why* the call ended (`endedReason`), does not distinguish a user hang-up from a silence/duration/error end, and offers no reconnect. **Any `call-end` = interview over.**

> Note: `GenerateFeedback` does early-return if `conversationRef.current` is empty ("No conversation data to analyze") — so a silence-end *before the candidate has spoken at all* would only toast, not navigate. But once the candidate has answered anything (conversation is populated), a later silence/duration/error end navigates away. This precisely matches "the candidate was actively answering, then it ended."

### 3.2 Coding interview integration — `monaco-workspace.jsx`, `connectionHandler.js`

Good news on data safety:
- Editor code **is autosaved** server-side. Every keystroke sends `editor:change` → `ws-server` debounces 1s → Redis (`connectionHandler.js` `scheduleSave`). On reconnect/refresh the candidate receives `editor:init` and the code is restored.
- On interview end, `GenerateFeedback` calls `wsClient.flushEditor()` then fetches the saved code via `GET /api/interviews/:id/code` and stores it in `interview-feedback.code_submission`.

So **code itself is not lost** by termination or refresh. **However**, the abrupt navigation to `/completed` removes the candidate from the editor mid-task — the work is saved but the candidate can't continue. No Judge0/Piston wipe is involved (Piston runs only on explicit `code:run`, which is currently disabled "Coming Soon").

### 3.3 Frontend state & redirects

- Only **one** redirect can leave the interview screen: `router.replace('/interview/${id}/completed')` at `start/page.jsx` line ~107, inside `GenerateFeedback`, reachable **only** from `handleCallEnd`.
- `interviewInfo` is stored in `InterviewDataContext` (`layout.jsx` `useState`) — **in-memory only**. A page refresh on `/start` makes it `undefined`: the Vapi call won't (re)start and conversation context is gone. This is a fragility, not the direct trigger.
- `use-room-store` `interviewStatus === 'ended'` is **not** wired to any navigation. It only drives the editor lock + status pill.

### 3.4 Realtime infrastructure — `client.js`, `server.js`

- WS disconnects trigger **reconnect with exponential backoff** (`client.js attemptReconnect`) and a **5-second grace** before the editor offline-locks (`monaco-workspace.jsx`). 
- The server **heartbeat** pings every 30s and `ws.terminate()`s sockets that miss a pong (`server.js`). This drops the **editor** socket only — it triggers a client reconnect and a temporary editor lock. **It does not touch the Vapi call and does not end the interview.**
- Net: network instability can lock the editor briefly, but **cannot by itself navigate the candidate away**. It *can*, however, contribute to a Vapi transport drop (3.1d) since Vapi uses its own Daily transport.

### 3.5 Database updates

- Candidate-end writes: `interview-feedback` insert (client) + update with AI feedback (now server-side in `/api/ai-feedback`). 
- No write anywhere sets an interview to `completed/cancelled/expired`. No exception path marks an interview ended. **An exception cannot silently "complete" an interview** — but an exception/`call-end` in the Vapi layer *will* navigate (3.1).

### 3.6 Logs / error handling

- `handleError` (Vapi `error`) now only logs/toasts — it does **not** itself end the interview. But Vapi typically fires `error` **and then** `call-end`; it's the subsequent `call-end` that terminates. The earlier observed `"Meeting ended due to ejection"` and `"VAPI ERROR: {}"` are direct evidence the call was being ended by the transport, not by the user.

---

## 4. Root Cause Ranking

| # | Root cause | Probability | Evidence | Files |
|---|---|---|---|---|
| 1 | **Vapi silence timeout (default 30s) ends the call during silent stretches** — e.g. while the candidate is coding or thinking. | **HIGH** | No `silenceTimeoutSeconds` set; Vapi default is 30s; symptom is "ended while coding" (a naturally silent period). | `start/page.jsx` 142–163 |
| 2 | **Vapi max duration (default 600s = 10 min) hard-caps the call**, ignoring the interview's configured `duration`. | **HIGH** | No `maxDurationSeconds` set; `interviewData.duration` never passed to Vapi; longer interviews cut off at 10 min. | `start/page.jsx` 142–163 |
| 3 | **Any transient Vapi/transport error or network blip ends the call**, and `handleCallEnd` finalizes + navigates unconditionally. | **MEDIUM** | Observed `"ejection"` / `VAPI ERROR {}`; `handleCallEnd` ignores `endedReason`, no reconnect. | `start/page.jsx` 180–187 |
| 4 | **`interviewInfo` is memory-only** → refresh/redirect breaks the session (call can't restart, conversation lost). | **MEDIUM** | Context `useState` in `layout.jsx`; set only on lobby. | `layout.jsx`, `start/page.jsx` |
| 5 | **Unmount cleanup calls `vapi.stop()`**; if the start-call effect re-runs (dep identity change) it can stop a live call. | **LOW** | `useEffect` deps `[interviewInfo, startCall]`; cleanup calls `vapi.stop()`. | `start/page.jsx` 249–258 |
| 6 | **WS heartbeat terminates editor socket on missed pong** — perceived instability; locks editor for 5s. Not interview-ending. | **LOW** | `server.js` `ws.terminate()`. | `ws-server/src/ws/server.js` |

### Most likely cause

**#1 (silence timeout) for technical/coding interviews, and #2 (max duration) for any interview longer than 10 minutes.** The description — "actively answering," "code already in the editor," "ended without clicking End" — fits a candidate who went quiet to read/type code for more than 30 seconds, tripping Vapi's default silence timeout, which fires `call-end`, which runs `GenerateFeedback` and `router.replace('/completed')`. For longer sessions, the 10-minute default cap produces the identical abrupt ending. Both stem from the same gap: **the Vapi assistant is started with no timeout configuration and the interview's own `duration` is never passed to it.**

---

## 5. Recommended Fixes

### Fix A (primary) — Configure Vapi timeouts from the interview's duration
In `startCall` (`start/page.jsx`), set generous timeouts and derive max duration from `interviewData.duration`:

```js
const startCall = useCallback(() => {
    let questionList = "";
    interviewInfo?.interviewData?.questionList?.forEach(item => {
        questionList += (item?.question ?? "") + ", ";
    });

    // Parse "30 Min" / "45 minutes" / "1 hour" → seconds. Fallback 60 min.
    const parseDurationSeconds = (d) => {
        if (!d) return 3600;
        const s = String(d).toLowerCase();
        const num = parseInt(s, 10);
        if (Number.isNaN(num)) return 3600;
        const secs = /hour|hr/.test(s) ? num * 3600 : num * 60;
        // Vapi allows 10..43200; add a 5-min buffer so we never cut off early.
        return Math.min(Math.max(secs + 300, 600), 43200);
    };

    const assistantOptions = {
        name: "AI Recruiter",
        firstMessage: `Hi ${interviewInfo?.userName}, how are you? Ready for your interview on ${interviewInfo?.interviewData?.jobPosition}?`,
        // ✅ Don't end on silence while the candidate codes/thinks.
        silenceTimeoutSeconds: 600,            // max allowed is 3600; tune as needed
        // ✅ Honor the configured interview length instead of the 10-min default.
        maxDurationSeconds: parseDurationSeconds(interviewInfo?.interviewData?.duration),
        model: {
            provider: "google",
            model: "gemini-2.0-flash",
            messages: [{ role: "system", content: `...` }],
        },
    };
    vapi.start(assistantOptions);
}, [interviewInfo]);
```

### Fix B (defense in depth) — Don't finalize on an *unexpected* end without a chance to recover
Track whether the end was user-initiated, and capture Vapi's `endedReason` (it arrives on `message` events of type `status-update`). For non-user ends, confirm/allow restart instead of silently navigating:

```js
const endedByUserRef = useRef(false);
const lastEndedReasonRef = useRef(null);

// in stopInterview():
const stopInterview = useCallback(() => {
    endedByUserRef.current = true;
    try { vapi.stop(); } catch (e) { console.warn("vapi.stop failed", e); }
}, []);

// in handleMessage():
const handleMessage = (message) => {
    if (message?.type === "status-update" && message?.endedReason) {
        lastEndedReasonRef.current = message.endedReason;  // e.g. "silence-timeout", "customer-ended-call"
    }
    if (message?.conversation) setConversation(message.conversation);
};

// in handleCallEnd():
const handleCallEnd = () => {
    const reason = lastEndedReasonRef.current || "";
    const userEnded = endedByUserRef.current || /customer-ended-call/i.test(reason);
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }

    if (!userEnded && /silence-timeout|pipeline-error|ejection|provider/i.test(reason)) {
        // Unexpected end: keep code safe but let the candidate resume rather than
        // dumping them on /completed.
        toast.error("Voice connection dropped. Reconnecting…");
        callStartedRef.current = false;   // allow startCall() to run again
        startCall();
        return;
    }
    toast("Interview Ended... Generating feedback.");
    GenerateFeedback();
};
```

(If you prefer the strict behavior, at minimum still call `GenerateFeedback()` so data is saved — the key is to stop *premature* ends from happening via Fix A.)

### Fix C — Persist `interviewInfo` so refresh doesn't break the session
In the lobby `joinInterview` and the start page, mirror `interviewInfo` to `sessionStorage` and rehydrate on mount, so a refresh of `/start` can restore context (and restart the call) instead of dead-ending.

### Fix D (optional) — Pass `interviewData.duration` end-to-end
Surface the configured duration into the page header countdown and the Vapi `maxDurationSeconds` (covered by Fix A), so the visible timer and the actual call limit agree.

---

## 6. Files Requiring Modification

| File | Change |
|---|---|
| `web/app/interview/[interview_id]/start/page.jsx` | Fix A (timeouts in `startCall`), Fix B (`endedReason`/recovery in handlers). **Primary fix.** |
| `web/app/interview/[interview_id]/page.jsx` + `web/app/interview/layout.jsx` | Fix C (persist/rehydrate `interviewInfo`). |
| *(No change needed)* `ws-server/*` | Confirmed not a termination path. |

---

## 7. Verification Checklist (after applying fixes)

1. Start a technical interview, answer once, then stay silent in the editor for > 60s → call should **not** end.
2. Run an interview past 10 minutes → call should **not** end at 10:00.
3. Kill the network for ~10s mid-interview → editor locks then recovers; with Fix B the voice call attempts to resume rather than navigating to `/completed`.
4. Refresh `/start` mid-interview → with Fix C the session rehydrates; code is restored from Redis regardless.
5. Click the red End button → still finalizes and navigates as before.

---

*Investigation method: full read of `start/page.jsx`, `interview-control-bar.jsx`, `monaco-workspace.jsx`, `candidate-status-panel.jsx`, `execution-panel.jsx`, `websocket-provider.jsx`, `event-registry.js`, all Zustand stores, `ws-server` `server.js`/`connectionHandler.js`/`roomState.js`/`auth.js`; codebase-wide greps for `setTimeout/setInterval`, `router.push/replace/window.location`, Vapi usage, and status writes; and verification of Vapi default timeouts against current docs.*
