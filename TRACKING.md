# ProwPlus — Test-Phase MVP Tracking

**Status:** Phases 1–5 wired + clarification flow — ready for Phase 6 E2E validation  
**Scope lock:** `casual_discovery` · `premium` + `elegant` · Path A · no auth · no DB · no billing  
**LLM:** OpenAI `gpt-4o-mini` (via `OPENAI_API_KEY` in `backend/.env`)  
**Source:** `Test-Phase-MVP-Spec.docx`

Legend: `[ ]` todo · `[~]` in progress · `[x]` done · `[-]` blocked

---

## Phase 0 — Project scaffolding
> Goal: repo layout, backend + frontend templates, shared contracts. No pipeline logic yet.

| ID | Task | Owner area | Status |
|----|------|------------|--------|
| P0-T1 | Create root tracking (`TRACKING.md`) | meta | [x] |
| P0-T2 | Scaffold backend (Express + TS) with pipeline/schema stubs | backend | [x] |
| P0-T3 | Scaffold frontend (Vite + React + Tailwind) with chat + renderer stubs | frontend | [x] |
| P0-T4 | Zod schemas in backend (`brief` + `page`) — shared npm pkg deferred | backend | [x] |
| P0-T5 | Env template (`backend/.env.example`) — no secrets committed | meta | [x] |
| P0-T6 | Root README with run instructions | meta | [x] |

**Exit criteria:** `backend` and `frontend` boot independently; empty `/api/health` + empty chat UI load.

---

## Phase 1 — Contracts & static data
> Goal: schemas + image catalog exist before any LLM/pipeline work.

| ID | Task | Status |
|----|------|--------|
| P1-T1 | Finalize `brief.schema.ts` (Zod) | [x] |
| P1-T2 | Finalize `page.schema.ts` (Zod) | [x] |
| P1-T3 | Component manifest schema (fields per section) | [x] |
| P1-T4 | Create `data/catalog.json` (~50–100 test images metadata) | [x] |
| P1-T5 | Seed `data/images/restaurant/{hero,gallery,menu,about}/` placeholders | [x] |
| P1-T5b | Organize `dumpiamgedata/` → `data/images/` + `frontend/public/images/` (7 webp, catalog merged) | [x] |

**Exit criteria:** Sample brief + page JSON validate against schemas; catalog filters by `section_type` + `orientation`.

---

## Phase 2 — Pure-code pipeline stages
> Goal: deterministic stages with no LLM. Hardcoded archetype/family.

| ID | Task | File | Status |
|----|------|------|--------|
| P2-T1 | `planSections.ts` — fixed `[hero, menu, about, gallery, location_map]` | backend | [x] |
| P2-T2 | `pickComponent.ts` — hardcoded type → `premium-*-01` | backend | [x] |
| P2-T3 | `factCheck.ts` — regex: block invented price/phone/time | backend | [x] |
| P2-T4 | `pickImage.ts` — filter catalog, first match, 0-photo drop | backend | [x] |
| P2-T5 | `assemblePage.ts` — combine sections → Page JSON + Zod | backend | [x] |
| P2-T6 | Unit tests for P2 stages (fixture brief in → page out) | backend | [x] |

**Exit criteria:** Given a fixture brief + catalog, assembler returns valid Page JSON with no LLM.

---

## Phase 3 — LLM pipeline stages
> Goal: OpenAI extract + per-section copywrite with fact-safety retry.

| ID | Task | File | Status |
|----|------|------|--------|
| P3-T1 | `extractBrief.ts` — chat → Zod brief (OpenAI structured) | backend | [x] |
| P3-T2 | `writeCopy.ts` — 1 OpenAI call per section from manifest fields | backend | [x] |
| P3-T3 | Wire factCheck fail → retry once with flagged span in prompt | backend | [x] |
| P3-T4 | Stage runner: validate each stage before next | backend | [x] |
| P3-T5 | `POST /api/build` — runs full 8-step pipeline | backend | [x] |

**Exit criteria:** Real restaurant dump → valid brief → validated copy → Page JSON. Fact invents blocked.

---

## Phase 4 — Premium components (1 variant each)
> Goal: five section components + manifests for `premium` family.

| ID | Task | Status |
|----|------|--------|
| P4-T1 | `premium-hero-01` (+ manifest) | [x] |
| P4-T2 | `premium-menu-01` (+ manifest) | [x] |
| P4-T3 | `premium-about-01` (+ manifest) | [x] |
| P4-T4 | `premium-gallery-01` (+ manifest) | [x] |
| P4-T5 | `premium-location-01` (+ manifest) | [x] |
| P4-T6 | Component registry map for `PageRenderer` | [x] |
| P4-T7 | `elegant-*-01` family (5 components + manifests + catalog) | [x] |

**Exit criteria:** Each component renders from its manifest field shape with no undefined crashes.

