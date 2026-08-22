# Project Continuation Checkpoint — Website Generation Engine

**Written:** 2026-08-22, at the end of Phase 3
**Status:** implementation paused at the Phase 3 / Phase 4 boundary
**Purpose:** hand off to a fresh session with no prior context

> **This is a handoff document, not a task.** Reading it does not authorise any
> code change. Follow §12 (First Actions) and wait for the user's approval
> before implementing anything.
>
> **Trust the repository over this document.** Everything below was verified
> against the working tree on the date above. If they disagree, the repo is
> right — say so and explain the difference.

---

## 1. What this project is

A production-grade **AI Website Builder SaaS**. A business owner describes their
business in chat; the system generates a complete, professionally designed
website.

**Launch verticals:** restaurants and cafes.
**Planned verticals:** real estate, IT, SaaS, agencies, hotels, portfolios,
education, healthcare, corporate, other local business categories. The vertical
must stay *data*, never hardcoded into the engine.

**The product bar:**

> A real business owner should believe a professional designer intentionally
> designed this website specifically for their business.

Not "AI generated a webpage." The distinction drives every decision below.

### Division of responsibility

| Layer | Owns |
|---|---|
| AI | creative decisions (archetype refinement, narrative, palette/type choice, copy) |
| Rules | guardrails — contrast, rhythm, adjacency, capability, content budgets |
| Components | reusable implementation primitives |
| Design DNA | visual direction (palette, type, density, rhythm) |
| Site/page planning | composition |
| Catalog | component capabilities |
| Ranking | selection |
| Diversity ledger | controlled variation |
| Renderer | actual pixels |

**Controlled creativity**: AI never emits raw layout or raw hex; it chooses
among validated options. Rules never author the design; they bound it.

---

## 2. Scope discipline (read before touching anything)

This work stream is **website generation quality only**.

Explicitly out of scope, and not to be worked on: billing, auth, payments, CRM,
analytics, deployment, marketing, user management.

---

## 3. Repository state as of this checkpoint

**Branch:** `main`
**Last commit:** `20909f9 working`

> **All Phase 0–3 work is UNCOMMITTED.** 130 changed paths: 100 modified,
> 29 untracked, 1 deleted (`backend/src/pipeline/pickComponent.ts`).
> Nothing has been committed since `20909f9`. A fresh session should confirm
> this before doing anything, and should probably ask the user whether to
> commit before starting Phase 4.

**Verified green at checkpoint time:**

```
backend   npx vitest run          → 58 files, 559 tests passing
backend   npx tsc -p tsconfig.json --noEmit  → clean
frontend  npx tsc -b --noEmit     → clean
frontend  npm run build           → succeeds
backend   npx tsx scripts/benchmark.ts --label checkpoint --compare phase3
          → every metric identical to phase3 (determinism confirmed)
```

---

## 4. Phases completed

Each phase followed the same discipline: **inspect real code → find root cause →
smallest architectural change → tests → benchmark → compare → stop**.

### Phase 0 — Baseline and benchmark harness

Built `backend/benchmarks/` + `scripts/benchmark.ts`. Seven realistic
launch-vertical cases (modern cafe, luxury restaurant, casual restaurant, fine
dining, bakery, coffee shop, multi-page restaurant). Records Page JSON per case,
`report.json`, `report.md`, and diffs against a stored baseline.

**Headline finding:** surface rhythm was **1/7 distinct** — every page rendered
`base > image > base > base > base…`, one flat slab after the hero.

### Phase 1 — Design intent must reach pixels

The Creative Director already produced archetype, signature, per-section layout
intent, emphasis, background, spacing, palette and type pair. The renderer
consumed four values. Everything else was computed, stored, and dropped.

**The key move (preserve this):** `PageRenderer` already wrapped every section
in a `div`. It now stamps `data-layout-bg` / `data-layout-intent` /
`data-emphasis` / `data-spacing` there, and `sectionLayout.css` rewrites the
`--theme-*` tokens for that subtree. Because ~120 components already style
themselves from `--theme-*`, a surface decision reaches all of them **with zero
component edits**.

Live controls: surface, vertical rhythm, container measure, type scale, density,
split orientation, typography pair, CTA ink.

