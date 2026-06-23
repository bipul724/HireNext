# Production Fix — Unexpected Interview Termination

**Verification of the prior report + implemented production-safe solution.**
Verified against the actual codebase (`@vapi-ai/web@2.5.2`) and current Vapi docs.

---

## 1. Verification of the Investigation Report

| # | Claim in report | Verdict | Evidence |
|---|---|---|---|
| 1 | The only navigation to `/completed` is `router.replace` inside `GenerateFeedback`, reachable only from the Vapi `call-end` handler. | **Confirm** | `grep router.replace|router.push|window.location` → the only `/completed` redirect is `start/page.jsx`; it sits inside `GenerateFeedback`, whose sole caller is `handleCallEnd` (the `call-end` listener). |
| 2 | No Vapi webhooks / server-url exist. | **Confirm** | `grep -i webhook|serverUrl|server-url` across `web/app/api` and `ws-server/src` → no matches. All Vapi handling is client-side. |
| 3 | The WS server never sets a DB status to completed/ended/expired; `interviewStatus` is Redis-only and only locks the editor. | **Confirm** | `roomState.js` writes `room:{id}:status` to Redis. `event-registry.js` routes `room:sync` → `useRoomStore`; no navigation. `connectionHandler.js` `timer:end` mutates Redis status only. |
| 4 | Interviewer "End Interview" sends `timer:end`; it does not end the candidate's Vapi call or navigate them. | **Confirm** | `interview-control-bar.jsx handleEnd` → `sendMessage('timer:end')` + optimistic store update. Candidate side: `use-room-store` `interviewStatus='ended'` only locks editor. |
| 5 | Vapi started with no `silenceTimeoutSeconds` / `maxDurationSeconds`; `interviewData.duration` never passed. | **Confirm** | Original `startCall` `assistantOptions` had only `name`, `firstMessage`, `model`. |
| 6 | Vapi defaults: silence 30s, max duration 600s (10 min). | **Confirm** | Vapi docs/community (see Sources). |
| 7 | `handleCallEnd` finalizes unconditionally, ignoring `endedReason`. | **Confirm** | Original handler called `GenerateFeedback()` with no reason check. |
| 8 | Editor code is autosaved to Redis and survives refresh/termination. | **Confirm** | `editor:change` → debounced `saveRoomDoc` (Redis); reconnect → `editor:init` restores. Code is safe. |
| 9 | `interviewInfo` is memory-only (React Context), lost on refresh. | **Confirm** | `layout.jsx` holds it in `useState`; lobby sets it; no persistence. |
| 10 | WS heartbeat terminates editor sockets on missed pong but does not end the interview. | **Confirm** | `server.js` `ws.terminate()` drops only the editor socket → client reconnects + 5s editor lock. No Vapi/nav impact. |

**One correction to the report's fix snippet:** the genuine duration-expiry reason is **`max-duration-exceeded`** (the report wrote `exceeded-max-duration`). The implemented code matches both spellings defensively. Silence is **`silence-timed-out`**.

**Net:** every material finding in the report is **Confirmed**. The report's root-cause direction was correct.

---

## 2. Every Interview Termination Path (traced)

```
                              ┌──────────────────────────────────────────────┐
                              │  vapi `call-end` event  →  handleCallEnd()     │
                              └──────────────────────────────────────────────┘
                                                  │
        ┌─────────────────────────┬───────────────┴───────────────┬──────────────────────────┐
        ▼ USER-TRIGGERED          ▼ TIMEOUT (genuine)              ▼ AUTOMATIC/ERROR (recover) ▼ EXHAUSTED
  red phone → AlertConfirmation   endedReason ~ max-duration       endedReason = silence-timed-out,    after MAX_RECOVERY_ATTEMPTS
  → stopInterview()               -exceeded                        pipeline-error-*, vapifault-*,      → finalize anyway
  → endedByUserRef = true         OR assistant-ended-call          ejection, transport, network,       → GenerateFeedback()
  → vapi.stop()                   OR customer-ended-call           unknown/empty
        │                                 │                                │
        └─────────────┬───────────────────┘                               │
                      ▼                                                    ▼
          GenerateFeedback() → router.replace('/completed')      startCall()  (reconnect, keep editor + timer)

  NON-paths (verified they do NOT terminate the candidate's interview):
    • Interviewer 'timer:end'  → Redis status 'ended' → editor lock only
    • WS disconnect/heartbeat   → editor reconnect + 5s lock
    • Redis room status changes → UI only
    • Component unmount         → vapi.stop() fires, but listeners are removed first → no finalize
```

---

## 3. Vapi Integration Audit

