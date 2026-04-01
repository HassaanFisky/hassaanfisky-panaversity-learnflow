# LearnFlow — Adaptive Python Learning Platform

> **Panaversity Hackathon 3** · Agentic Microservices · Groq · Supabase · Next.js · Koyeb

LearnFlow is a production-grade adaptive learning system that pairs a magazine-quality Next.js frontend with an intelligent mesh of five FastAPI microservices. A **Triage Agent** (powered by Groq `llama-3.3-70b-versatile` tool-calling) acts as the central router — it reads each learner's message, selects the most appropriate specialist service, and returns a structured, pedagogically correct response.

---

## Architecture

```
┌────────────────────────────────────────────────────────────┐
│                    Next.js Frontend (Vercel)                │
│  Landing · Learn · [Module] · [Topic] · Practice ·         │
│  Progress · Teacher Dashboard                               │
└──────────┬──────────────────────────────────────────────────┘
           │  HTTPS
           ▼
┌──────────────────────────────┐
│   Triage Service  :8000      │  ← Groq tool_calling router
│   POST /triage               │    llama-3.3-70b-versatile
└──────┬───────────────────────┘
       │  httpx (async)
       ├──▶  Concepts Service  :8001  POST /explain
       ├──▶  Code Review       :8002  POST /review
       ├──▶  Debug Service     :8003  POST /debug
       ├──▶  Exercise Service  :8004  POST /generate  POST /grade
       └──▶  Progress Service  :8005  GET/POST /progress/{user_id}
                                           │
                                           ▼
                                   Supabase (PostgreSQL)
                                   modules · progress ·
                                   submissions · struggle_alerts
```

All microservices expose a `GET /health` liveness probe and are deployed independently on **Koyeb** via `Procfile`-based services.

---

## Repository Structure

```
learnflow-app/
├── frontend/                    # Next.js 15 App Router (Vercel)
│   ├── app/
│   │   ├── page.tsx             # Landing / hero
│   │   ├── learn/
│   │   │   ├── page.tsx         # Module browser
│   │   │   └── [module]/
│   │   │       ├── page.tsx     # Module overview + topic list   ← NEW
│   │   │       └── [topic]/
│   │   │           └── page.tsx # Topic reader + AI Tutor sidebar
│   │   ├── practice/page.tsx    # Monaco editor sandbox + grader
│   │   ├── progress/page.tsx    # Mastery tracker + badges
│   │   └── teacher/page.tsx     # Teacher dashboard + alerts
│   ├── components/
│   │   ├── AiTutorPanel.tsx     # Chat panel → triage-service
│   │   ├── MonacoEditor.tsx     # Browser code editor
│   │   ├── MasteryBar.tsx       # Animated mastery progress bar
│   │   ├── ProgressRing.tsx     # SVG circular progress ring
│   │   ├── Navbar.tsx           # Site-wide navigation
│   │   └── motion.tsx           # Framer Motion wrappers
│   ├── .env.example             # ← Template — copy to .env.local
│   └── next.config.ts
│
├── triage-service/              # :8000  Groq tool-calling router
├── concepts-service/            # :8001  Python concept explainer
├── codereview-service/          # :8002  PEP8 + correctness reviewer
├── debug-service/               # :8003  Socratic error debugger
├── exercise-service/            # :8004  Exercise generator + sandbox grader
├── progress-service/            # :8005  Supabase mastery tracker
│
└── supabase-schema.sql          # Full DDL — run once in Supabase SQL editor
```

---

## Microservice Contracts

### `POST /triage` — Triage Service
Routes any learner message to the single best specialist.

```json
// Request
{ "message": "why is my list comprehension returning None?",
  "user_id": "u_abc123",
  "context": "result = [x for x in range(10) if x > 5]",
  "level": "beginner" }

// Response
{ "routed_to": "concepts-service",
  "response": { "concept": "list comprehensions", "explanation": "...", ... },
  "original_message": "why is my list comprehension returning None?" }
```

### `POST /explain` — Concepts Service
Returns level-differentiated explanation with runnable code example.

