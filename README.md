<p align="center">
  <h1 align="center">HireNext</h1>
  <p align="center">AI-powered voice interview platform with real-time coding collaboration and automated candidate evaluation.</p>
</p>

<p align="center">
  <a href="#license"><img src="https://img.shields.io/badge/license-MIT-green.svg" alt="License: MIT"></a>
  <img src="https://img.shields.io/badge/version-0.1.0-blue.svg" alt="Version">
  <img src="https://img.shields.io/badge/Next.js-16-black?logo=next.js" alt="Next.js 16">
  <img src="https://img.shields.io/badge/React-19-61DAFB?logo=react" alt="React 19">
  <img src="https://img.shields.io/badge/Supabase-backend-3FCF8E?logo=supabase" alt="Supabase">
  <img src="https://img.shields.io/badge/Vapi-voice%20AI-purple" alt="Vapi AI">
</p>

---

## Overview

Hiring is broken. Recruiters spend hours scheduling calls, running repetitive screens, and manually scoring candidates — only to end up with inconsistent, subjective evaluations. HireNext fixes this by replacing the manual loop with an AI voice agent that conducts live interviews, scores candidates in real time, and surfaces recruiter-ready analytics.

A recruiter creates an interview, shares a link, and the candidate talks to an AI interviewer powered by [Vapi](https://vapi.ai). For technical roles, a collaborative code editor (backed by a WebSocket server and Monaco) lets candidates write and run code during the conversation. When the call ends, [OpenRouter](https://openrouter.ai) generates structured feedback — scores, skill breakdowns, and a hire/no-hire recommendation — and persists it to Supabase. The recruiter sees everything in an Intelligence Center dashboard without ever joining a call.

## Features

- **AI Voice Interviews** — Vapi-powered conversational agent conducts behavioral, technical, and mixed interviews with configurable duration and question types.
- **Live Collaborative Code Editor** — Monaco-based editor with WebSocket synchronization, multi-cursor presence indicators, and a coding challenge panel for technical interviews.
- **Automated Feedback & Scoring** — OpenRouter LLM generates structured JSON feedback (technical skills, communication, problem solving, experience) with a hire recommendation immediately after each interview.
- **Intelligence Center Dashboard** — Recruiter analytics with KPI cards (avg score, hire rate, top score), per-role performance breakdowns, skills radar, top candidate rankings, and an activity feed.
- **Shareable Interview Links** — One-click interview creation with a unique link that candidates open in-browser — no accounts, no downloads, no scheduling back-and-forth.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 16 (App Router) |
| UI | React 19, Tailwind CSS 4, Radix UI, Lucide Icons, Recharts |
| Voice AI | Vapi Web SDK |
| LLM | OpenRouter (configurable model, default Nemotron) |
| Database & Auth | Supabase (Postgres + Row-Level Security + Auth) |
| Code Editor | Monaco Editor (`@monaco-editor/react`) |
| Real-time Sync | WebSocket server (Express + `ws` + Redis pub/sub) |
| Rate Limiting | Upstash Redis |
| State Management | Zustand |

## Getting Started

### Prerequisites

- **Node.js** 18+
- **npm** (or yarn/pnpm)
- A [Supabase](https://supabase.com) project (database + auth)
- A [Vapi](https://vapi.ai) account (voice agent)
- An [OpenRouter](https://openrouter.ai) API key (LLM feedback)
- An [Upstash](https://upstash.com) Redis instance (rate limiting)

### Installation

```bash
# Clone the repository
git clone https://github.com/<your-username>/HireNext.git
cd HireNext

# Install web app dependencies
cd web
npm install

# Install WebSocket server dependencies
cd ../ws-server
npm install
```

### Configure Environment

Copy the example env file and fill in your credentials:

```bash
cd web
cp .env.example .env.local
```

<details>
<summary><strong>Environment Variables</strong></summary>

#### Required

| Variable | Description |
|----------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Your Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anonymous (public) key |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key (server-side writes) |
| `OPENROUTER_API_KEY` | OpenRouter API key for LLM feedback |
| `OPENROUTER_MODEL` | Model identifier (e.g. `nvidia/nemotron-3-super-120b-a12b:free`) |
| `NEXT_PUBLIC_VAPI_PUBLIC_KEY` | Vapi public key for the voice agent |
| `NEXT_PUBLIC_HOST_URL` | Base URL for interview links (e.g. `http://localhost:3000/interview`) |
| `UPSTASH_REDIS_REST_URL` | Upstash Redis REST endpoint |
| `UPSTASH_REDIS_REST_TOKEN` | Upstash Redis REST token |

#### Real-time Code Editor

| Variable | Description |
|----------|-------------|
| `NEXT_PUBLIC_WS_SERVER_URL` | HTTP URL of the WebSocket server (default `http://localhost:8080`) |
| `NEXT_PUBLIC_WS_URL` | WebSocket URL the editor connects to (default `ws://localhost:8080`) |

#### Optional

| Variable | Description |
|----------|-------------|
| `NEXT_PUBLIC_VAPI_SERVER_URL` | Public URL for the Vapi webhook fallback path |
| `VAPI_WEBHOOK_SECRET` | Shared secret for authenticating Vapi webhook requests |
| `NEXT_PUBLIC_DEBUG_ANALYTICS` | Set to `true` to enable the diagnostics debug button |

</details>

### Run Locally

```bash
# Terminal 1 — Start the WebSocket server
cd ws-server
npm run dev          # Runs on port 8080

# Terminal 2 — Start the Next.js app
cd web
npm run dev          # Runs on port 3000
```

Open [http://localhost:3000](http://localhost:3000) to access the app.

### Build for Production

```bash
cd web
npm run build
npm run start
```

## Usage

1. **Sign in** via Supabase Auth (email/password or OAuth).
2. **Create an interview** from the dashboard — pick a job title, description, interview type (behavioral, technical, or mixed), and duration.
3. **Share the link** with your candidate. They open it in a browser, no account required.
4. **Candidate interviews** with the AI voice agent. For technical interviews, a live code editor appears alongside the conversation.
5. **Review results** in the Intelligence Center — scores, skill breakdowns, hire recommendations, and per-role performance comparisons.

## Project Structure

```
HireNext/
├── web/                          # Next.js application
│   ├── app/
│   │   ├── (auth)/               # Auth pages (sign-in, sign-up)
│   │   ├── (main)/               # Authenticated app shell
│   │   │   ├── dashboard/        # Interview creation & overview
│   │   │   ├── analytics/        # Intelligence Center dashboard
│   │   │   ├── all-interview/    # Interview list
│   │   │   ├── scheduled-interview/  # Candidate review & details
│   │   │   └── settings/        # Account settings
│   │   ├── interview/            # Public candidate interview page
│   │   └── api/                  # API routes
│   │       ├── ai-feedback/      # LLM feedback generation
│   │       ├── ai-model/         # Question generation
│   │       ├── analytics/        # KPI & candidate analytics
│   │       └── vapi/             # Vapi webhook handler
│   ├── components/
│   │   └── editor/               # Monaco code editor components
│   ├── lib/
│   │   ├── ai/                   # OpenRouter client & response parser
│   │   ├── auth/                 # Token verification
│   │   ├── feedback/             # Feedback generation pipeline
│   │   └── websocket/            # WS client & event registry
│   └── store/                    # Zustand stores
└── ws-server/                    # WebSocket collaboration server
    └── src/
        ├── ws/                   # WebSocket server & room management
        └── config/               # Redis & environment config
```

## Contributing

Contributions are welcome. To get started:

1. **Fork** the repository.
2. **Create a feature branch** from `main`:
   ```bash
   git checkout -b feat/your-feature-name
   ```
3. **Make your changes** — keep commits focused and descriptive.
4. **Test locally** to make sure the app and WebSocket server both run cleanly.
5. **Open a pull request** against `main` with a clear description of what you changed and why.

Please follow existing code conventions (functional components, Tailwind for styling, Radix primitives for UI). If your change touches the analytics pipeline or feedback generation, verify the data flows end-to-end from the database through the API to the dashboard.

## License

This project is licensed under the [MIT License](LICENSE).

---

<p align="center">Built by <a href="https://github.com/<your-username>">ut</a></p>