| | before | after |
|---|---|---|
| Layout signatures | 4/7 | 7/7 |
| Surface rhythms | 1/7 | 5/7 |
| Display fonts | 2/7 | 5/7 |
| Fonts loaded vs selectable | 7/28 | 28/28 |
| Tests | 395 | 436 |

Also fixed: `contrastForAccent` used YIQ brightness, not WCAG — 9 of 12 live
accents rendered white CTA text at 1.89–3.32:1. Font links are now generated
from the design-system catalog. Lightning CSS was emitting *opaque* fallbacks
for `color-mix` overlays. The `minimal` family replaced the whole theme object,
discarding the Director's typography. An early spacing model pushed nearly every
section to `roomy`, flattening the hierarchy it was meant to sharpen.

**Legacy pages with no `layout` are deliberately left unstamped** so stored
projects render byte-identically. Do not "fix" this.

### Phase 1.1 — Correct business understanding and site structure

**Archetype classification** was a first-match-wins if-chain: a twelve-seat
omakase counter classified as `quick_service` because "counter" appeared in its
USP, ahead of any fine-dining check. Replaced with generic weighted scoring
(`signalScoring.ts`) plus a vertical data table (`archetypeRules.ts`). Structured
brief facts outweigh loose keywords; `priceBand: fine_dining` actively suppresses
`quick_service`. The scorer knows nothing about restaurants.

**Multi-page** did not exist anywhere — no page concept in the pipeline or
schemas. Added `siteIntent.ts`, `pageRoles.ts`, `planSite.ts`. Distinguishes
`landing` / `single_page` / `multi_page`. **Default is single-page**; multi-page
requires the owner to ask for it, by naming the shape or listing 3+ pages.

| | before | after |
|---|---|---|
| Page structure correct | 0/7 | 7/7 |
| Tests | 449 | 483 |

Also added role-aware content gating: content the owner explicitly named clears
a lower bar (≥2 rather than ≥3 items).

### Phase 2 — Component intelligence foundation

**Discoveries:** `copyFields` was per *section type*, but components read
genuinely different keys. And `buildAssets` hardcoded component knowledge —
`componentId.endsWith("-03") → 3 slides`, gallery → 4, team → 3.

Introduced `ComponentSpec` → catalog → `findCandidates()` → `rankCandidates()` →
pipeline → copy/media contracts → Page JSON → renderer. Every spec field has a
consumer, enforced by `scaling.test.ts`.

21 components migrated. Ranking became traceable with named terms
(`layoutMatch`, `styleMatch`, `densityFit`, `emphasisFit`, `adjacencyBonus`,
`repetitionPenalty`, …).

**The catalog immediately exposed a real bug:** the planner asked for a
`split_right` hero on an `image` surface — media beside the copy *and* behind
it. Contradictory, so the actual split hero was filtered out. Fixed by coupling
surface to intent. **This is the canonical example of what Phase 4 must
prevent.**

Tests: 483 → 532.

### Phase 3A — Complete component intelligence

**21 → 228 specs**, all 6 families × 38 slots. Written as trait tables layered
over shared section contracts, because `createFamilyRegistry` builds
minimal/rustic/vibrant and every bold `-03` slot from one set of React
factories — the implementations really are shared, so hand-duplicating metadata
132 times would only let it drift.

`pickComponent.ts` **deleted**. Every replacement is capability-based:

| Removed | Replaced by |
|---|---|
| `COMPONENT_VARIANTS` id table | `listComponentIds()` |
| `scoreVariant` suffix literals | `rankCandidates()` over metadata |
| `endsWith("-03")` media logic | `spec.media.max` |
| `endsWith("-03")` ×4 in edit path | `rendersMultipleImages()` |
| `pickComponent()` in edit/default paths | `defaultComponentId()`, `remapComponentToFamily()` |
| `SECTION_SPECS` hardcoded variants | manifests derived from the catalog |
| `stableHash` trapped in the picker | `src/lib/stableHash.ts` |

Cross-family remapping is now **composition-based, not suffix-based**:
`premium-hero-02` is a `split`, `elegant-hero-02` is `immersive`, so mapping by
suffix was silently wrong. There is a test asserting this.

`resolveCandidates()` replaced the legacy fallback — it relaxes constraints in a
fixed order (surface → media → content) and records what it relaxed. Content is
relaxed last because a component missing required content renders visibly
broken, whereas one on an unexpected surface merely looks less considered.

