# HireNext — Software Architecture Document

> **Generated from codebase analysis. Every statement is backed by actual implementation.**
> Last updated: June 2026

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [High-Level Architecture](#2-high-level-architecture)
3. [Component Diagram](#3-component-diagram)
4. [Request Flow Diagrams](#4-request-flow-diagrams)
5. [Database Architecture](#5-database-architecture)
6. [API Architecture](#6-api-architecture)
7. [Authentication Flow](#7-authentication-flow)
8. [WebSocket Architecture](#8-websocket-architecture)
9. [AI Architecture](#9-ai-architecture)
10. [Data Flow Diagram](#10-data-flow-diagram)
11. [Folder Architecture](#11-folder-architecture)
12. [Dependency Graph](#12-dependency-graph)
13. [Deployment Architecture](#13-deployment-architecture)
14. [Security Architecture](#14-security-architecture)
15. [Performance Architecture](#15-performance-architecture)
16. [External Services](#16-external-services)
17. [Environment Variables](#17-environment-variables)
18. [Architecture Summary](#18-architecture-summary)

---

## 1. Project Overview

HireNext is an AI-powered interview platform that enables recruiters to create interview sessions, generate AI-tailored questions, conduct voice-based interviews with an AI interviewer (via Vapi), and provide real-time collaborative code editing for technical interviews. The system generates automated feedback and analytics for each candidate.

The project is a monorepo with two deployable units:

- **`web/`** — Next.js 16 frontend + API routes (recruiter dashboard, candidate interview UI, AI services)
- **`ws-server/`** — Standalone Node.js WebSocket server (real-time collaborative editor, code execution, room state)

---

## 2. High-Level Architecture

```mermaid
graph TB
    subgraph Client["Browser"]
        RC["Recruiter Dashboard<br/>(Next.js Pages)"]
        CI["Candidate Interview UI<br/>(Vapi + Monaco Editor)"]
    end

    subgraph NextJS["Next.js App (web/)"]
        Pages["Pages & Layouts"]
        API["API Routes"]
        AILayer["AI Layer<br/>(OpenRouter)"]
    end

    subgraph WSServer["WebSocket Server (ws-server/)"]
        WSHandler["Connection Handler"]
        RoomMgr["Room State Manager"]
        PubSub["Redis Pub/Sub"]
        CodeExec["Code Executor"]
    end

    subgraph External["External Services"]
        Supabase["Supabase<br/>(Auth + PostgreSQL)"]
        Redis["Redis<br/>(Upstash)"]
        OpenRouter["OpenRouter<br/>(AI Models)"]
        Vapi["Vapi<br/>(Voice AI)"]
        Piston["Piston API<br/>(Code Execution)"]
        UpstashRL["Upstash Redis<br/>(Rate Limiting)"]
    end

    RC -->|HTTPS| Pages
    CI -->|HTTPS| Pages
    CI -->|WebSocket| WSHandler
    RC -->|WebSocket| WSHandler

    Pages --> API
    API --> AILayer
    AILayer -->|HTTPS| OpenRouter
    API -->|HTTPS| Supabase
    CI -->|WebRTC/HTTPS| Vapi

    WSHandler --> RoomMgr
    RoomMgr -->|State R/W| Redis
    WSHandler --> PubSub
    PubSub -->|Pub/Sub| Redis
    WSHandler --> CodeExec
    CodeExec -->|HTTPS| Piston
    WSHandler -->|Auth + Events| Supabase

    Vapi -->|Webhook POST| API
    API -->|Rate Limit| UpstashRL
```

---

## 3. Component Diagram

### Frontend Components

```mermaid
graph TB
    subgraph Pages["Pages"]
        Landing["/ (Landing)"]
        Auth["/auth"]
        Dashboard["/dashboard"]
        CreateInterview["/dashboard/create-interview"]
        Analytics["/analytics"]
        Workspace["/scheduled-interview"]
        InterviewDetail["/scheduled-interview/[id]/details"]
        CandidateReview["/scheduled-interview/[id]/candidate/[fid]"]
        AllInterview["/all-interview"]
        Billing["/billing"]
        Settings["/settings"]
        InterviewLobby["/interview/[id]"]
        InterviewStart["/interview/[id]/start"]
        InterviewComplete["/interview/[id]/completed"]
    end

    subgraph EditorComponents["Editor Components"]
        MonacoWorkspace["MonacoWorkspace"]
        InterviewControlBar["InterviewControlBar"]
        CandidateStatusPanel["CandidateStatusPanel"]
        ExecutionPanel["ExecutionPanel"]
        PresenceBar["PresenceBar"]
        ConnectionBadge["ConnectionBadge"]
        CodingChallengeModal["CodingChallengeModal"]
        CodingChallengePanel["CodingChallengePanel"]
    end

    subgraph StateLayer["State Management (Zustand)"]
        EditorStore["useEditorStore<br/>{code, language}"]
        ConnectionStore["useConnectionStore<br/>{status}"]
        PresenceStore["usePresenceStore<br/>{users}"]
        RoomStore["useRoomStore<br/>{timerState, editorLocked, ...}"]
        ExecutionStore["useExecutionStore<br/>{isRunning, stdout, stderr, ...}"]
        CodingStore["useCodingStore<br/>{phase, challenge, ...}"]
    end

    subgraph Contexts["Context Providers"]
        UserCtx["UserDetailContext<br/>{user, setUser}"]
        InterviewCtx["InterviewDataContext<br/>{interviewInfo}"]
        WSCtx["WebSocketContext<br/>{role, sendMessage, flushEditor}"]
    end

    InterviewStart --> MonacoWorkspace
    MonacoWorkspace --> InterviewControlBar
    MonacoWorkspace --> CandidateStatusPanel
    MonacoWorkspace --> ExecutionPanel
    MonacoWorkspace --> CodingChallengePanel
    MonacoWorkspace --> CodingChallengeModal

    MonacoWorkspace --> EditorStore
    ConnectionBadge --> ConnectionStore
    PresenceBar --> PresenceStore
    InterviewControlBar --> RoomStore
    CandidateStatusPanel --> RoomStore
    ExecutionPanel --> ExecutionStore
    CodingChallengePanel --> CodingStore
    CodingChallengeModal --> CodingStore
```

### Backend Components (WebSocket Server)

```mermaid
graph TB
    subgraph Entry["Entry & HTTP"]
        Index["index.js<br/>(startup)"]
        App["app.js<br/>(Express REST)"]
    end

    subgraph WSLayer["WebSocket Layer"]
        Server["server.js<br/>(WS init + heartbeat)"]
        AuthMod["auth.js<br/>(upgrade auth)"]
        ConnHandler["connectionHandler.js<br/>(message dispatch)"]
        PubSubMod["pubsub.js<br/>(cross-instance)"]
        RoomRegistry["roomRegistry.js<br/>(in-memory rooms)"]
    end

    subgraph Config["Configuration"]
        Env["env.js"]
        RedisConfig["redis.js<br/>(3 clients)"]
        SupaConfig["supabase.js<br/>(service-role)"]
    end

    subgraph State["Room State (Redis)"]
        RoomState["roomState.js<br/>(all Redis R/W)"]
    end

    subgraph Utils["Utilities"]
        AnalyticsUtil["analytics.js<br/>(event tracking)"]
        Snapshots["snapshots.js<br/>(code persistence)"]
        PistonUtil["piston.js<br/>(code exec)"]
        Logger["logger.js"]
    end

    Index --> App
    Index --> Server
    Server --> AuthMod
    Server --> ConnHandler
    ConnHandler --> PubSubMod
    ConnHandler --> RoomRegistry
    ConnHandler --> RoomState
    ConnHandler --> AnalyticsUtil
    ConnHandler --> Snapshots
    ConnHandler --> PistonUtil
    RoomState --> RedisConfig
    PubSubMod --> RedisConfig
    AuthMod --> SupaConfig
    AnalyticsUtil --> SupaConfig
    Snapshots --> SupaConfig
```

---

## 4. Request Flow Diagrams

### 4.1 User Login

```mermaid
sequenceDiagram
    participant B as Browser
    participant N as Next.js App
    participant S as Supabase Auth
    participant DB as Supabase DB

    B->>N: GET /auth
    N->>B: Render login page
    B->>S: signInWithOAuth({provider: 'google'})
    S->>B: Redirect to Google OAuth
    B->>S: OAuth callback with code
    S->>B: Set session (JWT in cookie)
    B->>N: GET /dashboard (redirect)
    N->>S: auth.getUser() (verify session)
    S-->>N: User object (id, email, metadata)
    N->>DB: SELECT FROM Users WHERE email = ?
    alt User exists
        DB-->>N: User row
    else New user
        N->>DB: INSERT INTO Users (name, email, picture)
        DB-->>N: New user row
    end
    N->>B: Render dashboard with user context
```

### 4.2 Interview Creation

```mermaid
sequenceDiagram
    participant R as Recruiter Browser
    participant N as Next.js API
    participant OR as OpenRouter AI
    participant DB as Supabase DB

    R->>N: POST /api/ai-model<br/>{jobPosition, jobDescription, duration, type}
    N->>N: Rate limit check (Upstash)
    N->>OR: Chat completion<br/>(QUESTIONS_PROMPT with interpolated params)
    OR-->>N: JSON response with questions
    N->>N: Parse AI response (extract JSON block)
    N-->>R: {interviewQuestions: [{question, type}]}
    R->>DB: INSERT INTO Interviews<br/>{interview_id, jobPosition, jobDescription,<br/>candidateEmail, duration, type, questionList, userEmail}
    DB-->>R: Success
    R->>R: Display interview link<br/>(NEXT_PUBLIC_HOST_URL/interview_id)
```

### 4.3 Interview Session (Technical)

```mermaid
sequenceDiagram
    participant C as Candidate Browser
    participant V as Vapi (Voice AI)
    participant WS as WebSocket Server
    participant R as Redis
    participant P as Piston API
    participant I as Interviewer Browser

    C->>WS: WebSocket upgrade<br/>(?token=jwt&interviewId=x&role=candidate)
    WS->>WS: Authenticate (verify JWT, check interview membership)
    WS->>R: Add to presence, fetch room state
    WS-->>C: editor:init, presence:sync, room:sync, coding:sync

    I->>WS: WebSocket upgrade<br/>(?token=jwt&interviewId=x&role=interviewer)
    WS-->>I: editor:init, presence:sync, room:sync

    C->>V: vapi.start(assistantConfig, metadata)
    V->>C: Voice call established

    Note over C,V: AI conducts interview via voice

    V->>C: Tool call: present_coding_challenge
    C->>WS: coding:present {challenge}
    WS->>R: Update coding state (WATCH/MULTI)
    WS-->>C: coding:sync {phase: 'presented'}
    WS-->>I: coding:sync {phase: 'presented'}

    C->>WS: coding:start
    WS->>R: Update coding state
    WS-->>C: coding:sync {phase: 'coding'}
    WS-->>I: coding:sync {phase: 'coding'}

    C->>WS: editor:change {code, language}
    WS->>R: Debounced save (1s)
    WS-->>I: editor:change {code, language, from}

    I->>WS: code:run {code, language}
    WS->>R: Acquire execution lock (SET NX)
    WS-->>C: code:running {by, executionId}
    WS-->>I: code:running {by, executionId}
    WS->>P: POST /api/v2/piston/execute
    P-->>WS: {stdout, stderr, exitCode}
    WS->>R: Save execution result
    WS-->>C: code:result {stdout, stderr, exitCode, executionTime}
    WS-->>I: code:result {stdout, stderr, exitCode, executionTime}

    V->>C: Call ends
    C->>WS: interview:complete
    WS->>R: Clear room state
```

### 4.4 AI Feedback Generation

```mermaid
sequenceDiagram
    participant C as Candidate Browser
    participant N as Next.js API
    participant V as Vapi Webhook
    participant OR as OpenRouter
    participant DB as Supabase DB
    participant CS as CodeSnapshots Table

    Note over C,N: Path 1: Frontend-triggered

    C->>N: POST /api/ai-feedback<br/>{conversation, codeSubmission, recordId}
    N->>OR: Chat completion (FEEDBACK_PROMPT)
    OR-->>N: JSON feedback
    N->>DB: UPDATE interview-feedback<br/>SET feedback = ?, processing_status = 'completed'
    N-->>C: {success: true}

    Note over V,N: Path 2: Vapi webhook fallback

    V->>N: POST /api/vapi/webhook<br/>{type: 'end-of-call-report', ...}
    N->>N: Verify x-vapi-secret (timing-safe)
    N->>DB: Check existing feedback row
    N->>CS: Fetch latest CodeSnapshot (for technical)
    N->>DB: Upsert feedback row (status: 'processing')
    N->>OR: Chat completion (FEEDBACK_PROMPT)
    OR-->>N: JSON feedback
    N->>DB: UPDATE feedback, status = 'completed'
    N-->>V: 200 OK (always, prevent retry storms)
```

---

## 5. Database Architecture

All data is stored in Supabase (PostgreSQL). The following schema is derived from actual queries in the codebase.

### Entity Relationship Diagram

```mermaid
erDiagram
    Users {
        text name
        text email PK
        text picture
        int credits
    }

    Interviews {
        uuid interview_id PK
        text jobPosition
        text jobDescription
        text candidateEmail
        int duration
        text[] type
        json questionList
        text userEmail FK
        timestamp created_at
    }

    interview_feedback {
        uuid id PK
        text userName
        text userEmail
        uuid interview_id FK
        json feedback
        text code_submission
        text code_language
        text recommended
        text processing_status
        text transcript
        text vapi_call_id
        timestamp processed_at
        timestamp created_at
    }

    InterviewEvents {
        uuid id PK
        uuid interviewId FK
        text userEmail
        text userRole
        text eventType
        json metadata
        timestamp createdAt
    }

    CodeSnapshots {
        uuid id PK
        uuid interviewId FK
        text userEmail
        text code
        text language
        text reason
        timestamp createdAt
    }

    Users ||--o{ Interviews : "userEmail"
    Interviews ||--o{ interview_feedback : "interview_id"
    Interviews ||--o{ InterviewEvents : "interviewId"
    Interviews ||--o{ CodeSnapshots : "interviewId"
```

### Table Details

**Users** — Recruiter accounts. Provisioned on first Google OAuth login. `credits` field used to gate interview creation.

**Interviews** — Created by recruiters. `type` is an array (e.g., `["Technical"]` or `["Behavioral", "Experience"]`). `questionList` stores AI-generated questions as JSON. `userEmail` is the recruiter, `candidateEmail` is the invitee.

**interview-feedback** — One row per candidate per interview. `processing_status` follows a state machine: `pending` → `processing` → `completed` | `failed`. `feedback` is a JSON object with `rating` (4 scores out of 10), `summary`, `recommendation`, `recommendationMsg`.

**InterviewEvents** — Telemetry written by the WebSocket server. Tracks join/leave, timer events, code execution, editor lock/unlock, coding challenges.

**CodeSnapshots** — Written by the WebSocket server at key moments: Interview Started, Interview Ended, Execution Succeeded, WebSocket Disconnected, WebSocket Error. Used by the Vapi webhook to recover code submissions.

### Important Constraints

- `interview-feedback` is joined to `Interviews` via `interview_id` foreign key (PostgREST syntax: `interview-feedback(*)`)
- Duplicate candidate submissions are checked client-side: query `interview-feedback` for matching `(interview_id, userEmail)` before allowing entry
- `InterviewEvents` table may not exist in all environments — the WS server handles `42P01` (table not found) gracefully
- No explicit indexes are defined in the codebase (managed by Supabase/PostgreSQL defaults)

---

## 6. API Architecture

### Next.js API Routes

| Method | Route | Auth | Rate Limited | Purpose | Service Called | DB Tables |
|--------|-------|------|-------------|---------|---------------|-----------|
| POST | `/api/ai-model` | None (public) | Yes (Upstash) | Generate interview questions | OpenRouter AI | None |
| POST | `/api/ai-feedback` | None (uses service key) | No | Generate candidate feedback | OpenRouter AI | `interview-feedback` |
| GET | `/api/interviews` | Bearer token (`verifyUser`) | No | Paginated interview list | Supabase | `Interviews`, `interview-feedback` |
| GET | `/api/analytics/kpis` | Bearer token (`verifyUser`) | No | Dashboard KPI metrics | Supabase | `Interviews`, `interview-feedback` |
| GET | `/api/analytics/candidates` | Bearer token (`verifyUser`) | No | Candidate feed with pagination | Supabase | `interview-feedback`, `Interviews` |
| POST | `/api/vapi/webhook` | `x-vapi-secret` header (HMAC) | No | End-of-call report processing | OpenRouter AI, Supabase | `interview-feedback`, `CodeSnapshots`, `Interviews` |
| GET | `/api/debug/analytics` | Env flag gate | No | Diagnostics & health check | Supabase, OpenRouter | Multiple |

### WebSocket Server REST Endpoints

| Method | Route | Auth | Purpose | Data Source |
|--------|-------|------|---------|-------------|
| GET | `/health` | None | Health check (Redis ping, memory, uptime) | Redis |
| GET | `/api/interviews/:id/timeline` | Bearer token | Interview event timeline | `InterviewEvents` (Supabase) |
| GET | `/api/interviews/:id/code` | Bearer token | Current editor document | Redis (`room:{id}:doc`) |
| GET | `/api/interviews/:id/analytics` | Bearer token (interviewer only) | Computed interview analytics | `InterviewEvents` (Supabase) |

### Detailed API: POST `/api/ai-model`

**Request:**
```json
{
  "jobPosition": "Senior Frontend Engineer",
  "jobDescription": "Build React applications...",
  "interviewDuration": 30,
  "interviewType": ["Technical"]
}
```

**Response:**
```json
{
  "interviewQuestions": [
    { "question": "Explain React's reconciliation algorithm...", "type": "Technical" }
  ]
}
```

### Detailed API: POST `/api/ai-feedback`

**Request:**
```json
{
  "conversation": [{"role": "assistant", "content": "..."}],
  "codeSubmission": "function solve() {...}",
  "codeLanguage": "javascript",
  "recordId": "uuid"
}
```

**Response:**
```json
{
  "success": true,
  "feedback": {
    "rating": { "technicalSkills": 8, "communication": 7, "problemSolving": 6, "experience": 7 },
    "summary": "...",
    "recommendation": "Hire",
    "recommendationMsg": "..."
  }
}
```

### Detailed API: GET `/api/interviews`

**Query Parameters:** `search`, `type`, `sort` (newest|oldest|alphabetical|candidates), `cursor_id`, `cursor_date`, `cursor_val`, `limit` (default 10)

**Response:**
```json
{
  "items": [{ "interview_id": "...", "jobPosition": "...", "interview-feedback": [...] }],
  "hasMore": true,
  "nextCursor": { "id": "...", "date": "...", "val": "..." },
  "totalCount": 42
}
```

---

## 7. Authentication Flow

```mermaid
sequenceDiagram
    participant B as Browser
    participant N as Next.js
    participant SA as Supabase Auth
    participant G as Google OAuth
    participant DB as Supabase DB

    Note over B,G: Login Flow
    B->>SA: signInWithOAuth({provider: 'google'})
    SA->>G: Redirect to Google consent
    G-->>SA: Authorization code
    SA->>SA: Exchange code for JWT
    SA-->>B: Set session (access_token + refresh_token)

    Note over B,N: Route Protection (Client-side)
    B->>N: Navigate to /dashboard
    N->>SA: auth.getUser()
    alt No valid session
        SA-->>N: Error
        N->>B: Redirect to /auth
    else Valid session
        SA-->>N: User {id, email, user_metadata}
        N->>DB: Check/create Users row
        N->>B: Render page with UserDetailContext
    end

    Note over B,N: API Route Auth
    B->>N: GET /api/interviews<br/>Authorization: Bearer {access_token}
    N->>N: verifyUser() extracts token
    N->>SA: auth.getUser(token)
    SA-->>N: User object
    N->>DB: Query with RLS-scoped client
    N-->>B: Response

    Note over B,N: WebSocket Auth
    B->>N: WS upgrade ?token=jwt&interviewId=x&role=candidate
    N->>SA: auth.getUser(token)
    SA-->>N: User object
    N->>DB: Verify interview membership
    alt Email matches candidateEmail for role=candidate
        N-->>B: WebSocket established
    else Mismatch
        N-->>B: 4403 Forbidden
    end
```

### Token Lifecycle

- **Access Token**: JWT issued by Supabase Auth, short-lived (configurable in Supabase, typically 1 hour)
- **Refresh Token**: Long-lived, stored in browser by Supabase client SDK
- **Auto-refresh**: Supabase JS client auto-refreshes tokens before expiry
- **Logout**: `supabase.auth.signOut()` clears local session; `(main)/layout.js` listens to `onAuthStateChange` for `SIGNED_OUT` events and redirects to `/auth`

### Auth Provider

Google OAuth is the only authentication method. There is no email/password, magic link, or other provider configured.

---

## 8. WebSocket Architecture

### Connection Lifecycle

```mermaid
sequenceDiagram
    participant C as Client
    participant WS as WS Server
    participant R as Redis

    Note over C,WS: Connection
    C->>WS: HTTP Upgrade<br/>?token=jwt&interviewId=x&role=candidate
    WS->>WS: authenticateUpgrade()<br/>(JWT verify + interview membership)
    WS->>WS: handleConnection()<br/>(assign connectionId, add to local room)
    WS->>R: HSET room:{id}:users {connId: metadata}
    WS->>R: ZADD room:{id}:presence {connId: timestamp}
    WS->>R: GET room:{id}:doc
    WS->>R: HGETALL room:{id}:users
    WS->>R: GET room:{id}:status
    WS->>R: GET room:{id}:coding
    WS-->>C: editor:init {code, language}
    WS-->>C: presence:sync {users}
    WS-->>C: room:sync {status}
    WS-->>C: coding:sync {state}
    WS-->>WS: Broadcast presence:join to room

    Note over C,WS: Heartbeat (every 30s)
    WS->>C: ping
    C-->>WS: pong (ws.isAlive = true)
    WS->>R: ZADD room:{id}:presence {connId: now}

    Note over C,WS: Disconnection
    C->>WS: close
    WS->>WS: Remove from local room registry
    WS->>R: HDEL room:{id}:users {connId}
    WS->>R: ZREM room:{id}:presence {connId}
    WS->>R: Check remaining connections for same user
    alt No other connections
        WS-->>WS: Broadcast presence:leave
        WS->>WS: Track "Candidate Left" / "Interviewer Left"
    end
```

### Event Flow

```mermaid
graph LR
    subgraph Client
        Editor["Monaco Editor"]
        Controls["Timer/Lock Controls"]
        CodeRunner["Code Executor"]
    end

    subgraph Messages["WS Message Types"]
        EC["editor:change"]
        ECur["editor:cursor"]
        EF["editor:flush"]
        TS["timer:start/pause/resume/end"]
        RL["room:lock/unlock"]
        CR["code:run"]
        CP["coding:present/start/end"]
        IC["interview:complete"]
    end

    subgraph Server["Server Processing"]
        Validate["Validate & Auth"]
        State["Update Redis State"]
        Broadcast["Broadcast to Room"]
        Track["Track Analytics"]
    end

    Editor --> EC
    Editor --> ECur
    Editor --> EF
    Controls --> TS
    Controls --> RL
    CodeRunner --> CR
    Editor --> CP
    Controls --> IC

    EC --> Validate
    ECur --> Validate
    EF --> Validate
    TS --> Validate
    RL --> Validate
    CR --> Validate
    CP --> Validate
    IC --> Validate

    Validate --> State
    State --> Broadcast
    State --> Track
```

### Redis Pub/Sub for Cross-Instance Broadcasting

```mermaid
graph TB
    subgraph Instance1["WS Server Instance 1"]
        WS1["WebSocket Handler"]
        Pub1["pubClient.publish()"]
        Sub1["subClient (subscriber)"]
        Local1["broadcastLocal()"]
    end

    subgraph Instance2["WS Server Instance 2"]
        WS2["WebSocket Handler"]
        Sub2["subClient (subscriber)"]
        Local2["broadcastLocal()"]
    end

    subgraph Redis["Redis"]
        Channel["Channel: editor:broadcast"]
    end

    WS1 -->|1. Local broadcast| Local1
    WS1 -->|2. Publish| Pub1
    Pub1 --> Channel
    Channel --> Sub1
    Channel --> Sub2
    Sub1 -->|3. Relay to local sockets| Local1
    Sub2 -->|3. Relay to local sockets| Local2
```

### Redis Key Schema

| Key Pattern | Redis Type | TTL | Purpose |
|---|---|---|---|
| `room:{id}:doc` | STRING (JSON) | 6 hours | Editor document `{code, language, updatedAt}` |
| `room:{id}:status` | STRING (JSON) | 6 hours | Room state `{interviewStatus, timerState, startedAt, pausedAt, elapsedTime, editorLocked}` |
| `room:{id}:coding` | STRING (JSON) | 6 hours | Coding challenge `{phase, challenge, startedAt}` |
| `room:{id}:executionResult` | STRING (JSON) | 6 hours | Last execution result |
| `room:{id}:executionLock` | STRING | 30 seconds | Distributed mutex for code execution |
| `room:{id}:users` | HASH | 6 hours | Connection metadata (field=connId, value=JSON) |
| `room:{id}:presence` | ZSET | 6 hours | Active connections (member=connId, score=timestamp) |

### Reconnection Strategy (Client)

- Exponential backoff: 2^n seconds, max 30 seconds
- Auto-reconnects on unexpected close
- Listens to browser `online` event for immediate reconnect
- Listens to `visibilitychange` to reconnect when tab becomes visible

---

## 9. AI Architecture

```mermaid
graph TB
    subgraph Triggers["AI Triggers"]
        QGen["Question Generation<br/>(Interview Creation)"]
        FBFront["Feedback Generation<br/>(Frontend Path)"]
        FBWebhook["Feedback Generation<br/>(Vapi Webhook Path)"]
    end

    subgraph AILayer["AI Processing Layer"]
        ORClient["OpenRouter Client<br/>(OpenAI-compatible SDK)"]
        PromptQ["QUESTIONS_PROMPT<br/>(services/Constants.jsx)"]
        PromptF["FEEDBACK_PROMPT<br/>(services/Constants.jsx)"]
        Parser["parse-ai-response.js<br/>(JSON extraction)"]
    end

    subgraph Models["AI Models"]
        ORService["OpenRouter API<br/>(openrouter.ai/api/v1)"]
        Model["Configurable Model<br/>(OPENROUTER_MODEL env var)"]
        VapiAI["Vapi Voice AI<br/>(gemini-2.0-flash)"]
    end

    QGen --> PromptQ
    PromptQ --> ORClient
    FBFront --> PromptF
    FBWebhook --> PromptF
    PromptF --> ORClient
    ORClient --> ORService
    ORService --> Model
    ORClient --> Parser

    VapiAI -->|Tool calls| FBWebhook
```

### AI Providers

| Provider | Model | Purpose | Where Used |
|---|---|---|---|
| OpenRouter | Configurable via `OPENROUTER_MODEL` (default: `nvidia/nemotron-3-super-120b-a12b:free`) | Question generation & feedback | `lib/ai/openrouter.js` |
| Vapi (Google) | `gemini-2.0-flash` | Voice AI interviewer | `app/interview/[id]/start/page.jsx` |

### Prompt Engineering

**Question Generation (`QUESTIONS_PROMPT`)**: Role-aware, seniority-aware, technology-specific prompts with strict rules separating Technical vs non-Technical interview types. Includes a self-check instruction to remove coding questions from non-Technical interviews.

**Feedback Generation (`FEEDBACK_PROMPT`)**: Takes conversation transcript + code submission. Rates 4 dimensions (technicalSkills, communication, problemSolving, experience) out of 10. Evaluates code for correctness, complexity, readability, error handling.

### Response Parsing

`parse-ai-response.js` extracts the first `{...}` JSON block from the AI's text response using regex. This handles cases where the model wraps JSON in markdown code blocks or adds explanatory text.

### Vapi Tool Calls (Technical Interviews)

Two function tools are registered with the Vapi assistant for Technical interviews:

1. **`present_coding_challenge`**: Parameters: `title` (string), `description` (string), `difficulty` (Easy/Medium/Hard), `timeLimit` (number, seconds). When the AI decides to present a coding challenge, it emits this tool call, which the frontend forwards to the WebSocket server.

2. **`end_coding_challenge`**: No parameters. Ends the active coding round.

### Error Handling & Retry

- OpenRouter calls have no explicit retry logic in the application code
- Vapi webhook always returns HTTP 200 to prevent retry storms
- `generateFeedback()` failures set `processing_status = 'failed'` in the database
- Analytics event tracking has 3 retries with exponential backoff (1s, 2s, 4s)

---

## 10. Data Flow Diagram

```mermaid
graph TB
    subgraph Recruiter["Recruiter Flow"]
        R1["1. Login (Google OAuth)"]
        R2["2. Create Interview<br/>(job details + AI questions)"]
        R3["3. Share interview link"]
        R4["4. Monitor live interview<br/>(WebSocket)"]
        R5["5. Review feedback<br/>(Analytics dashboard)"]
    end

    subgraph Candidate["Candidate Flow"]
        C1["1. Open interview link"]
        C2["2. Enter name + email"]
        C3["3. Voice interview starts<br/>(Vapi AI)"]
        C4["4. Coding challenge<br/>(Monaco Editor + WS)"]
        C5["5. Interview ends"]
    end

    subgraph Backend["Backend Processing"]
        B1["Supabase Auth<br/>(JWT tokens)"]
        B2["AI Question Gen<br/>(OpenRouter)"]
        B3["WS Room Management<br/>(Redis state)"]
        B4["Code Execution<br/>(Piston API)"]
        B5["AI Feedback Gen<br/>(OpenRouter)"]
        B6["Event Tracking<br/>(InterviewEvents)"]
    end

    subgraph Storage["Data Storage"]
        S1["Users table"]
        S2["Interviews table"]
        S3["interview-feedback table"]
        S4["InterviewEvents table"]
        S5["CodeSnapshots table"]
        S6["Redis (room state)"]
    end

    R1 --> B1 --> S1
    R2 --> B2 --> S2
    C2 --> S3
    C3 --> B6 --> S4
    C4 --> B3 --> S6
    C4 --> B4
    C5 --> B5 --> S3
    B3 --> S5
    R5 --> S3
    R5 --> S4
```

---

## 11. Folder Architecture

```
HireNext/
├── README.md
├── web/                              # Next.js 16 frontend application
│   ├── app/                          # App Router pages and API routes
│   │   ├── layout.js                 # Root layout (fonts, providers, toaster)
│   │   ├── page.js                   # Landing page (3D scene, features)
│   │   ├── provider.jsx              # Root provider (Supabase auth, user provisioning)
│   │   ├── globals.css               # Global styles (Tailwind)
│   │   ├── auth/
│   │   │   └── page.jsx              # Google OAuth login
│   │   ├── (main)/                   # Authenticated recruiter routes
│   │   │   ├── layout.js             # Auth guard + sidebar layout
│   │   │   ├── provider.js           # DashboardProvider (SidebarProvider)
│   │   │   ├── _components/
│   │   │   │   └── AppSidebar.jsx    # Navigation sidebar
│   │   │   ├── dashboard/            # Main dashboard + interview creation
│   │   │   ├── analytics/            # Intelligence Center with charts
│   │   │   ├── scheduled-interview/  # Interview workspace + details + candidate review
│   │   │   ├── all-interview/        # Full interview list
│   │   │   ├── billing/              # Mock billing page
│   │   │   └── settings/             # User settings + logout
│   │   ├── interview/                # Candidate-facing interview flow
│   │   │   ├── layout.jsx            # InterviewDataContext provider
│   │   │   ├── [interview_id]/
│   │   │   │   ├── page.jsx          # Interview lobby (name + email entry)
│   │   │   │   ├── start/
│   │   │   │   │   └── page.jsx      # Core interview (Vapi + Monaco editor)
│   │   │   │   └── completed/
│   │   │   │       └── page.jsx      # Completion screen
│   │   │   └── _components/
│   │   │       └── InterviewHeader.jsx
│   │   └── api/                      # Next.js API routes
│   │       ├── ai-model/route.jsx    # AI question generation
│   │       ├── ai-feedback/route.jsx # AI feedback generation
│   │       ├── interviews/route.jsx  # Paginated interview list
│   │       ├── analytics/            # KPI + candidate analytics endpoints
│   │       ├── vapi/webhook/route.js # Vapi end-of-call webhook
│   │       └── debug/analytics/      # Debug diagnostics
│   ├── components/                   # Reusable components
│   │   ├── Logo.jsx                  # Brand logo
│   │   ├── editor/                   # Code editor components
│   │   │   ├── monaco-workspace.jsx  # Monaco editor with WS sync
│   │   │   ├── interview-control-bar.jsx  # Interviewer timer/lock controls
│   │   │   ├── candidate-status-panel.jsx # Candidate read-only status
│   │   │   ├── execution-panel.jsx   # Code execution output
│   │   │   ├── presence-bar.jsx      # Connected users display
│   │   │   ├── connection-badge.jsx  # WS connection status
│   │   │   ├── coding-challenge-modal.jsx  # Challenge presentation overlay
│   │   │   └── coding-challenge-panel.jsx  # Active challenge timer/details
│   │   └── ui/                       # shadcn/ui primitives
│   ├── context/                      # React contexts
│   │   ├── UserDetailContext.jsx     # Authenticated user state
│   │   └── InterviewDataContext.jsx  # Active interview session state
│   ├── providers/
│   │   └── websocket-provider.jsx    # WebSocket connection provider
│   ├── hooks/
│   │   └── use-mobile.js            # Mobile viewport detection
│   ├── store/                        # Zustand state stores
│   │   ├── use-editor-store.js       # Editor content (code, language)
│   │   ├── use-connection-store.js   # WS connection status
│   │   ├── use-presence-store.js     # Connected users
│   │   ├── use-room-store.js         # Interview room state
│   │   ├── use-execution-store.js    # Code execution state
│   │   └── use-coding-store.js       # Coding challenge state
│   ├── lib/                          # Utility libraries
│   │   ├── ai/
│   │   │   ├── openrouter.js         # OpenRouter client factory
│   │   │   └── parse-ai-response.js  # AI response JSON extractor
│   │   ├── auth/
│   │   │   └── verify-user.js        # API route auth middleware
│   │   ├── feedback/
│   │   │   └── generate-feedback.js  # Feedback generation logic
│   │   ├── websocket/
│   │   │   ├── client.js             # WS client singleton (reconnection)
│   │   │   └── event-registry.js     # WS message → Zustand dispatch
│   │   ├── rate-limit.js             # Upstash rate limiter
│   │   ├── debug/logger.js           # Debug logger
│   │   └── utils.js                  # cn() utility (clsx + tailwind-merge)
│   ├── services/
│   │   ├── Constants.jsx             # Sidebar config, interview types, AI prompts
│   │   └── supabaseClient.js         # Supabase browser client singleton
│   ├── public/                       # Static assets (images)
│   ├── package.json
│   ├── next.config.mjs
│   └── postcss.config.mjs
│
└── ws-server/                        # Standalone WebSocket server
    ├── Dockerfile                    # Multi-stage Node 20 Alpine build
    ├── package.json
    └── src/
        ├── index.js                  # Entry point (startup orchestration)
        ├── app.js                    # Express app (health + REST endpoints)
        ├── config/
        │   ├── env.js                # Environment variable loader + validation
        │   ├── redis.js              # Three Redis client instances
        │   └── supabase.js           # Service-role Supabase client
        ├── ws/
        │   ├── server.js             # WS server init + heartbeat loop
        │   ├── auth.js               # WS upgrade authentication
        │   ├── connectionHandler.js  # All WS message handlers
        │   ├── pubsub.js             # Redis pub/sub cross-instance relay
        │   └── roomRegistry.js       # In-memory room → socket tracking
        ├── rooms/
        │   └── roomState.js          # All Redis state operations
        └── utils/
            ├── analytics.js          # Event tracking to Supabase
            ├── snapshots.js          # Code snapshot persistence
            ├── piston.js             # Piston API client
            └── logger.js             # Structured JSON logger
```

---

## 12. Dependency Graph

```mermaid
graph TB
    subgraph Frontend["Next.js Frontend"]
        NextPages["Pages"]
        APIRoutes["API Routes"]
        ZustandStores["Zustand Stores"]
        WSClient["WS Client"]
        VapiClient["Vapi Client"]
        MonacoEditor["Monaco Editor"]
        SupabaseSDK["Supabase Client SDK"]
        OpenRouterSDK["OpenRouter SDK"]
        UpstashSDK["Upstash Rate Limiter"]
    end

    subgraph WSBackend["WS Server"]
        WSServer["WS Server (ws)"]
        Express["Express"]
        RedisClient["Redis Client (redis)"]
        SupabaseAdmin["Supabase Admin Client"]
        PistonClient["Piston HTTP Client"]
    end

    subgraph External["External"]
        SupabaseExt["Supabase"]
        RedisExt["Redis"]
        OpenRouterExt["OpenRouter"]
        VapiExt["Vapi"]
        PistonExt["Piston"]
        GoogleExt["Google OAuth"]
        UpstashExt["Upstash"]
    end

    NextPages --> ZustandStores
    NextPages --> WSClient
    NextPages --> VapiClient
    NextPages --> MonacoEditor
    NextPages --> SupabaseSDK
    APIRoutes --> OpenRouterSDK
    APIRoutes --> SupabaseSDK
    APIRoutes --> UpstashSDK

    WSClient --> WSServer
    WSServer --> RedisClient
    WSServer --> SupabaseAdmin
    WSServer --> PistonClient

    SupabaseSDK --> SupabaseExt
    SupabaseAdmin --> SupabaseExt
    RedisClient --> RedisExt
    OpenRouterSDK --> OpenRouterExt
    VapiClient --> VapiExt
    PistonClient --> PistonExt
    SupabaseSDK --> GoogleExt
    UpstashSDK --> UpstashExt
```

---

## 13. Deployment Architecture

### Docker (WebSocket Server)

```mermaid
graph TB
    subgraph Docker["Docker Build"]
        Stage1["Stage 1: deps<br/>node:20-alpine<br/>npm ci --omit=dev"]
        Stage2["Stage 2: runner<br/>node:20-alpine<br/>Non-root user (nodejs:1001)<br/>NODE_ENV=production<br/>Port 8080"]
    end
    Stage1 -->|node_modules| Stage2
```

The WebSocket server has a production-ready Dockerfile with multi-stage build. It runs as a non-root user, installs only production dependencies, and exposes port 8080.

### Inferred Deployment Topology

Based on environment configuration and code references:

- **Frontend (Next.js)**: Deployed to **Vercel** (inferred from `CLIENT_ORIGINS` example: `https://your-app.vercel.app` and standard Next.js deployment patterns)
- **WebSocket Server**: Deployed to **Railway** or **Render** (inferred from `.env.example` comments: "Railway/Render inject PORT automatically" and Docker support)
- **Database**: **Supabase** (managed PostgreSQL + Auth)
- **Redis**: **Upstash** (inferred from `UPSTASH_REDIS_REST_URL` for rate limiting; the WS server uses a standard Redis URL which could be Upstash, Railway Redis, or other provider)
- **Code Execution**: **Piston API** (public instance at `emkc.org` or self-hosted)

### CI/CD

Not verifiable from codebase — no `.github/workflows`, `vercel.json`, `render.yaml`, or CI configuration files found.

---

## 14. Security Architecture

### What Exists

| Security Measure | Implementation | Location |
|---|---|---|
| **Authentication** | Supabase Auth with Google OAuth | `app/auth/page.jsx`, `lib/auth/verify-user.js` |
| **JWT Verification** | Server-side token verification via `supabase.auth.getUser()` | `ws-server/src/ws/auth.js`, `lib/auth/verify-user.js` |
| **Role-Based Access** | WebSocket role verification (interviewer vs candidate email matching) | `ws-server/src/ws/auth.js` |
| **Origin Validation** | WS upgrade origin check against allowlist | `ws-server/src/ws/auth.js` |
| **CORS** | Express CORS middleware with explicit origin allowlist | `ws-server/src/app.js` |
| **Rate Limiting** | Upstash Redis-based rate limiting on `/api/ai-model` | `lib/rate-limit.js` |
| **Webhook Auth** | Timing-safe secret comparison for Vapi webhook | `app/api/vapi/webhook/route.js` |
| **Input Validation** | Code execution: language whitelist, 50KB code size limit | `ws-server/src/ws/connectionHandler.js` |
| **Input Sanitization** | Coding challenge: title/description length clamping, difficulty whitelist, time limit range clamping | `ws-server/src/ws/connectionHandler.js` |
| **Editor Locking** | Server-side enforcement preventing locked candidates from editing | `ws-server/src/ws/connectionHandler.js` |
| **Non-Root Docker** | Production container runs as uid 1001 | `ws-server/Dockerfile` |
| **Execution Mutex** | Redis-based distributed lock prevents concurrent code execution per room | `ws-server/src/rooms/roomState.js` |
| **Service Role Isolation** | Admin Supabase client only used server-side, never exposed to browser | API routes, WS server |
| **Stale Presence Cleanup** | 45-second timeout removes ghost connections from Redis | `ws-server/src/rooms/roomState.js` |

### What Is Missing

| Security Concern | Status |
|---|---|
| **CSRF Protection** | Not implemented (Next.js API routes lack CSRF tokens) |
| **XSS Protection** | Relies on React's default escaping; no explicit CSP headers |
| **Security Headers** | No `helmet` or equivalent; no CSP, HSTS, X-Frame-Options headers found |
| **SQL Injection Protection** | N/A — all queries go through Supabase client SDK (parameterized) |
| **API Rate Limiting** | Only on `/api/ai-model`; other API routes are unprotected |
| **Input Validation on API Routes** | Minimal — most API routes trust request body structure |
| **Secrets in Environment** | Standard env-var approach; no vault or secrets manager integration |
| **WebSocket Message Validation** | Partial — `code:run` validates payload, but `editor:change` and `editor:cursor` do not validate payload structure |
| **Audit Logging** | Event tracking exists but is fire-and-forget; no guaranteed delivery |

---

## 15. Performance Architecture

### What Exists

| Technique | Implementation | Location |
|---|---|---|
| **Debounced Writes** | 1-second debounce on editor changes before Redis persistence | `ws-server/src/ws/connectionHandler.js` |
| **Cursor-Based Pagination** | Efficient compound cursor pagination for interview lists | `app/api/interviews/route.jsx`, `app/api/analytics/candidates/route.js` |
| **Dynamic Imports** | `SkillsBreakdownChart` loaded with `next/dynamic` (SSR disabled) | `app/(main)/analytics/page.jsx` |
| **Redis State Caching** | Room state stored in Redis with 6-hour TTL (not hitting PostgreSQL per keystroke) | `ws-server/src/rooms/roomState.js` |
| **Optimistic Concurrency** | WATCH/MULTI transactions for room status updates | `ws-server/src/rooms/roomState.js` |
| **Execution Locking** | Distributed mutex prevents wasted parallel code executions | `ws-server/src/ws/connectionHandler.js` |
| **Fire-and-Forget Analytics** | Event tracking is async, does not block message handling | `ws-server/src/utils/analytics.js` |
| **Multi-Tab Dedup** | Presence tracking avoids duplicate join/leave events for same user | `ws-server/src/ws/connectionHandler.js` |
| **Heartbeat Cleanup** | 45-second stale connection pruning | `ws-server/src/rooms/roomState.js` |
| **Zustand State** | Lightweight state management, no unnecessary re-renders | `web/store/` |

### What Could Be Improved

| Area | Current State |
|---|---|
| **Code Splitting** | No evidence of route-based code splitting beyond Next.js defaults |
| **Memoization** | No `React.memo`, `useMemo`, or `useCallback` usage observed in editor components |
| **Database Indexing** | No custom indexes defined (relies on Supabase/PG defaults) |
| **CDN / Static Assets** | No explicit CDN configuration (Next.js/Vercel provides default) |
| **WebSocket Compression** | Not enabled on the WS server |
| **Batch Queries** | Analytics KPIs fetch all interviews + feedback in a single query (no pagination for aggregation) |
| **Streaming** | AI responses are not streamed to the client |

---

## 16. External Services

| Service | Purpose | Where Used | Modules That Call It |
|---|---|---|---|
| **Supabase (Auth)** | Google OAuth, JWT issuance & verification | Both apps | `supabaseClient.js`, `verify-user.js`, `ws-server/src/ws/auth.js`, `ws-server/src/config/supabase.js` |
| **Supabase (PostgreSQL)** | Primary database for all persistent data | Both apps | All API routes, WS server analytics/snapshots |
| **Redis (Upstash or standard)** | WS room state, pub/sub, execution locks, presence | WS server | `ws-server/src/config/redis.js`, `ws-server/src/rooms/roomState.js` |
| **Upstash Redis** | Rate limiting for AI question generation API | Next.js API | `lib/rate-limit.js` |
| **OpenRouter** | AI model gateway (question generation + feedback) | Next.js API | `lib/ai/openrouter.js`, `lib/feedback/generate-feedback.js` |
| **Vapi** | Voice AI interviewer (WebRTC audio, function calling) | Next.js client | `app/interview/[id]/start/page.jsx` |
| **Piston API** | Sandboxed code execution (JS, TS, Python, Java, C++, C) | WS server | `ws-server/src/utils/piston.js` |
| **Google OAuth** | Identity provider for recruiter authentication | Via Supabase Auth | `app/auth/page.jsx` |
| **Spline** | 3D scene on landing page | Next.js client | `components/ui/splite.jsx` |

---

## 17. Environment Variables

### Next.js Frontend (`web/.env`)

| Variable | Required | Purpose |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Yes | Supabase anonymous key (browser-safe) |
| `OPENROUTER_API_KEY` | Yes | OpenRouter API authentication |
| `OPENROUTER_MODEL` | Yes | AI model identifier (e.g., `nvidia/nemotron-3-super-120b-a12b:free`) |
| `NEXT_PUBLIC_HOST_URL` | Yes | Base URL for interview share links |
| `NEXT_PUBLIC_VAPI_PUBLIC_KEY` | Yes | Vapi client SDK key |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes | Admin Supabase access for API routes |
| `NEXT_PUBLIC_VAPI_SERVER_URL` | No | Vapi webhook URL (enables webhook fallback path) |
| `VAPI_WEBHOOK_SECRET` | Conditional | Required when webhook is enabled |
| `NEXT_PUBLIC_WS_SERVER_URL` | Yes | WS server HTTP URL (code fetch) |
| `NEXT_PUBLIC_WS_URL` | Yes | WS server WebSocket URL |
| `NEXT_PUBLIC_DEBUG_ANALYTICS` | No | Enable debug diagnostics |
| `UPSTASH_REDIS_REST_URL` | Yes | Rate limiting Redis URL |
| `UPSTASH_REDIS_REST_TOKEN` | Yes | Rate limiting Redis token |

### WebSocket Server (`ws-server/.env`)

| Variable | Required | Purpose |
|---|---|---|
| `PORT` | No (default: 8080) | HTTP/WS server port |
| `CLIENT_ORIGINS` | Production only | Comma-separated allowed CORS/WS origins |
| `REDIS_URL` | Yes | Redis connection URL |
| `SUPABASE_URL` | Yes | Supabase project URL |
| `SUPABASE_ANON_KEY` | Yes (loaded but unused) | Required by env validation but not used |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes | Admin Supabase access |
| `PISTON_API_URL` | Yes | Code execution API endpoint |
| `INSTANCE_ID` | No (auto-generated) | Server instance identifier for pub/sub |

---

## 18. Architecture Summary

### Strengths

**Well-separated concerns.** The WebSocket server is a standalone service with its own Dockerfile, independent of the Next.js app. This allows independent scaling of the real-time layer.

**Robust room state management.** Redis-backed room state with WATCH/MULTI optimistic concurrency, distributed execution locks, and stale presence cleanup provides reliable multi-user coordination.

**Dual feedback paths.** Both a frontend-triggered path and a Vapi webhook fallback path ensure feedback generation is resilient. The webhook handler uses idempotent processing with a state machine (`pending` → `processing` → `completed` | `failed`).

**Cross-instance support.** Redis pub/sub architecture enables horizontal scaling of WebSocket servers (multiple instances can serve the same room).

**Type-safe interview scoping.** The AI prompt engineering strictly separates Technical from non-Technical interview types, preventing coding questions from appearing in behavioral interviews.

**Comprehensive event tracking.** 18 distinct event types are tracked to `InterviewEvents`, enabling detailed interview analytics and timeline reconstruction.

**Production Docker practices.** Multi-stage build, non-root user, production-only dependencies.

### Weaknesses

**No test suite.** Neither the frontend nor the WebSocket server has any tests (no test files, no test dependencies, no test scripts in `package.json`).

**Bug in pub/sub sender exclusion.** `roomRegistry.js` searches for `ws.__tag` but the code sets `ws.connectionId`. This means `getRoomSocket()` always returns null, causing the sender to receive their own echoed message via pub/sub.

**Unused required env var.** `SUPABASE_ANON_KEY` is required by the WS server's `env.js` but is never used — the Supabase client uses `SERVICE_ROLE_KEY` exclusively.

**Client-side route protection only.** The `(main)/layout.js` auth guard runs in the browser. While API routes verify tokens server-side, the page-level protection could be bypassed to see the page shell (though no data would load).

**No input validation on most API routes.** The `/api/ai-model` route doesn't validate request body structure. The `/api/ai-feedback` route doesn't verify the caller is authorized for the given `recordId`.

**Mock billing page.** The billing/subscription system is entirely hardcoded UI with no payment integration (no Stripe, no payment processing).

**Settings don't persist.** The settings page has UI for profile and interview configuration but no save logic beyond logout and account deletion (which itself only shows a toast).

### Risks

**Scalability:** The analytics KPI endpoint fetches ALL interviews and feedback for a user in a single query. For power users with hundreds of interviews, this will degrade. No database indexes are explicitly managed.

**Security:** The `/api/ai-feedback` endpoint uses a service-role Supabase client and does not verify the caller's identity or authorization for the given `recordId`. Any client with the endpoint URL could trigger feedback generation for any record.

**Reliability:** Analytics event tracking is fire-and-forget with no guaranteed delivery. The `InterviewEvents` table may not exist (handled gracefully but silently). Code snapshots also fail silently.

**Maintainability:** All AI prompts are stored as template strings in `Constants.jsx` alongside unrelated UI constants (sidebar options, interview types). No prompt versioning or A/B testing infrastructure.

**Data Consistency:** The `credits` field on `Users` is decremented client-side after interview creation. A race condition could allow a user to create more interviews than their credit balance allows by opening multiple tabs.

### Improvement Suggestions

1. **Add a test suite.** Start with integration tests for API routes and unit tests for `roomState.js` and `connectionHandler.js` — these are the highest-risk modules.

2. **Fix the pub/sub sender exclusion bug.** In `connectionHandler.js`, set `ws.__tag = connectionId` after assigning `connectionId`, or update `getRoomSocket()` to search by `ws.connectionId`.

3. **Add server-side route protection.** Use Next.js middleware (`middleware.js`) to verify auth tokens before rendering protected pages, preventing unauthorized users from seeing even the page shell.

4. **Validate API inputs.** Add schema validation (e.g., Zod) to all API routes. Verify caller authorization in `/api/ai-feedback` by checking token ownership of the `recordId`.

5. **Implement server-side credit enforcement.** Move credit deduction to an API route with a database transaction to prevent race conditions.

6. **Add rate limiting to remaining API routes.** Currently only `/api/ai-model` is rate-limited. Apply limits to `/api/ai-feedback`, `/api/interviews`, and analytics endpoints.

7. **Paginate analytics aggregation.** The KPI endpoint should use database-level aggregation (COUNT, AVG) instead of fetching all rows into memory.

8. **Add security headers.** Implement CSP, HSTS, X-Frame-Options, and other security headers via Next.js middleware or `next.config.mjs`.

9. **Separate prompts from UI constants.** Move AI prompts to dedicated files with versioning support.

10. **Enable WebSocket compression.** Add `perMessageDeflate` to the WS server configuration to reduce bandwidth for code-heavy messages.