### `POST /review` — Code Review Service
Returns PEP8 issues, severity, score (0–100), and corrected code.

### `POST /debug` — Debug Service
Returns Socratic hints, breadcrumb steps, and a docs link — **never** the full fix.

### `POST /generate` — Exercise Service
Returns AI-generated exercise with title, prompt, starter code, and 3–5 test cases.

### `POST /grade` — Exercise Service
Runs student code in a 5-second subprocess sandbox against generated test cases.

### `GET /progress/{user_id}` — Progress Service
Returns per-module mastery scores from Supabase with overall stats.

---

## Local Development

### Prerequisites
- Python 3.12+ with `pip`
- Node.js 20+
- A free [Groq API key](https://console.groq.com)
- A free [Supabase project](https://supabase.com) (for progress tracking)

### 1 — Database Setup

Paste the contents of `supabase-schema.sql` into your Supabase project's **SQL Editor** and run. This creates all tables, indexes, RLS policies, and seeds 8 Python learning modules.

### 2 — Microservices

Each service is self-contained. Start them in separate terminals:

```bash
# triage-service (port 8000)
cd triage-service
cp .env.example .env        # fill in GROQ_API_KEY + downstream URLs
pip install -r requirements.txt
uvicorn main:app --reload --port 8000

# concepts-service (port 8001)
cd concepts-service
cp .env.example .env
pip install -r requirements.txt
uvicorn main:app --reload --port 8001

# codereview-service (port 8002)
cd codereview-service
cp .env.example .env
pip install -r requirements.txt
uvicorn main:app --reload --port 8002

# debug-service (port 8003)
cd debug-service
cp .env.example .env
pip install -r requirements.txt
uvicorn main:app --reload --port 8003

# exercise-service (port 8004)
cd exercise-service
cp .env.example .env
pip install -r requirements.txt
uvicorn main:app --reload --port 8004

# progress-service (port 8005)
cd progress-service
cp .env.example .env        # fill in SUPABASE_URL + SUPABASE_KEY (service_role)
pip install -r requirements.txt
uvicorn main:app --reload --port 8005
```

Verify all services are healthy:
```bash
for port in 8000 8001 8002 8003 8004 8005; do
  curl -s http://localhost:$port/health | python -m json.tool
done
```

### 3 — Frontend

```bash
cd frontend
cp .env.example .env.local   # fill in Supabase public keys + localhost service URLs
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## Deployment — Koyeb (Microservices)

Each Python service deploys as a separate Koyeb service using its `Procfile`.

### Steps per service

1. Go to [app.koyeb.com](https://app.koyeb.com) → **Create Service** → **GitHub**
2. Select this repository
3. Set **Root Directory** to the service folder (e.g. `hackathon-3/learnflow-app/triage-service`)
4. Koyeb auto-detects the `Procfile`; the run command is:
   ```
   web: uvicorn main:app --host 0.0.0.0 --port $PORT
   ```
5. Under **Environment Variables**, add:

| Service | Required Env Vars |
|---|---|
| `triage-service` | `GROQ_API_KEY`, `CONCEPTS_SERVICE_URL`, `CODEREVIEW_SERVICE_URL`, `DEBUG_SERVICE_URL`, `EXERCISE_SERVICE_URL`, `PROGRESS_SERVICE_URL` |
| `concepts-service` | `GROQ_API_KEY` |
| `codereview-service` | `GROQ_API_KEY` |
| `debug-service` | `GROQ_API_KEY` |
| `exercise-service` | `GROQ_API_KEY` |
| `progress-service` | `SUPABASE_URL`, `SUPABASE_KEY` (service_role key) |

6. Deploy. Koyeb assigns a public HTTPS URL like `https://triage-abc123.koyeb.app`.
7. Repeat for all 6 services. After deploying all, go back and update the `triage-service` environment variables with the actual downstream URLs.

### Deployment Order (important for triage service URL resolution)

```
1. concepts-service    →  note URL
2. codereview-service  →  note URL
3. debug-service       →  note URL
4. exercise-service    →  note URL
5. progress-service    →  note URL
6. triage-service      →  set all 5 URLs above as env vars
```

---

## Deployment — Vercel (Frontend)

```bash
cd frontend
vercel --prod
```

Or connect the repository in the Vercel dashboard and set these **Environment Variables** in Project Settings:

```
NEXT_PUBLIC_SUPABASE_URL          = https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY     = eyJ...
NEXT_PUBLIC_TRIAGE_SERVICE_URL    = https://triage-xxxx.koyeb.app
NEXT_PUBLIC_EXERCISE_SERVICE_URL  = https://exercise-xxxx.koyeb.app
NEXT_PUBLIC_PROGRESS_SERVICE_URL  = https://progress-xxxx.koyeb.app
```

> The frontend calls triage-service for all AI Tutor conversations, exercise-service directly from the Practice page, and progress-service from the Progress page. Concepts, code review, and debug services are only reached via triage.

---

## Key Design Decisions

### Triage Agent (tool-calling)
Rather than building a brittle if/else router, the triage service uses Groq's `tool_choice="required"` to force the LLM to select exactly one specialist. This means routing is context-aware and gracefully handles ambiguous messages.

### Socratic Debug Service
The debug service is explicitly prompted _not_ to provide corrected code. It returns a hint, likely cause, and a breadcrumb trail. This preserves the learning moment instead of short-circuiting it.

### Weighted Mastery Algorithm
Progress uses an exponential weighted moving average:
```python
existing_weight = min(0.7, 0.5 + (attempts * 0.02))
new_mastery = current * existing_weight + new_score * (1 - existing_weight)
```
Early attempts count equally; later attempts gradually favor the running average, preventing a single bad run from collapsing a well-established score.

### Sandbox Security
The exercise grader runs student code in a `subprocess` with `timeout=5s` and (on Linux/Koyeb) `resource.RLIMIT_AS = 50MB`. Windows runs without `rlimit` but still enforces the timeout. The submission is AST-parsed before execution to catch SyntaxErrors without spawning a process.

### Struggle Alerts
When a learner's mastery drops below 40% after 3+ attempts, the progress service inserts a row into `struggle_alerts`. The teacher dashboard reads this table in real-time (Supabase Realtime is enabled via `REPLICA IDENTITY FULL`) and surfaces intervention suggestions.

---

## Environment Variables Summary

| Variable | Where | Description |
|---|---|---|
| `GROQ_API_KEY` | All AI services | Groq cloud API key |
| `SUPABASE_URL` | progress-service | Supabase project URL |
| `SUPABASE_KEY` | progress-service | Supabase **service_role** key (bypasses RLS) |
| `NEXT_PUBLIC_SUPABASE_URL` | frontend | Same Supabase URL (public) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | frontend | Supabase **anon** key (browser-safe) |
| `NEXT_PUBLIC_TRIAGE_SERVICE_URL` | frontend | Koyeb URL for triage-service |
| `NEXT_PUBLIC_EXERCISE_SERVICE_URL` | frontend | Koyeb URL for exercise-service |
| `NEXT_PUBLIC_PROGRESS_SERVICE_URL` | frontend | Koyeb URL for progress-service |
| `CONCEPTS_SERVICE_URL` | triage-service | Internal URL of concepts-service |
| `CODEREVIEW_SERVICE_URL` | triage-service | Internal URL of codereview-service |
| `DEBUG_SERVICE_URL` | triage-service | Internal URL of debug-service |
| `EXERCISE_SERVICE_URL` | triage-service | Internal URL of exercise-service |
| `PROGRESS_SERVICE_URL` | triage-service | Internal URL of progress-service |

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 15, TypeScript, Tailwind CSS v4 |
| UI Components | Framer Motion, Lucide React, Recharts, Monaco Editor |
| AI Inference | Groq `llama-3.3-70b-versatile` (tool-calling + JSON mode) |
| Microservices | Python 3.12, FastAPI, Uvicorn, Pydantic v2 |
| Database | Supabase (PostgreSQL + RLS + Realtime) |
| Frontend Hosting | Vercel |
| Service Hosting | Koyeb (Procfile-based) |

---

## License

MIT — built for the Panaversity Hackathon 3, April 2026.
