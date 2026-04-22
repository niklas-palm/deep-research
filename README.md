# Deep Research

An agent pipeline that turns a thematic investment question into a cited,
multi-section markdown report. Built on Strands Agents + AWS Bedrock, with
LLM-as-judge evaluation via Langfuse.

## What it does

- **Orchestrator (Opus 4.6)** plans 3–7 research themes, delegates to parallel
  researchers, runs a gap-analysis pass, then synthesizes one report.
- **Researchers (Haiku 4.5)** each run their own tool loop over `web_search`
  (SearXNG) and `web_fetch` (Jina Reader), returning structured YAML findings.
- **Chat (Sonnet 4.6)** per-project, with the full report inlined in the
  system prompt; history persists across reloads via Strands' `FileSessionManager`.
- **Revisions** spawn child projects that inherit the parent report and a
  refinement paragraph; children nest under the parent in the sidebar.
- **Evals** run after each report: deterministic structure / citation density
  / source diversity / data specificity checks plus LLM judges for plan and
  per-researcher quality. Scores persist to `metrics.json` and push to Langfuse.

## Architecture

```
  React UI ──REST──▶ FastAPI ──▶ Orchestrator (Opus 4.6)
                       │              │
                       │              ├── Researcher ─┐
                       │              ├── Researcher ─┼─▶ SearXNG + Jina
                       │              └── Researcher ─┘
                       │              │
                       │              ▼
                       │      report.md + activity.json
                       │
                       ├──▶ Chat agent (Sonnet 4.6) ──▶ data/sessions/
                       └──▶ Evaluators ──▶ Langfuse traces + scores
```

State lives on disk under `data/projects/<id>/` — no database, atomic writes.

## Quick start (Docker)

```sh
export AWS_ACCESS_KEY_ID=...
export AWS_SECRET_ACCESS_KEY=...
export AWS_SESSION_TOKEN=...
docker compose up --build
```

| URL | Purpose | Notes |
|---|---|---|
| http://localhost:3000 | Frontend | Main UI |
| http://localhost:8001 | Backend API | FastAPI |
| http://localhost:3001 | Langfuse UI | Demo login: `admin@demo.local` / `demopass123` |

First boot takes 1–2 minutes while the Langfuse stack (postgres, clickhouse,
redis, minio) comes up healthy.

## Environment variables

Only AWS credentials need to come from the host — everything else is hardcoded
in `docker-compose.yml` (SearXNG URL, Langfuse keys + host, Bedrock region):

| Var | Required |
|---|---|
| `AWS_ACCESS_KEY_ID` / `AWS_SECRET_ACCESS_KEY` / `AWS_SESSION_TOKEN` | yes |
| `AWS_REGION` / `BEDROCK_REGION` | no (default `eu-west-1`) |

## Repo layout

```
backend/app/
  main.py            FastAPI app + lifespan (tracer init)
  routes.py          /api/projects endpoints
  storage.py         Disk-backed project + activity + session I/O
  models.py          Pydantic schemas
  telemetry.py       Langfuse OTEL bootstrap
  agents/
    orchestrator.py  Opus — plans, delegates, synthesizes
    researcher.py    Haiku — per-theme research tool
    chat.py          Sonnet — per-project Q&A with report-in-prompt
    title.py         Sonnet — 3–5 word title from the query
    tools.py         web_search (SearXNG) + web_fetch (Jina, LRU-cached)
    context.py       ContextVars propagating project/researcher ids
  evals/
    judges.py        Deterministic + LLM-as-judge scoring functions
    runner.py        Post-run driver that pushes scores to Langfuse
    client.py        Lazy Langfuse client
    trace_context.py OTEL trace/span id accessors
frontend/src/
  pages/             Dashboard, HowItWorks
  components/        Sidebar, TabBar, modals, ReportView, ProgressView, ChatPane, MetricsView
  presentation/      unfold-ai slide deck rendering "How it works"
  api.ts             Typed backend client
  types.ts           Shared TS shapes
docker-compose.yml   Full stack (frontend, backend, searxng, langfuse)
searxng/             SearXNG settings
```


## Out of scope

Deliberate cuts for a self-contained demo:

- **Authentication / multi-user isolation** — single-tenant; anyone on the box has full access.
- **A test suite** — deterministic evaluators in `evals/judges.py` sanity-check the report shape; everything else is exercised end-to-end via the UI.
- **Centrally-hosted Langfuse + externalized secrets** — the stack ships bundled in compose with demo credentials so the reviewer gets a zero-setup experience. In production it would point at a managed Langfuse and secrets would come from a secrets manager.
- **A real database + retention policy** — projects are directories under `data/projects/`. Inspectable with `ls`, but no indexing, no GC, no backups.
- **Job queue / crash-resumption** — background research runs in the uvicorn event loop. A restart mid-run marks the project ERROR and the user hits retry manually.
- **Export, sharing, admin UI, cost controls** — no PDF/DOCX export, no shareable links, no admin surface for prompts or sessions, no per-user Bedrock spend cap.