---

## Phase 4b — Fine-dining family (Caverta-inspired)
> Goal: second component family selectable via UI / query param / env.

| ID | Task | Status |
|----|------|--------|
| P4b-T1 | `elegant-hero/menu/about/gallery/location-01` components | [x] |
| P4b-T2 | Manifest schemas + fixture copy | [x] |
| P4b-T3 | `pickComponent` + `pickImage` family filter | [x] |
| P4b-T4 | Catalog entries with Unsplash elegant images | [x] |
| P4b-T5 | UI theme toggle + full-bleed preview | [x] |

**Exit criteria:** `?family=elegant` or UI toggle renders dark/gold Caverta-style page; premium unchanged.

---

## Phase 5 — Frontend chat + renderer
> Goal: Path A UI + deterministic Page JSON → HTML.

| ID | Task | Status |
|----|------|--------|
| P5-T1 | Chat input (single textarea, one dump, no auth) | [x] |
| P5-T2 | Call `POST /api/build`, show loading / errors | [x] |
| P5-T3 | `PageRenderer.tsx` — section loop → component registry | [x] |
| P5-T4 | Preview page route / panel for rendered output | [x] |
| P5-T5 | Photo edge-case UX (0 / 1–2 photos messaging optional) | [x] |

**Exit criteria:** One paste → pipeline → live rendered restaurant page.

---

## Phase 5b — Clarification flow + agent visibility
> Goal: assess brief before build, max 2 clarification rounds, visible pipeline stages.

| ID | Task | Status |
|----|------|--------|
| P5b-T1 | `assessBrief.ts` — gap detection + LLM clarification questions (1–3 max) | [x] |
| P5b-T2 | `POST /api/intake` — assess chat, return questions or ready brief | [x] |
| P5b-T3 | `POST /api/build` — requires `confirmed: true`, accepts pre-confirmed brief | [x] |
| P5b-T4 | `mergeClarifications.ts` — merge user answers into chat dump | [x] |
| P5b-T5 | Pipeline stage log + SSE streaming on build (`meta.stages`) | [x] |
| P5b-T6 | Frontend: analyze → clarify → confirm → build with stage progress | [x] |
| P5b-T7 | Unit tests for gap detection, merge, fixture intake/build | [x] |

**Exit criteria:** Vague dump triggers questions; confirmed brief builds with visible 8-stage progress. Fixture mode still works.

---

## Phase 6 — E2E validation (success criteria)
> Goal: prove hypothesis on 10–15 real restaurant descriptions.

| ID | Check | Pass criteria | Status |
|----|-------|---------------|--------|
| P6-T1 | Brief extraction | All runs Zod-pass | [ ] |
| P6-T2 | No hallucinated facts | Zero invented price/phone/hours | [ ] |
| P6-T3 | Page always assembles | Valid Page JSON after retry | [ ] |
| P6-T4 | Renderer never breaks | No missing/undefined on screen | [ ] |
| P6-T5 | Photo edge cases | 0 → drop section; 1–2 → fallback; no crash | [ ] |
| P6-T6 | Copy quality | Relevant, not generic filler (manual) | [ ] |

**Exit criteria:** All checks pass consistently → unlock post-MVP axes (archetype #2, family #2, ranking, pgvector, auth).

---

## Explicitly NOT in this MVP
- Auth / multi-tenancy / workspaces
- Postgres / pgvector
- Credits / billing
- Publishing / domains / rollback
- Edit router / notifications
- Multiple archetypes / ranking
- Path B (one-question-at-a-time)

---

## Pipeline order (every run)
1. Brief Extractor (LLM + Zod)  
2. Section Planner (pure)  
3. Component Picker (pure)  
4. Copywriter (LLM + Zod, per section)  
5. Fact-Safety Scan (regex; retry once)  
6. Image Picker (catalog filter)  
7. Assembler (Page JSON + Zod)  
8. Renderer (React, deterministic)

---

## Current focus
**Phases 1–5 + 5b complete.** Next: Phase 6 manual E2E on 10–15 real restaurant dumps.

**Dev tips:**
- Image assets: canonical copies in `backend/data/images/restaurant/`; browser-served copies in `frontend/public/images/restaurant/` (catalog paths use `/images/restaurant/...`)
- Fixture mode: checkbox in UI or `?fixture=1` on `/api/intake` and `/api/build` (no OpenAI tokens)
- Page family: UI radio **Elegant** or `?family=elegant` on build; backend env `PAGE_FAMILY=elegant`
- Flow: `POST /api/intake` → clarify (max 2 rounds) → confirm → `POST /api/build?stream=1` with `confirmed: true`
- Build streams stage events via SSE; response includes `meta.stages`
- `USE_FIXTURE_BRIEF=true` in `backend/.env` forces fixture for all builds