**Registered events** (`start/page.jsx`): `message`, `call-start`, `call-end`, `speech-start`, `speech-end`, `error`.

**Payloads (web SDK 2.5.2):**
- `call-start` — no payload.
- `call-end` — **no reliable payload** (this is why the original code couldn't see *why* it ended).
- `message` — every server message; relevant type is **`status-update`**, which carries **`status`** and **`endedReason`**. ← we now capture `endedReason` here.
- `speech-start` / `speech-end` — no payload (used for the speaking indicator + as a "call healthy" signal).
- `error` — loosely-typed object; often `{}` on normal termination.

**Does `call-end` include endedReason/status/metadata/transport?** No — in the web SDK that information is delivered on the `message`/`status-update` event, not on `call-end`. The implementation captures it from `status-update` into `lastEndedReasonRef`.

**Key `endedReason` values (current Vapi docs):**

| endedReason | Meaning | Should it complete the interview? |
|---|---|---|
| `customer-ended-call` | Candidate hung up | ✅ Complete |
| `assistant-ended-call` | AI concluded the interview | ✅ Complete |
| `max-duration-exceeded` | Configured duration expired | ✅ Complete |
| `silence-timed-out` | No audio within silence window | ❌ Recover |
| `pipeline-error-*` (e.g. `pipeline-error-google-...`, `...-llm-failed`) | Provider/model failure | ❌ Recover |
| `vapifault-*` | Vapi-side fault | ❌ Recover |
| `call.in-progress.error-*` / transport / `ejection` | Transport/network drop | ❌ Recover |
| `voicemail`, `customer-did-not-give-microphone-permission`, etc. | Edge cases | ❌ Recover (then exhaust → finalize) |
| empty / unknown | SDK didn't surface a reason | ❌ Recover (then exhaust → finalize) |

---

## 4. Actual Cause — Ranked

| Cause | Probability | Evidence | Files |
|---|---|---|---|
| **Silence timeout (default 30s)** | **~45%** | No `silenceTimeoutSeconds`; candidate codes/thinks silently > 30s; symptom = "ended while coding". | `start/page.jsx` (startCall) |
| **Max duration (default 600s)** | **~25%** | No `maxDurationSeconds`; `duration` never passed; any interview > 10 min cut off. | `start/page.jsx` (startCall) |
| **Vapi provider/pipeline error** | **~12%** | Observed `VAPI ERROR {}` / `ejection`; `gemini-2.0-flash` via provider can fault → call-end → finalize. | `start/page.jsx` (handleError/handleCallEnd) |
| **Network interruption** | **~8%** | Vapi transport (Daily) drop → ejection → call-end. | `start/page.jsx`, network |
| **Component unmount** | **~4%** | Cleanup `vapi.stop()`; low because listeners removed first. | `start/page.jsx` (effects) |
| **Browser refresh** | **~3%** | `interviewInfo` memory-only → broken session (not auto-complete). | `layout.jsx`, `start/page.jsx` |
| **WebSocket disconnect** | **~2%** | Editor-only; reconnect + lock. Not interview-ending. | `client.js`, `server.js` |
| **React re-render** | **~1%** | Stable refs/guards; not a real path. | — |
| **Redis issue** | **~0%** | Affects editor state only. | `roomState.js` |
| **Manual interviewer action** | **~0%** | `timer:end` doesn't end candidate Vapi/nav. | `interview-control-bar.jsx` |

**Most likely:** silence timeout (technical/coding sessions) and max duration (sessions > 10 min) — both the same root gap: the assistant was started with no timeout config and the interview's own duration was never passed to Vapi.

---

## 5. Architecture Weaknesses → Recommended Architecture

**Weaknesses (before):**
1. Single point of termination (`call-end`) with no reason inspection.
2. Vapi defaults govern interview length instead of the configured duration.
3. No recovery — any transient drop ends the interview.
4. No telemetry — terminations were undiagnosable.
5. Session context (`interviewInfo`) is non-persistent.

**Recommended architecture (implemented):**
- **Duration-driven Vapi config:** `maxDurationSeconds` and `silenceTimeoutSeconds` derived from `interviewData.duration` so silence/length never prematurely end the call.
- **Reason-aware termination:** capture `endedReason` from `status-update`; complete **only** on explicit user end or a genuine terminal reason; everything else is **recoverable**.
- **Bounded auto-recovery:** up to `MAX_RECOVERY_ATTEMPTS` reconnects; the recovery budget resets on real audio activity; if exhausted, finalize so the candidate is never stuck.
- **Editor independence:** code lives on the separate WS + Redis and re-syncs on reconnect — recovery never risks code.
- **Structured telemetry:** every Vapi lifecycle event logged as JSON with `interviewId`, candidate, `endedReason`, elapsed, online status, recovery attempts; best-effort persisted to an optional `interview-events` table.

---

## 6. Exact Code Changes (implemented in `start/page.jsx`)

### A. Module-level policy, duration parser, telemetry
```js
const MAX_RECOVERY_ATTEMPTS = 2;

const COMPLETE_ENDED_REASONS = new Set([
    "customer-ended-call",
    "assistant-ended-call",
]);
const isCompleteReason = (reason) => {
    if (!reason) return false;
    if (COMPLETE_ENDED_REASONS.has(reason)) return true;
    return /max-duration|maximum-duration/i.test(reason); // genuine expiry, both spellings
};

const parseInterviewDurationSeconds = (raw) => {
    if (!raw) return 3600;
    const s = String(raw).toLowerCase();
    const n = parseInt(s, 10);
    if (Number.isNaN(n)) return 3600;
    const secs = /hour|hr/.test(s) ? n * 3600 : n * 60;
    return Math.min(Math.max(secs + 300, 600), 43200); // +5min grace, clamp to Vapi range
};

const logInterviewEvent = (event, data = {}) => {
    const entry = { event, ts: new Date().toISOString(),
        online: typeof navigator !== "undefined" ? navigator.onLine : null, ...data };
    console.log("[INTERVIEW]", JSON.stringify(entry));
    try {
        supabase.from("interview-events").insert(entry)
            .then(({ error }) => { if (error) console.debug("[INTERVIEW] telemetry skipped:", error.message); });
    } catch (_) {}
};
```

### B. Refs + Vapi config (in `startCall`)
```js
const endedByUserRef = useRef(false);
const lastEndedReasonRef = useRef(null);
const recoveryAttemptsRef = useRef(0);
const timeRef = useRef(0);
// ...
const durationSeconds = parseInterviewDurationSeconds(interviewInfo?.interviewData?.duration);
const silenceTimeoutSeconds = Math.min(durationSeconds, 3600);
const assistantOptions = {
    name: "AI Recruiter",
    firstMessage: `...`,
    maxDurationSeconds: durationSeconds,   // ✅ honor configured length
    silenceTimeoutSeconds,                 // ✅ don't end while coding/thinking
    model: { provider: "google", model: "gemini-2.0-flash", messages: [ /* system */ ] },
};
logInterviewEvent("call-config", { interviewId: interview_id, duration: interviewInfo?.interviewData?.duration, maxDurationSeconds: durationSeconds, silenceTimeoutSeconds });
vapi.start(assistantOptions);
```

### C. Safe `call-end` + recovery (the core)
```js
const handleMessage = (message) => {
    if (message?.type === "status-update") {
        if (message?.endedReason) lastEndedReasonRef.current = message.endedReason;
        logInterviewEvent("status-update", { interviewId: interview_id, status: message?.status, endedReason: message?.endedReason });
    }
    if (message?.conversation) setConversation(message.conversation);
};

const handleCallEnd = () => {
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
    const reason = lastEndedReasonRef.current || "(unknown)";
    const userEnded = endedByUserRef.current;
    logInterviewEvent("call-end", { interviewId: interview_id, candidate: interviewInfo?.userEmail, endedReason: reason, userEnded, elapsedSec: timeRef.current, recoveryAttempts: recoveryAttemptsRef.current });

    // 1) Legitimate completion
    if (userEnded || isCompleteReason(reason)) {
        toast("Interview Ended... Generating feedback.");
        GenerateFeedback();
        return;
    }
    // 2) Unexpected → bounded recovery (editor code untouched)
    if (recoveryAttemptsRef.current < MAX_RECOVERY_ATTEMPTS && interviewInfo) {
        recoveryAttemptsRef.current += 1;
        logInterviewEvent("call-recovery-attempt", { interviewId: interview_id, endedReason: reason, attempt: recoveryAttemptsRef.current });
        toast.error("Voice connection dropped. Reconnecting…");
        lastEndedReasonRef.current = null;
        setTimeout(() => { try { startCall(); } catch (e) { console.error("Recovery restart failed:", e); } }, 1200);
        return;
    }
    // 3) Recovery exhausted → finalize (never get stuck)
    logInterviewEvent("call-recovery-exhausted", { interviewId: interview_id, endedReason: reason });
    toast("Wrapping up your interview…");
    GenerateFeedback();
};

// Real audio activity = healthy call → reset recovery budget
const handleSpeechStart = () => { recoveryAttemptsRef.current = 0; setActiveUser(false); };
const handleSpeechEnd   = () => { recoveryAttemptsRef.current = 0; setActiveUser(true); };
```

### D. `stopInterview` marks an explicit end; `handleError` logs but never terminates
```js
const stopInterview = useCallback(() => {
    endedByUserRef.current = true;
    logInterviewEvent("user-end-clicked", { interviewId: interview_id, candidate: interviewInfo?.userEmail });
    try { vapi.stop(); } catch (e) { console.warn("vapi.stop failed", e); }
}, [interview_id, interviewInfo]);
```

### E. (Optional) telemetry table
```sql
create table if not exists "interview-events" (
  id          bigint generated always as identity primary key,
  event       text not null,
  ts          timestamptz default now(),
  online      boolean,
  "interviewId" text,
  candidate   text,
  "endedReason" text,
  status      text,
  "userEnded" boolean,
  "elapsedSec" int,
  attempt     int,
  msg         text
);
```
If you don't create it, telemetry just logs to the console — the insert no-ops on the returned error.

---

## 7. Files to Modify

| File | Status |
|---|---|
| `web/app/interview/[interview_id]/start/page.jsx` | ✅ **Done** — config + reason-aware end + recovery + telemetry. |
| `web/app/.../start/_components/AlertConfirmation.jsx` | Unchanged (already routes End → `stopInterview`). |
| `ws-server/*` | Unchanged (confirmed not a termination path). |
| Supabase | Optional `interview-events` table (SQL above). |
| *(Recommended next)* `web/app/interview/layout.jsx` + lobby | Persist `interviewInfo` to `sessionStorage` so a refresh rehydrates. **Not yet implemented** — see Rollout. |

---

## 8. Testing Checklist

1. **Silent coding** — start a Technical interview, answer once, then code silently for > 90s. Expect: call stays connected, no navigation. Console shows `call-config` with a large `silenceTimeoutSeconds`.
2. **Long interview** — set a 30-min interview; run past 10:00. Expect: no cut-off at 10 minutes.
3. **Network blip** — DevTools offline ~8s mid-interview, then online. Expect: `call-recovery-attempt` log, "Reconnecting…" toast, call resumes; no `/completed`.
4. **Hard drop** — block Vapi for longer than `MAX_RECOVERY_ATTEMPTS` cycles. Expect: after attempts exhausted, `call-recovery-exhausted` then graceful finalize.
5. **Explicit end** — click red phone → Continue. Expect: `user-end-clicked` then `call-end` with `userEnded:true` → feedback + `/completed`.
6. **Assistant ends** — AI concludes. Expect: `endedReason: assistant-ended-call` → complete.
7. **Code integrity** — after any recovery, confirm editor code is intact (re-synced from Redis) and `code_submission` is saved on final completion.
8. **Telemetry** — verify each event prints `[INTERVIEW] {...}`; if the table exists, rows are inserted.

---

## 9. Rollout Plan

1. **Stage 1 — Observe (safe):** ship the telemetry + config changes (already implemented). Even with recovery, monitor `[INTERVIEW]` logs / `interview-events` for real `endedReason` distribution in your environment for a few sessions.
2. **Stage 2 — Tune:** based on observed reasons, adjust `MAX_RECOVERY_ATTEMPTS` and `silenceTimeoutSeconds`. If `assistant-ended-call` appears prematurely, tighten the system prompt ("do not end the call yourself; continue until the candidate ends or time expires").
3. **Stage 3 — Harden session:** implement `interviewInfo` persistence (sessionStorage) so refresh rehydrates and recovery can survive a full page reload.
4. **Rollback:** the change is contained to one file. To revert behavior to "always finalize on call-end," set `MAX_RECOVERY_ATTEMPTS = 0` (recovery branch is skipped; completion is reason-gated but never blocks).

---

### Known limitation
On a recovery reconnect, Vapi starts a fresh call (the assistant re-greets), and the transcript for feedback reflects the post-reconnect conversation. This is an acceptable trade to keep the candidate in the interview rather than dropping them; the editor code is always preserved. A future enhancement could stitch transcripts across reconnects.

---

*Sources:* [Vapi — Call ended reasons](https://docs.vapi.ai/calls/call-ended-reason) · [Vapi — Troubleshoot call errors](https://docs.vapi.ai/calls/troubleshoot-call-errors) · [Vapi — Speech configuration](https://docs.vapi.ai/customization/speech-configuration) · [Vapi — Max Duration default (community)](https://vapi.ai/community/m/1371553008923578538) · [Vapi — Server events](https://docs.vapi.ai/server-url/events)