**Result: 100% catalog-driven** (from 47.1%), 0 section-type mismatches,
0 media-contract breaches.

### Phase 3B — Cross-build diversity ledger

Cohort-scoped memory (`family:archetype`), evidence-scaled weighting (one prior
build earns ⅓ weight, three earn full), bounded history, deterministic, and hard
capped: **the entire diversity band is smaller than a single layout mismatch**,
so it can only break near-ties.

Two bugs found while validating:

1. Surface-program pressure was looked up under cohort `premium:unknown` but
   recorded under `premium:story_led` — **that lookup always saw an empty
   cohort**. Fixed with family-scoped queries. This is what made surface
   diversity work at all.
2. Rhythm was computed once over the whole section list, then `planSite` split
   it across pages, so the "no three consecutive surfaces" rule did not survive
   the split — `multi-page-restaurant` home ended `dark>dark>dark`. Now computed
   per page, with a test.

Tests: 533 → 559.

---

## 5. Current architecture

```
USER BRIEF
   ↓  extractBrief / verifyBriefAgainstSource
BUSINESS UNDERSTANDING          classifyArchetype  (signalScoring + archetypeRules)
   ↓
DESIGN DNA                      creativeDirector: palette, type pair, density,
   ↓                            typeScale, signature, narrative
SITE / PAGE INTENT              siteIntent → planSite  (landing|single|multi)
   ↓
PAGE / SECTION PLANNING         sectionRhythm, per page
   ↓                            emphasis · layoutIntent · background · spacing
COMPONENT CATALOG               228 ComponentSpecs
   ↓
CAPABILITY FILTER               findCandidates / resolveCandidates  (hard gates)
   ↓
COMPONENT RANKING               rankCandidates  (named, traced score terms)
   ↓
DIVERSITY SIGNALS               diversityLedger  (soft, capped)
   ↓
CONTENT + MEDIA CONTRACTS       spec.slots → copy budgets · spec.media → assets
   ↓
PAGE JSON
   ↓
RENDERER                        PageRenderer stamps data-* → sectionLayout.css
   ↓                            rewrites --theme-* per section subtree
ACTUAL WEBSITE
```

**The load-bearing principle:**

```
DESIGN DECISION → STRUCTURED DATA → COMPONENT CAPABILITY → RANKING → PIXELS
```

Any new field must complete that chain. Metadata with no consumer is rot, and
`scaling.test.ts` will fail the build for it.

### Ranking priority order (do not reorder)

1. hard capability compatibility
2. business/content correctness
3. Design DNA compatibility
4. layout/composition quality
5. adjacency compatibility
6. **diversity** ← soft, capped
7. minor preference signals (seeded tie-break)

A highly appropriate component that repeats **must** beat an inappropriate
component chosen only because it is different. There is a test for this.

---

## 6. Verified metrics at checkpoint

From `backend/benchmarks/out/checkpoint/report.md` (identical to `phase3`):

| Metric | Value | Target |
|---|---|---|
| Page structure correct | 7 / 7 | 7 / 7 |
| Catalog-driven selections | 100.0% | > 0% |
| Section type mismatches | 0 | 0 |
| Media contract breaches | 0 | 0 |
| Distinct layout signatures | 7 / 7 | ≥ 5 / 7 |
| **Distinct surface rhythms** | **6 / 7** | ≥ 5 / 7 |
| Distinct spacing rhythms | 4 / 7 | ≥ 4 / 7 |
| Distinct home compositions | 7 / 7 | ≥ 5 / 7 |
| Distinct accents | 6 / 7 | ≥ 6 / 7 |
| Distinct display fonts | 5 / 7 | ≥ 4 / 7 |
| Distinct hero images | 6 / 7 | ≥ 6 / 7 |
| CTA contrast passing AA | 100.0% | 100% |
| Duplicate images on a page | 0 | 0 |
| **Distinct section orders** | **3 / 7** | ≥ 6 / 7 ← Phase 4 |
| Image reuse rate | 32.6% | < 10% ← Phase 6 |
| Cross-build component reuse | 68.6% | lower is better |
| Mean pairwise text Jaccard | 0.317 | < 0.30 |
| Tests | 559 passing | — |

