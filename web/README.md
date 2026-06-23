<div align="center">

# 🚀 HireNext

### Your AI-Powered Hiring Assistant

[![Next.js](https://img.shields.io/badge/Next.js-16-black?style=for-the-badge&logo=next.js&logoColor=white)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19-61DAFB?style=for-the-badge&logo=react&logoColor=black)](https://react.dev/)
[![Supabase](https://img.shields.io/badge/Supabase-Auth%20%26%20DB-3FCF8E?style=for-the-badge&logo=supabase&logoColor=white)](https://supabase.com/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-4-06B6D4?style=for-the-badge&logo=tailwindcss&logoColor=white)](https://tailwindcss.com/)
[![Vapi AI](https://img.shields.io/badge/Vapi-Voice%20Agents-7C3AED?style=for-the-badge)](https://vapi.ai/)
[![Deployed on Vercel](https://img.shields.io/badge/Vercel-Deployed-000?style=for-the-badge&logo=vercel&logoColor=white)](https://hire-next-blush.vercel.app/)

**Automate your screening process.** HireNext uses AI voice agents to conduct natural interviews, generate tailored questions, and deliver instant candidate feedback — so you can hire smarter, faster, and fairer.

[🌐 Live Demo](https://hire-next-blush.vercel.app/) · [🐛 Report Bug](https://github.com/bipul724/HireNext/issues) · [✨ Request Feature](https://github.com/bipul724/HireNext/issues)

</div>

---

## 📖 Table of Contents

- [About the Project](#-about-the-project)
- [Features](#-features)
- [Tech Stack](#-tech-stack)
- [Prerequisites](#-prerequisites)
- [Installation](#-installation)
- [Configuration](#-configuration)
- [Usage](#-usage)
- [Project Structure](#-project-structure)
- [API Routes](#-api-routes)
- [Contributing](#-contributing)
- [License](#-license)
- [Contact & Acknowledgements](#-contact--acknowledgements)

---

## 🧠 About the Project

Traditional hiring pipelines are slow, inconsistent, and resource-heavy. **HireNext** solves this by putting an AI interviewer in the driver's seat.

Recruiters create interviews from a simple dashboard — specifying the job role, description, duration, and interview type. The platform uses **OpenRouter AI** (powered by NVIDIA Nemotron) to auto-generate tailored interview questions, and **Vapi AI** voice agents to conduct real-time, natural-sounding voice interviews with candidates — available 24/7, no scheduling hassles.

After each interview, candidates receive an **instant AI-generated feedback report** with ratings on technical skills, communication, problem-solving, and experience — along with a hire/no-hire recommendation.

---

## ✨ Features

- 🎯 **AI Question Generation** — Auto-generate role-specific interview questions based on job title, description, type, and duration
- 🎙️ **Voice Agent Interviews** — Candidates interact with a Vapi-powered AI voice agent that simulates a natural conversation
- 📊 **Instant AI Feedback** — Receive structured feedback with ratings (technical skills, communication, problem-solving, experience) and a hire recommendation
- 🔐 **Google OAuth Authentication** — Seamless sign-in via Supabase Auth with Google OAuth
- 📋 **Interview Dashboard** — Create, manage, and track all interviews from a centralized dashboard
- 📅 **Interview Workspace** — Manage active interviews and review candidate feedback
- 📈 **Analytics** — Visualize interview data and hiring metrics with interactive Recharts graphs
- 🔗 **Shareable Interview Links** — Candidates join directly from the browser — no software installation required
- 🎨 **3D Visual Landing Page** — Stunning hero section powered by Spline 3D scenes
- 📱 **Fully Responsive** — Optimized for desktop, tablet, and mobile devices
- 🌙 **Dark Mode Support** — Built-in dark/light theme switching via `next-themes`
- ⚡ **React Compiler** — Leverages the experimental React Compiler for optimized performance

---

## 🛠️ Tech Stack

| Layer            | Technology                                                                         |
| ---------------- | ---------------------------------------------------------------------------------- |
| **Framework**    | [Next.js 16](https://nextjs.org/) (App Router)                                     |
| **Frontend**     | [React 19](https://react.dev/), JSX                                                |
| **Styling**      | [Tailwind CSS 4](https://tailwindcss.com/), [tw-animate-css](https://github.com/Wombosvideo/tw-animate-css) |
| **UI Components**| [shadcn/ui](https://ui.shadcn.com/) (New York style), [Radix UI](https://radix-ui.com/) |
| **Icons**        | [Lucide React](https://lucide.dev/)                                                |
| **Animations**   | [Framer Motion](https://www.framer.com/motion/)                                    |
| **3D Graphics**  | [Spline](https://spline.design/) (`@splinetool/react-spline`)                      |
| **Charts**       | [Recharts](https://recharts.org/)                                                  |
| **Auth & DB**    | [Supabase](https://supabase.com/) (Auth + PostgreSQL)                              |
| **AI / LLM**     | [OpenRouter](https://openrouter.ai/) (NVIDIA Nemotron model via OpenAI SDK)        |
| **Voice AI**     | [Vapi AI](https://vapi.ai/) (`@vapi-ai/web`)                                      |
| **HTTP Client**  | [Axios](https://axios-http.com/)                                                   |
| **Notifications**| [Sonner](https://sonner.emilkowal.dev/)                                            |
| **Fonts**        | [Geist](https://vercel.com/font) (Sans & Mono via `next/font`)                     |
| **Deployment**   | [Vercel](https://vercel.com/)                                                      |

---

## 📋 Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js** — `v18.17` or higher → [Download](https://nodejs.org/)
- **npm** — `v9+` (bundled with Node.js)
- **Git** — [Download](https://git-scm.com/)

You will also need accounts for:

| Service      | Purpose                        | Link                                       |
| ------------ | ------------------------------ | ------------------------------------------ |
| **Supabase** | Authentication & database      | [supabase.com](https://supabase.com/)      |
| **OpenRouter**| AI model API (question gen & feedback) | [openrouter.ai](https://openrouter.ai/) |
| **Vapi AI**  | Voice agent for interviews     | [vapi.ai](https://vapi.ai/)               |

---

## 🚀 Installation

**1. Clone the repository**

```bash
git clone https://github.com/bipul724/HireNext.git
cd HireNext
```

**2. Install dependencies**

```bash
npm install
```

**3. Set up environment variables**

Copy the example file and fill in your credentials:

```bash
cp .env.example .env.local
```

See the [Configuration](#-configuration) section for details on each variable.

**4. Set up Supabase**

- Create a new project at [supabase.com](https://supabase.com/)
- Enable **Google OAuth** in `Authentication → Providers → Google`
- Create a `Users` table with columns: `name` (text), `email` (text), `picture` (text)
- Create an `interviews` table to store interview records
- Copy your project URL and anon key into `.env.local`

**5. Start the development server**

```bash
npm run dev
```

**6. Open in browser**

Navigate to [http://localhost:3000](http://localhost:3000) — you're ready to go! 🎉

---

## ⚙️ Configuration

Create a `.env.local` file in the project root with the following variables:

```env
# ─── Supabase ────────────────────────────────────────────────
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key

# ─── OpenRouter (AI Question Generation & Feedback) ─────────
OPENROUTER_API_KEY=sk-or-v1-your_openrouter_api_key

# ─── Host URL (Interview Link Base URL) ─────────────────────
NEXT_PUBLIC_HOST_URL=http://localhost:3000/interview

# ─── Vapi AI (Voice Agent) ──────────────────────────────────
NEXT_PUBLIC_VAPI_PUBLIC_KEY=your_vapi_public_key
```

| Variable                        | Description                                      | Required |
| ------------------------------- | ------------------------------------------------ | -------- |
| `NEXT_PUBLIC_SUPABASE_URL`      | Your Supabase project URL                        | ✅        |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anonymous (public) key                  | ✅        |
| `OPENROUTER_API_KEY`            | API key from OpenRouter for AI model access       | ✅        |
| `NEXT_PUBLIC_HOST_URL`          | Base URL for shareable interview links            | ✅        |
| `NEXT_PUBLIC_VAPI_PUBLIC_KEY`   | Public key from Vapi AI for voice agent SDK       | ✅        |

> [!WARNING]
> Never commit your `.env.local` file. It is already included in `.gitignore`.

---

## 💡 Usage

### For Recruiters

1. **Sign in** with your Google account at `/auth`
2. **Create an interview** from the dashboard — specify job title, description, interview type (Technical / Behavioral / Experience / Problem Solving / Leadership), and duration
3. **Generate questions** — click the AI generate button and the platform will auto-create tailored questions
4. **Share the interview link** with candidates via email or messaging
5. **Review feedback** — after the candidate completes the voice interview, view detailed AI-generated ratings and recommendations

### For Candidates

1. **Open the interview link** shared by the recruiter (no sign-up or install required)
2. **Start the voice interview** — speak naturally with the AI interviewer
3. **View your results** — receive instant feedback with scores and a summary

### Available Scripts

```bash
# Start development server
npm run dev

# Build for production
npm run build

# Start production server
npm start
```

---

## 📁 Project Structure

```
HireNext/
├── app/
│   ├── (main)/                     # Authenticated routes (dashboard layout)
│   │   ├── _components/            # Shared components (AppSidebar)
│   │   ├── dashboard/              # Dashboard & create interview pages
│   │   ├── all-interview/          # List all interviews
│   │   ├── scheduled-interview/    # Interview Workspace with details
│   │   ├── analytics/              # Interview analytics & charts
│   │   ├── billing/                # Billing & pricing page
│   │   ├── settings/               # User settings
│   │   ├── layout.js               # Auth-guarded layout with sidebar
│   │   └── provider.js             # Dashboard context provider
│   ├── api/
│   │   ├── ai-model/route.jsx      # AI question generation endpoint
│   │   └── ai-feedback/route.jsx   # AI interview feedback endpoint
│   ├── auth/
│   │   └── page.jsx                # Google OAuth login page
│   ├── interview/
│   │   ├── [interview_id]/         # Dynamic interview pages
│   │   │   ├── start/              # Voice interview session
│   │   │   └── completed/          # Interview completed + feedback
│   │   ├── _components/            # Interview-specific components
│   │   └── layout.jsx              # Interview layout
│   ├── globals.css                 # Global styles & CSS variables
│   ├── layout.js                   # Root layout (fonts, providers)
│   ├── page.js                     # Landing page
│   └── provider.jsx                # Global auth provider & useUser hook
├── components/
│   ├── ui/                         # shadcn/ui components (button, card, dialog, etc.)
│   └── Logo.jsx                    # Logo component
├── context/
│   ├── UserDetailContext.jsx       # User details context
│   └── InterviewDataContext.jsx    # Interview data context
├── hooks/
│   └── use-mobile.js               # Mobile detection hook
├── lib/
│   └── utils.js                    # Utility functions (cn helper)
├── services/
│   ├── Constants.jsx               # Sidebar options, interview types & AI prompts
│   └── supabaseClient.js           # Supabase client initialization
├── public/                         # Static assets (logos, illustrations)
├── next.config.mjs                 # Next.js configuration
├── components.json                 # shadcn/ui configuration
├── package.json                    # Dependencies & scripts
└── .gitignore                      # Ignored files & directories
```

---

## 🔌 API Routes

| Method | Endpoint             | Description                                          |
| ------ | -------------------- | ---------------------------------------------------- |
| `POST` | `/api/ai-model`      | Generates interview questions based on job details    |
| `POST` | `/api/ai-feedback`   | Analyzes interview conversation and returns feedback  |

### `POST /api/ai-model`

**Request Body:**

```json
{
  "jobPosition": "Senior React Developer",
  "jobDescription": "Build scalable web applications...",
  "interviewDuration": "30 minutes",
  "interviewType": "Technical"
}
```

**Response:**

```json
{
  "interviewQuestions": [
    {
      "question": "Can you explain the virtual DOM and reconciliation in React?",
      "type": "Technical"
    }
  ]
}
```

### `POST /api/ai-feedback`

**Request Body:**

```json
{
  "conversation": [
    { "role": "assistant", "content": "Tell me about your experience with React hooks." },
    { "role": "user", "content": "I have 3 years of experience..." }
  ]
}
```

**Response:**

```json
{
  "feedback": {
    "rating": {
      "techicalSkills": 8,
      "communication": 7,
      "problemSolving": 9,
      "experince": 8
    },
    "summery": "The candidate demonstrated strong technical knowledge...",
    "Recommendation": "Yes",
    "RecommendationMsg": "Highly recommended for the role."
  }
}
```

---

## 🤝 Contributing

Contributions are what make the open-source community amazing. Any contributions you make are **greatly appreciated**!

1. **Fork** the repository
2. **Create** your feature branch
   ```bash
   git checkout -b feature/amazing-feature
   ```
3. **Commit** your changes
   ```bash
   git commit -m "feat: add amazing feature"
   ```
4. **Push** to the branch
   ```bash
   git push origin feature/amazing-feature
   ```
5. **Open** a Pull Request

### Guidelines

- Follow [Conventional Commits](https://www.conventionalcommits.org/) for commit messages
- Write clean, readable code with meaningful variable names
- Keep components small and focused
- Test your changes locally before submitting a PR
- Update documentation if you change any public-facing APIs

---

## 📄 License

Distributed under the **MIT License**. See `LICENSE` for more information.

---

## 📬 Contact & Acknowledgements

**Bipul Chamoli** — [@bipul724](https://github.com/bipul724)

Project Link: [https://github.com/bipul724/HireNext](https://github.com/bipul724/HireNext)

### Acknowledgements

- [Next.js](https://nextjs.org/) — The React framework for production
- [Supabase](https://supabase.com/) — Open-source Firebase alternative
- [Vapi AI](https://vapi.ai/) — Voice AI platform for conversational agents
- [OpenRouter](https://openrouter.ai/) — Unified API for AI models
- [shadcn/ui](https://ui.shadcn.com/) — Beautifully designed UI components
- [Spline](https://spline.design/) — 3D design tool for the web
- [Vercel](https://vercel.com/) — Deployment and hosting platform
- [Lucide](https://lucide.dev/) — Beautiful & consistent icon library
- [Framer Motion](https://www.framer.com/motion/) — Production-ready animations

---

<div align="center">

**⭐ If you found this project helpful, please give it a star!**

Made with ❤️ by [Bipul Chamoli](https://github.com/bipul724)

</div>
