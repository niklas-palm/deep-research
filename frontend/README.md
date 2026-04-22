# Frontend

React + Vite + TypeScript + Tailwind frontend for the Deep Research platform.

Deployed as part of `docker compose up` in the repo root — the Dockerfile
builds with `npm run build` and serves `dist/` from nginx on port 3000.

## Structure

- `src/pages/` — top-level views (`Dashboard`, `HowItWorks`).
- `src/components/` — shared UI: sidebar, tab bar, modals, `ReportView`,
  `ProgressView`, `ChatPane`, `MetricsView`.
- `src/presentation/` — the `unfold-ai` slide deck backing the
  **How it works** page.
- `src/api.ts` — typed fetch client for the FastAPI backend.
- `src/types.ts` — shared TypeScript shapes mirrored from `backend/app/models.py`.