### Corrections to earlier verbal summaries

Two numbers were conflated in conversation; these are the correct ones:

- **Surface rhythm is 6/7 distinct.** The figure "3/7" was a different
  measurement: how many rhythms *changed* when the ledger was toggled on
  (`--no-ledger` comparison), not how many are distinct.
- **Image reuse (32.6%)** and **cross-build component reuse (68.6%)** are two
  separate metrics. The first is stock-photo reuse across the benchmark; the
  second is how much a build repeats components from earlier builds in its
  cohort.

### Do not blindly optimise these

Especially: **do not optimise "catalog-driven %"** (already 100% and meaningless
to push), and **never trade design quality for a diversity number**. Several
metrics are informational, not targets.

---

## 7. The most important discovered principle

**The remaining diversity problem is a PLAN problem, not a component problem.**

Evidence gathered in Phase 3B: enabling the ledger changed only **3 of 85**
component selections, and cross-build component reuse did not fall. This was
diagnosed, not tuned around:

- Candidate pools are healthy — 73% of selections have 3 candidates, so
  discovery is not the constraint.
- `layoutMatch` carries a 10-point spread (+8 match / −2 mismatch) while the
  whole diversity band caps at ±3. Once the plan fixes a section's
  `layoutIntent`, the component matching it wins — **and it should**.

So two sites with different component IDs can still feel identical:

```
Site A: hero split → about split → menu cards → gallery masonry → CTA centered
Site B: different component IDs, same composition  →  feels like the same site
```

Diversity must therefore operate on **section order, layout intent, composition,
surface program and visual rhythm** — not component ID. Surface programs are
already ledger-driven and visibly move (3/7 rhythms change when toggled). The
other levers belong to the planner.

---

## 8. Intentionally NOT implemented

1. **Production routes do not consume the diversity ledger.** Only `benchmark`
   and `explain` pass one. `runPipeline` accepts an optional `ledger`; omitting
   it means `NULL_LEDGER` and no pressure, keeping the pipeline a pure function
   of its inputs — the deliberate default for tests.
2. **Ledger is process memory only** (`InMemoryDiversityLedger`). Restart clears
   it. The interface is designed for a DB-backed implementation; no Prisma model
   was added because persistence is out of scope.
3. **Multi-page routing / persistence is incomplete.** The pipeline generates
   real multi-page structure in `result.pages`; `result.page` is still the home
   page so every existing caller works unchanged. Serving `/menu` needs a router
   and a `Site` document.
4. **Cross-page copy is generated independently** — a home teaser and its full
   page get separately generated wording. A shared site-level content model may
   be worth it later.
5. **Section-order diversity is 3/7 on purpose.** It belongs to Phase 4.
6. **Image intelligence not started.** Do not jump here before composition.
7. **Visual/screenshot QA not implemented.** Chrome could not reach localhost
   under this machine's org policy, so verification used the *compiled* CSS
   bundle instead (grepping built artifacts for emitted rules and utilities).
   That is stronger than source inspection but weaker than a real render.

---

## 9. Risks and limitations

- **Everything is uncommitted** (see §3). Highest-priority risk.
- **Elegant / familyKit / bold traits are derived**, not individually verified,
  from parallel variant roles plus five confirmed divergences. Premium was
  verified component by component. If a selection looks wrong in those families,
  suspect the trait table first.
- **Specs live in the backend, components in the frontend.** Registration drift
  is guarded by tests that parse the frontend registries, but they are still two
  files in two packages. This boundary was reviewed and judged acceptable for
  now; do not restructure it without a concrete reason.
- **`runPipeline.ts` is 912 lines.** It has absorbed site planning, per-page
  rhythm, selection, content and assembly. Phase 4 will add more. Consider
  extracting the per-page generation loop *if* Phase 4 makes it worse — but do
  not refactor for its own sake.
- **Multi-page live generation costs one copy LLM call per page** (6 for the
  multi-page benchmark case). Batching across pages is a later concern.
- **`stats` filler.** `realStats()` can still emit weak metrics like
  "1 / Cuisine Focus". Partially mitigated; worth revisiting during composition
  planning.

---

## 10. What must NOT be changed

- The `data-*` → `sectionLayout.css` → `--theme-*` mechanism. It is why design
  intent reaches ~120 components without editing them.
