# ProwPlus — Test-Phase MVP

ProwPlus · chat intake → LLM brief → deterministic components → validated copy → static images → Page JSON → render.

**No auth. No DB. No billing.** One archetype (`casual_discovery`), two families (`premium`, `elegant`).

## Tracking

All phases + tasks live in [`TRACKING.md`](./TRACKING.md). Phases 1–5 are wired; Phase 6 is manual E2E validation.

## Structure

```
backend/          Express + TS pipeline API
  src/pipeline/   8-stage pipeline (OpenAI + pure code)
  src/schemas/    Zod brief + page + manifests
  data/           catalog.json (95 entries) + image folders (SVG placeholders + webp from dump)
frontend/         Vite + React + Tailwind + shadcn/ui
  src/components/premium/     Default section components
  src/components/elegant/ Caverta-inspired elegant family
  src/render/     PageRenderer
TRACKING.md       phase/task checklist
```

## Run

```bash
# backend
cd backend && cp .env.example .env   # add OPENAI_API_KEY
npm install && npm run dev

# frontend (other terminal)
cd frontend && npm install && npm run dev
```

- API: http://localhost:4000/api/health  
- UI: http://localhost:5173  

## Env (`backend/.env`)

```
PORT=4000
OPENAI_API_KEY=sk-...
OPENAI_MODEL=gpt-4o-mini
USE_FIXTURE_BRIEF=false
PAGE_FAMILY=premium          # or elegant
FRONTEND_ORIGIN=http://localhost:5173
```

## Testing

```bash
# Backend unit tests (fixture pipeline, no LLM)
cd backend && npm test

# Token-free build via API (premium)
curl -X POST "http://localhost:4000/api/build?fixture=1" \
  -H "Content-Type: application/json" \
  -d '{"chatText":"any text", "confirmed": true, "brief": {...}}'

# Fine-dining family
curl -X POST "http://localhost:4000/api/build?fixture=1&family=elegant" \
  -H "Content-Type: application/json" \
  -d '{"chatText":"any text", "confirmed": true}'
```

In the UI, enable **Fixture mode** and select **Elegant (Caverta-style)** theme, or open `http://localhost:5173/?family=elegant`.

## Current status

**Phases 1–5 + elegant family complete.** Full pipeline live. Phase 6 E2E validation pending.
