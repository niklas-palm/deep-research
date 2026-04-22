# Working on this repo

## Architecture in one paragraph

FastAPI backend runs a Strands-based orchestrator (Opus 4.6) that delegates to parallel researcher agents (Haiku 4.5) using `web_search` (SearXNG) and `web_fetch` (Jina). One project = one directory under `data/projects/<uuid>/` with `metadata.json`, `activity.json`, `report.md`, `metrics.json`. Frontend is Vite/React, served by nginx, proxies `/api` to the backend. Langfuse runs in-cluster and is always on.

## Running it

```sh
docker compose up --build        # full stack
docker compose up -d --build backend frontend   # iterate on app code only
docker compose down              # stop (keeps data on disk)
```

Ports: frontend `:3000`, backend `:8001`, Langfuse `:3001`.

Only AWS creds come from the host — see `backend/.env.example`. Langfuse keys / SearXNG URL / Bedrock region are hardcoded in `docker-compose.yml`.

## Conventions

- **No local dev without Docker.** Backend depends on SearXNG and Langfuse being reachable by service name. Don't add `uv run uvicorn …` instructions to the README.
- **Langfuse is always on.** Don't add `if not keys: return` branches in `telemetry.py` or `evals/client.py`.
- **Disk is source of truth.** `data/projects/<id>/` stores everything. Bind-mounted into the backend container (`./data:/app/data`), so restarts preserve state.
- **No database.** Atomic-rename writes via `_write_activity_atomic` in `storage.py`. Don't introduce a DB without asking.
- **Agent outputs flow as YAML between orchestrator and researchers** — not JSON. Keep it that way; the orchestrator prompt aligns 1:1 with it.

## Where things live

- `backend/app/agents/` — one file per agent (orchestrator, researcher, chat, title) + shared `tools.py` + `context.py` (ContextVars propagating project/researcher ids).
- `backend/app/evals/` — `judges.py` (deterministic + LLM judges), `runner.py` (fires after each report, persists `metrics.json`, pushes to Langfuse), `client.py` (lazy Langfuse client), `trace_context.py` (OTEL trace/span ids).
- `backend/app/routes.py` — all `/api/projects` endpoints. `_require_project` helper for 404s.
- `backend/app/storage.py` — disk I/O. Atomic writes, activity log, metrics, session dir.
- `frontend/src/components/` — `ReportView`, `ProgressView`, `ChatPane`, `MetricsView`, modals, sidebar, tab bar.
- `frontend/src/presentation/` — unfold-ai slide deck for the **How it works** page.
- `data/projects/f8d10289-…/` + `data/projects/f76588eb-…/` — committed example project + its revision (allowlisted in `.gitignore`).

## Safe rebuild targets

- Changed backend Python → `docker compose up -d --build backend` (note: this restarts the backend, killing any in-flight research jobs — ask first if a job is running).
- Changed frontend → `docker compose up -d --build frontend`.
- Changed `docker-compose.yml` → full `docker compose up --build`.

## Gotchas

- Rebuilding any container via `docker compose up --build <svc>` also restarts anything that depends on Langfuse's healthcheck. If a research job is running, warn the user before rebuilding.
- `maxTokens` on LLM judges is set to 400 — raise it if truncation comes back.
- The `source_diversity` judge normalizes by `words // 150` — that constant was tuned against a small sample, not derived. Adjust if reports drift.
- Evaluators run as fire-and-forget `asyncio.create_task` after `run_orchestrator` returns. They don't block the API response or the COMPLETED transition — log warnings, not hard failures.

## Out of scope (don't scope-creep)

Auth, test suite, centrally-hosted Langfuse, a real database, job queue/crash-resumption, export/sharing/admin UI. All intentional — documented in README.