- Legacy pages staying unstamped (backwards compatibility).
- The ranking priority order in §5.
- Diversity remaining soft and capped below composition quality.
- `scaling.test.ts` guarantees: no component-id literals and no suffix reasoning
  in the active generation path; no spec field without a documented consumer.
- Determinism. No `Math.random()` anywhere in generation. Same inputs + same
  ledger state → same output.
- Fact discipline: `verifyBriefAgainstSource`, `factCheck`, `factCheckPage`,
  `slopCheck`, and the real-data-only gates that refuse to invent chefs,
  testimonials or guest counts.

### Do not

Randomly shuffle components or sections · add components for quantity ·
optimise only for diversity metrics · start image intelligence or visual QA
before composition · rewrite the architecture · add dependencies without clear
benefit · create metadata with no consumer · reintroduce hardcoded component IDs
or suffix semantics · let diversity override hard compatibility · implement
several future phases at once.

---

## 11. Phase 4 — Composition / beat planning (NOT started)

**Goal:** section order, narrative flow, page purpose, layout intent, visual
rhythm, composition diversity, cross-page coherence, business-specific
storytelling.

**Hard requirement: the planner must be catalog-aware.** It must never commit to
a composition the component library cannot render. The Phase 2
`split_right` hero + `image` surface contradiction is the canonical failure.

Target architecture:

```
USER BRIEF → BUSINESS UNDERSTANDING → DESIGN DNA → SITE INTENT
          → CATALOG CAPABILITIES → COMPOSITION / BEAT PLAN
          → COMPONENT SELECTION → CONTENT → IMAGES → RENDER
```

Beats should carry meaning, not just order:

```
Hero          establish identity
Story         explain differentiation
Menu/products present offerings
Social proof  build trust
Reservation   drive action
```

Different businesses should produce genuinely different narratives — but **not
random orders**. Composition patterns per (archetype, page role), validated
against catalog capability, with the ledger applying plan-level pressure so
section order and layout intent diverge across builds. The component ranker will
then follow correctly without ever overriding composition quality.

**Suggested first steps** (propose, get approval, then implement):

1. Give the catalog a capability query the planner can ask *before* planning —
   e.g. which `layoutIntent`s a `(section, family, surface)` can actually
   render. `findCandidates` already has the data.
2. Replace `CORE_SECTIONS` back-fill in `planSections.ts` — it re-appends every
   section the archetype deliberately omitted, in a fixed tail order, and is a
   primary cause of the 3/7 section-order figure.
3. Introduce composition patterns per (archetype, page role) as vertical data.
4. Give the planner ledger access for plan-level diversity.
5. Benchmark against `phase3`; section orders and surface rhythms should rise
   with **no regression** in page-structure correctness, capability violations
   or contrast.

---

## 12. First actions when resuming

**Do not write code first.**

1. Read this checkpoint.
2. `git status` and `git log --oneline -5` — expect ~130 uncommitted paths on
   `main` at `20909f9`. Ask the user whether to commit before starting.
3. Locate the current implementations (§13) — verify paths, do not assume.
4. `cd backend && npx vitest run` — expect 58 files / 559 tests passing.
5. `cd backend && npx tsx scripts/benchmark.ts --label <name> --compare phase3`
   — expect metrics identical to §6.
6. Confirm the repo matches this checkpoint; if not, trust the repo and explain
   the difference.
7. Summarise the current state briefly.
8. Propose Phase 4 steps.
9. **Wait for approval.**

---

## 13. Key files (verified at checkpoint)

### Component intelligence
```
backend/src/schemas/componentSpec.schema.ts   142  ComponentSpec (strict Zod)
backend/src/catalog/index.ts                  208  validation, findCandidates,
                                                   resolveCandidates, listComponentIds,
                                                   defaultComponentId
backend/src/catalog/contracts.ts              191  SECTION_CONTRACTS + defineSpec
backend/src/catalog/premium.specs.ts          211  38 bespoke premium traits
backend/src/catalog/elegant.specs.ts           42  premium traits + 5 divergences
backend/src/catalog/familyKit.specs.ts         91  shared kit → minimal/rustic/vibrant
backend/src/catalog/bold.specs.ts              72  bespoke 01/02 + kit-derived 03
backend/src/pipeline/rankComponents.ts        275  scoring, terms, explainChoice
backend/src/pipeline/contentContract.ts        62  copy budget validation
```

### Understanding, planning, diversity
```
backend/src/pipeline/signalScoring.ts          85  generic weighted classifier
backend/src/pipeline/archetypeRules.ts        191  hospitality signal table (DATA)
backend/src/pipeline/siteIntent.ts            106  landing | single | multi
backend/src/pipeline/pageRoles.ts              94  page role table (DATA)
backend/src/pipeline/planSite.ts              168  page structure
backend/src/pipeline/sectionRhythm.ts         295  surface programs, intents, spacing
backend/src/pipeline/diversityLedger.ts       179  cohort memory + pressure
backend/src/pipeline/creativeDirector.ts      404  Design DNA
backend/src/pipeline/runPipeline.ts           912  orchestrator (large)
backend/src/lib/stableHash.ts                  14  determinism utility
```

### Rendering
```
frontend/src/render/PageRenderer.tsx          409  stamps data-* per section
frontend/src/styles/sectionLayout.css         181  data-* → --theme-* rewriting
frontend/src/components/pageRegistry.ts        19  merged component registry
frontend/src/components/familyKit/createFamilyRegistry.tsx  71  shared factories
frontend/src/components/shared/SectionFrame.tsx  62  thin landmark (no container)
```

### Tooling
```
backend/benchmarks/cases.ts                   261  7 launch-vertical cases
backend/benchmarks/metrics.ts                 352  metric computation
backend/benchmarks/out/<label>/                    stored runs (baseline … checkpoint)
backend/scripts/benchmark.ts                  259  runner
backend/scripts/explain-selection.ts          102  selection trace
backend/scripts/sync-fonts.ts                 100  font link generation
```

### Guarantee tests (read these to understand the invariants)
```
backend/src/catalog/scaling.test.ts                no hardcoded ids / suffixes;
                                                   every spec field has a consumer
backend/src/catalog/catalog.test.ts                spec validation + registration drift
backend/src/pipeline/designIntentWiring.test.ts    every design value has CSS
backend/src/pipeline/paletteContrast.test.ts       every accent passes AA
backend/src/pipeline/fontCoverage.test.ts          selectable ⇒ loaded
backend/src/pipeline/catalogIntegration.test.ts    DNA → catalog → ranking → Page JSON
backend/src/pipeline/diversityLedger.test.ts       diversity never beats correctness
backend/src/pipeline/pipelineSiteStructure.test.ts per-page rhythm + site structure
```

Other docs: `docs/04-GENERATION-ENGINE-AUDIT.md` (the original audit that
started this work — findings F1–F14 and the phased roadmap).

---

## 14. Commands

Verify `backend/package.json` before relying on these.

```bash
# tests
cd backend && npm test                 # vitest run — 559 tests
cd backend && npx vitest run <file>

# typecheck
cd backend  && npx tsc -p tsconfig.json --noEmit
cd frontend && npx tsc -b --noEmit
cd frontend && npm run build           # also proves Tailwind emits new utilities

# benchmark
cd backend && npm run benchmark -- --label <name> --compare phase3
cd backend && npm run benchmark -- --label x --no-ledger   # isolate ledger effect
cd backend && npm run benchmark -- --label live --live     # spends OpenAI tokens

# why was this component chosen?
cd backend && npm run explain -- casual-restaurant --scores
cd backend && npm run explain                              # all 7 cases

# font catalog drift
cd backend && npm run fonts:check
```

There is no lint script configured.

---

## 15. One-paragraph summary

The generation engine now has a working spine: business understanding is a
weighted classifier over vertical data; Design DNA sets palette, type, density
and rhythm; site intent decides landing vs single vs multi-page; a per-page
rhythm planner sets surface, emphasis, layout intent and spacing; a 228-entry
component catalog answers capability questions; a traceable ranker selects
components with diversity applied as a soft, capped signal; and design decisions
reach real pixels through `data-*` attributes that rewrite theme tokens per
section. What remains weakest is **composition** — section order is still
largely fixed (3/7), which is why two sites can use different components and
still feel the same. That is Phase 4, and it must be built against catalog
capability so the planner can never ask for a layout the library cannot render.
