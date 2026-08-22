# Website Generation Engine — Architecture Audit & Improvement Plan

**Date:** 2026-08-22
**Scope:** `backend/src/pipeline/**`, `backend/src/schemas/**`, `backend/data/**`, `backend/scripts/**`, `frontend/src/components/**`, `frontend/src/render/**`, `frontend/src/styles/**`
**Method:** full code read + two live measurement runs against the real pipeline (fixture mode, no LLM). Numbers below are measured, not estimated.
**Out of scope by instruction:** auth, billing, projects/persistence, assets upload, chat/edit UX.

---

## 0. Executive summary

The generation engine is more sophisticated than it looks. There is a real Creative Director stage, a curated 30-palette / 19-type-pair design system, an archetype model, a batched narrative-driven copywriter, fact and slop checking, and 395 passing unit tests. The previous audit (`01-OUTPUT-QUALITY-AUDIT.md`, 2026-08-11) has largely been executed.

The problem is not that the creative layer is missing. **The problem is that the creative layer's output never reaches the pixels.**

The Director emits an archetype, a signature, a section plan with per-section `layoutIntent` / `emphasis` / `background` / `spacing`, a palette, and a type pair. Of that, the renderer consumes exactly four things: accent, bg, ink, and (sometimes) two font names. Everything else is computed, serialised into Page JSON, stored in Postgres — and dropped. Meanwhile three genuine correctness bugs in the token layer degrade *every* build regardless of how good the creative decision was.

**Six findings account for essentially all of the quality gap:**

| # | Finding | Sev |
|---|---------|-----|
| F1 | CTA/button text colour is computed with the wrong formula — most generated buttons fail WCAG AA | P0 |
| F2 | 21 of 28 design-system fonts are never loaded; typography variety is fictional | P0 |
| F3 | Six "families" are three layout systems; four of them share identical DOM | P0 |
| F4 | The Director's layout plan is dead code — consumed by 1 of ~120 components | P0 |
| F5 | Section order is effectively fixed — 2 distinct orders across 8 different briefs | P0 |
| F6 | Component identity is a string suffix; selection is hardcoded to `01`/`02`/`03` | P0 |

F1 and F2 are bugs with ~2-day fixes and outsized visual impact. F3–F6 are architectural and drive the roadmap.

---

## A. Current architecture

### A.1 Module map

```
backend/src/
  routes/build.ts            POST /api/build  (SSE optional)  → runPipeline
  routes/projectPipeline.ts  project-scoped build/edit/ask orchestration
  pipeline/
    runPipeline.ts           9-stage orchestrator
    extractBrief.ts          LLM → Brief
    verifyBrief.ts           strips facts not present in source text
    creativeDirector.ts      deterministic core (seed, palette, hints)
    creativeDirectionLlm.ts  LLM art-director (archetype, plan, narrative, type)
    planSections.ts          section list + data gates + shell enforcement
    pickComponent.ts         COMPONENT_VARIANTS + suffix scoring
    writeAllCopy.ts          one batched LLM call for all sections
    writeCopy.ts             legacy per-section path + fixtures
    factCheck.ts / factCheckPage.ts / slopCheck.ts
    pickImage.ts             catalog filter + cuisine rank + rotation + dedup
    assemblePage.ts          Zod parse
    horecaDesignSystem.ts    palettes / type pairs / cuisine catalog loader
    colorResolve.ts          colour names, surface derivation, contrast
    paletteDefaults.ts       cuisine→palette buckets, AI-default detection
    inferPageFamily.ts       regex scoring → family
    applyEditOps.ts / runEdit.ts / remixSection.ts   edit-time mutation
  schemas/
    brief.schema.ts          Brief (restaurant-shaped)
    creativeDirection.schema.ts  CreativeDirection / SectionPlanItem / DNA-lite
    page.schema.ts           Page / PageSection / SectionLayout
    manifest.schema.ts       COMPONENT_MANIFESTS (generated from SECTION_SPECS)
  data/
    catalog.json             226 image rows (113 distinct files × 2 families)
    horecaDesignSystem.json  30 palettes, 19 type pairs, 91 cuisines
  scripts/
    variance-check.ts        sameness harness
    import-restaurant-images.py   Restaurant/** → webp + catalog rows

frontend/src/
  render/PageRenderer.tsx    Page JSON → React, deterministic
  components/pageRegistry.ts merged registry of all families
  components/premium/**      39 bespoke components
  components/elegant/**      38 bespoke components
  components/bold/**         14 bespoke + familyKit fallbacks
  components/familyKit/**    11 shared factories → minimal, rustic, vibrant, bold-03
  components/shared/SectionFrame.tsx   layout shell (used once)
  styles/pageThemes.css      per-family CSS custom properties
  lib/galleryCatalog.ts      component catalog UI derived from registry keys
```

### A.2 The nine stages (`runPipeline.ts`)

| Stage | LLM | What it actually does |
|-------|-----|----------------------|
| Brief Extractor | ✅ | `gpt-4o-mini` → Brief, then `verifyBriefAgainstSource` strips unsupported facts. Skipped when intake supplies a confirmed brief. |
| Creative Director | ✅ | `runCreativeDirectorSync` (seed, palette from brand colours or `inventPalette`, archetype, signature, variant hints) then `fetchCreativeDirectionLlm` on `gpt-4o` which may override archetype, section plan, narrative, palette, type pair. |
| Section Planner | ❌ | Uses `direction.sectionPlan` if present → `applyDataGates` → `ensureShell`. |
| Component Picker | ❌ | Per section: `pickComponent(sectionType, family, {brief, chatText, recentSuffixes, preferComponentId})`. Also reserves an image and drops the section if `manifest.requiresImage` and no image resolves. |
| Copywriter | ✅ | `writeAllSectionCopy` — one `gpt-4o` call, dynamic Zod object keyed by section type, seeded with narrative/signature/subject/archetype. |
| Fact-Safety | ❌ | `factCheck` + `slopCheck` over the batch; one retry with flagged spans; falls back to fixtures on failure. |
| Image Picker | ❌ | `enrichSectionContent` (menu items, hours, contact facts, nav) + `buildAssets` (gallery ×4, hero-03 ×3, team ×3, else ×1). |
| Assembler | ❌ | `assemblePage` (Zod) → `applyCreativePalette` → `pruneNavToPresentSections` → `factCheckPage` (warn only). |
| Renderer | ❌ | No-op on the backend. |

Every stage is padded to 300–900 ms by `ensureStageFeel` for "multi-agent UX feel" — roughly 3–8 s added to every build.

### A.3 Complete lifecycle trace

```
chat text / confirmed brief
  → extractBrief (LLM)            Brief { businessName, category, menuItems, usp, story,
                                          foundedYear, signatureDishes, audience, priceBand,
                                          vibe, hours, neighbourhood, awards, testimonials,
                                          team, dietary, socials, photos, brandColors, lat/lng }
  → inferPageFamily (route)       regex scoring over ~100 patterns → one of 6 families
  → runCreativeDirectorSync       seed = name|category|colors|family
                                  palette = brandColors → paletteFromBrandColors
                                          | inventPaletteFromHoreca(cuisine catalog)
                                          | PALETTE_BUCKETS regex
                                          | DEFAULT_PALETTE_OPTIONS
                                  archetype = inferArchetype (6 values)
                                  signature = buildFixtureSignature(archetype)
                                  hints = buildSectionVariantHints (hash per section)
                                  sectionPlan = buildFixtureSectionPlan (4-item prefix reorder)
  → fetchCreativeDirectionLlm     may replace archetype / plan / narrative / palette / typePairId
  → planSections                  plan types → data gates → ensureShell + CORE_SECTIONS backfill
  → planSectionComponents         pickComponent per section (hint wins by suffix match)
                                  pickImage per section, usedPaths dedup
  → writeAllSectionCopy           one batched LLM call → { sectionType: { field: string } }
  → enrichSectionContent          brief facts injected (menu, hours, nav, testimonials, team)
  → buildAssets                   image paths per section
  → assemblePage                  Zod parse
  → applyCreativePalette          themeOverrides = { accent, accentContrast, bg, bgAlt, ink,
                                                     bgDark, card, muted, onDark,
                                                     fontDisplay?, fontBody? }
  → PageRenderer                  themeOverrides → CSS custom properties on a
                                  `.${family}-theme @container/page` root
                                  each section → pageComponentRegistry[componentId]
```

### A.4 Measured behaviour (8 restaurant/cafe briefs, fixture mode)

```
distinct families         3 / 8   (premium, elegant, rustic)
distinct section orders   2 / 8   ← six builds byte-identical
distinct variant strings  8 / 8
distinct accent colours   6 / 8
distinct fontDisplay      1 / 8   ← none set; all fall back to family CSS default
distinct hero images      6 / 8
layout intents emitted    full_bleed / split_left / grid / centered   (none affect the DOM)
```

`scripts/variance-check.ts` on its own 5 fixtures:
```
Distinct section orders: 3 / 5
Mean pairwise text Jaccard: 0.754   (target < 0.25)
Image reuse rate: 24.5%             (target < 15%)
→ "VARIANCE CHECK OK"
```
The harness reports OK because its only failing condition is `distinctOrders < 2`. Both stated targets are missed and nothing fails.

---

## B. What already works — preserve this

1. **The stage contract and SSE streaming.** `pipelineStages.ts` + `routes/build.ts` give a clean, observable spine. Keep the stage names; replace only their internals.
2. **Page JSON as a versioned, Zod-validated document.** `pageSchema` + `PageRenderer` determinism (same JSON → same HTML) is the right foundation for regeneration, editing, versioning, and visual QA.
3. **Container-query responsive strategy.** Components use `@min-[640px]` etc. against `@container/page`, and `LivePreviewPane` renders true 375 / 768 / desktop artboards. This is a genuinely better approach than viewport media queries for an in-app preview, and it should not be touched.
4. **Fact discipline.** `verifyBriefAgainstSource`, `factCheck`, `factCheckPage`, `slopCheck`, and the "real data only" gates in `sectionDefaults.ts` (no fabricated chefs, testimonials, or guest counts) are a competitive asset. Keep them.
5. **The HoReCa design system data.** 30 curated palettes, 19 type pairs, 91 cuisine/sub-cuisine variants in `horecaDesignSystem.json`. This is exactly the "controlled design rules, not arbitrary AI hex codes" asset the engine needs — it is simply underused.
6. **395 passing unit tests** over pure functions. Excellent regression floor for the logic layer.
7. **Batched copy generation** with shared narrative — already fixes the "13 independent LLM calls" problem from the prior audit.
8. **The edit-ops system** (`parseEditOps`, `applyEditOps`, `remixSection`, targeted edits) is a well-shaped mutation layer and independent of these findings.

---

## C. Findings, ranked

### P0

---

#### F1 — CTA text colour is computed with the wrong formula; most buttons fail WCAG AA

**Current implementation.** `colorResolve.ts:184`
```ts
export function contrastForAccent(accentHex: string): string {
  return luminance(accentHex) > 0.55 ? "#111111" : "#ffffff";
}
// luminance() = (0.299r + 0.587g + 0.114b) / 255
```
`accentContrast` becomes `--theme-accent-contrast`, which is the text colour of every primary button in every token bundle (`primaryButton: bg-[var(--theme-accent)] text-[var(--theme-accent-contrast)]`).

**Problem.** This is YIQ perceived brightness, not WCAG relative luminance, and a fixed 0.55 threshold is not a contrast test. Measured against the accents actually produced by `inventPalette`, `PALETTE_BUCKETS`, and `horecaDesignSystem.json`:

| Accent | Chosen text | Ratio | Ratio if the other colour were chosen |
|--------|-------------|-------|----------------------------|
| `#8fa0b5` premium default | white | **2.67** | 7.07 |
| `#c9a962` elegant gold | white | **2.25** | 8.39 |
| `#d9a441` spice-route secondary | white | **2.25** | 8.40 |
| `#e09f3e` saffron | white | **2.28** | 8.27 |
| `#c4a484` cocoa night | white | **2.34** | 8.08 |
| `#d4b896` champagne | white | **1.89** | 9.98 |
| `#84a98c` citrus | white | **2.61** | 7.23 |
| `#2a9d8f` agave | white | **3.32** | 5.68 |
| `#c45c26` charcoal fire | white | **4.28** | 4.41 |

Nine of the twelve accents in active use fail AA (4.5:1), several by a factor of four, and in every case the *opposite* choice would have passed comfortably.

**Why it causes the problem.** This is the single most visible surface on the page — the primary CTA — on essentially every generated site, in both default families. Washed-out button labels read as "cheap template" before a viewer consciously registers anything else. It also silently defeats the rest of the design work.

**Proposed fix.** Replace with proper sRGB relative luminance and a real ratio test; pick whichever of ink/paper wins, and if neither reaches 4.5:1, darken or lighten the accent until one does.
```ts
relLuminance(hex)                  // sRGB linearisation, 0.2126/0.7152/0.0722
contrastRatio(a, b)
pickReadableInk(bg, candidates)    // best ratio, ≥4.5 enforced
ensureAccentIsUsable(accent)       // shift L* until a 4.5:1 partner exists
```
**Benefits.** Every CTA becomes legible; the whole palette layer becomes trustworthy. **Risks.** Some accents shift slightly in lightness — visible but strictly an improvement. **Migration.** Pure function swap; add a unit test that walks all 30 catalog palettes + all `PALETTE_BUCKETS` options and asserts ≥4.5:1. Stored pages recompute on next edit; optionally backfill `accentContrast` in a version migration.

---

#### F2 — 21 of 28 design-system fonts are never loaded

**Current implementation.** `horecaDesignSystem.json` defines 19 type pairs across 28 faces. `fontStackFor()` emits `"Cormorant Garamond", Georgia, serif`. `frontend/index.html`, `preview.html`, and `gallery.html` each load exactly seven families: Albert Sans, Alumni Sans, DM Sans, Instrument Serif, Pacifico, Playfair Display, Rubik.

**Problem.** Cormorant, EB Garamond, Karla, Lora, Nunito Sans, Bodoni Moda, Cinzel, Marcellus, Spectral, Yeseva One, Big Shoulders Display, Bebas Neue, Bitter, Baloo 2, Manrope, Mulish, Poppins, Quicksand, Sora, Source Sans 3, Urbanist, Work Sans — 21 faces — resolve to `Georgia` or `system-ui`. The `OVERUSED_FONT_REMAP` table makes this worse: it maps Inter → Karla and Geist → DM Sans, and Karla is not loaded either.

Compounding it: `runCreativeDirectorSync` never sets `fontDisplay`/`fontBody`. Fonts are only applied inside `applyTypePair`, which runs only when the LLM returns a valid `typePairId`. On the fixture path, on LLM failure, and whenever the model returns an id outside the allow-list, the page has no type override at all — measured as **1 distinct `fontDisplay` across 8 builds**.

**Why it causes the problem.** Typography is the loudest signal of design identity. Right now every generated site is Playfair Display / DM Sans / Georgia / system-ui regardless of what the Director decided. The "type pair" layer is a no-op that costs LLM tokens.

**Proposed fix.** (a) Generate the Google Fonts `<link>` from the design-system catalog at build time so the two can never drift, subsetted with `display=swap`; or trim the catalog to a curated ~10 pairs and load exactly those. (b) Always resolve a deterministic type pair from the seed in `runCreativeDirectorSync`, so the LLM *refines* the choice rather than being the only source of it. (c) Add a startup assertion that every `typePairs[]` face appears in the loaded stylesheet.

**Risks.** Font payload — mitigate by capping the catalog to the pairs you will actually ship and subsetting to `latin`. **Migration.** Additive; no schema change.

---

#### F3 — Six "families" are three layout systems, four of them identical

**Current implementation.** `createFamilyRegistry(family, tokens)` (`familyKit/createFamilyRegistry.tsx`) builds a complete 33-slot registry from shared factories. `minimal/registry.ts`, `rustic/registry.ts`, and `vibrant/registry.ts` are 7 lines each and differ only in the `ThemeTokens` object passed in. `bold` overrides 01/02 slots with 14 bespoke components but inherits every `-03` from familyKit.

**Problem.** A "Minimal" site and a "Vibrant" site have byte-identical DOM structure, identical grids, identical section rhythm, identical spacing scale. Only Tailwind token strings differ. Real layout diversity is: premium (bespoke), elegant (bespoke), familyKit (shared) — three systems, not six.

**Why it causes the problem.** The family axis is presented to the engine (and to `inferPageFamily`'s 100+ regexes) as the primary diversity lever. It is mostly a colour swap. Two restaurants routed to different families still produce the same page skeleton.

**Proposed fix.** Separate the two concepts that are currently fused into one string:
- **Theme** = token bundle (colour, type, radius, shadow, spacing scale, media treatment). Cheap to add, currently what "family" mostly means.
- **Layout family** = actual composition system (editorial / grid / immersive / band / minimal / list). Expensive to add, currently what "family" pretends to mean.

Component ids stop encoding family (`premium-hero-01` → `hero.editorial-still.01`) and any component can render under any theme. Diversity then becomes *theme × layout family × composition*, which is multiplicative instead of additive.

**Risks.** This is the largest single change; it touches every component id and stored Page JSON. **Migration.** Keep an alias table `premium-hero-01 → hero.overlay-full.01`; `PageRenderer` resolves through it. Migrate familyKit first (one file), premium/elegant behind a flag.

---

#### F4 — The Creative Director's layout plan is dead code

**Current implementation.** `sectionPlanItemSchema` carries `emphasis`, `layoutIntent` (9 values), `background` (5 values), `spacing` (3 values). The LLM fills them. `runPipeline` copies them onto `section.layout`. `SectionComponentProps` types them. `SectionFrame.tsx` maps all four onto real classes.

**Problem.** `SectionFrame` is imported by exactly **one** component — `familyKit createAbout01`. Grep across `premium`, `elegant`, `bold`, and `familyKit`: one file destructures `layout` from props. Roughly 1 of ~120 registered components reacts to the plan.

Worse, in that single case the wrapper and the component fight: `SectionFrame` applies `intentClass()` → `mx-auto grid max-w-6xl gap-8 px-5 …` and then `FamilyAbout01` renders its own `mx-auto grid max-w-6xl gap-8 …` inside it. Two competing containers, doubled max-width constraints, doubled padding.

**Why it causes the problem.** This is the mechanism by which "editorial layout", "asymmetric", "full-bleed", "dark band", and "roomy spacing" were supposed to reach the page. None of it renders. Every section keeps whatever geometry was hardcoded in its own JSX, so the entire creative-direction layer collapses to a colour palette. It is also paid-for LLM output that is thrown away on every build.

**Proposed fix.** Make `SectionFrame` the mandatory shell for every generated section. It owns surface, vertical rhythm, emphasis, and container mode; the component owns only its content composition and receives a resolved `layout` object. Add a lint/test that fails if a registered component does not render through `SectionFrame`.

**Risks.** Visual regressions across every component. **Migration.** Do familyKit first (11 files, 4 families at once), verify with the benchmark contact sheet, then premium, then elegant.

---

#### F5 — Section order is effectively fixed

**Current implementation.** Three layers stack:
```ts
// creativeDirectionLlm.ts — archetype reorder touches only a 4-item prefix
reorderTypes(types, ["header","hero","menu","about"])
// planSections.ts — data gates drop optional sections
if (type === "services")     return serviceCards.length >= 3;
if (type === "testimonials") return testimonials.length >= 2;
// planSections.ts — then everything missing is appended back
for (const required of CORE_SECTIONS) if (!sections.includes(required)) sections.push(required);
```

**Problem.** Measured across 8 distinct briefs (modern cafe, specialty coffee, French fine dining, Italian trattoria, artisan bakery, neighbourhood coffee shop, Japanese fine dining, barbecue smokehouse): **2 distinct section orders**. Six were identical:
`header > hero > about > menu > stats > gallery > reservation > location_map > contact > footer`

Causes, in order of impact:
- `CORE_SECTIONS` back-fill re-appends anything the archetype or the LLM deliberately omitted, always in the same tail order.
- Archetype reordering only permutes a four-item prefix; the tail (`gallery → reservation → location_map → contact → footer`) never moves.
- Data gates remove `services`/`testimonials`/`team` for almost every real brief, so the surviving set is constant across businesses.
- `stats` survives on filler: `realStats()` emits `{value:"1", label:"Cuisine Focus"}` and `{value:"5", label:"Menu Favorites"}`, which clears the `>= 3` gate for essentially every brief. A bakery gets a stats band reading "1 Cuisine Focus".

**Why it causes the problem.** Section sequence is the most legible structural signature of a website. Identical sequence + identical DOM (F3) + identical layout (F4) means the only thing distinguishing two generated sites is hue and photography.

**Proposed fix.** Replace list-building with *beat planning*: the planner emits an ordered list of narrative beats with a role, an emphasis, and a surface, chosen from composition patterns per archetype; sections are then materialised onto beats. Delete `CORE_SECTIONS` back-fill — a section the plan omitted is omitted. Require alternation rules (no two consecutive `base` surfaces, no two consecutive `grid` layouts, exactly one `hero` emphasis).

---

#### F6 — Component identity is a string suffix; selection is hardcoded to 01/02/03

**Current implementation.**
```ts
// pickComponent.ts — ids are template-generated, exactly 3 per section
function familyVariants(family) {
  return { hero: [`${family}-hero-01`, `${family}-hero-02`, `${family}-hero-03`], … };
}
// scoring is a wall of suffix literals
if (suffix === "02") { if (sectionType === "gallery" && photoHeavy) score += 5; … }
if (suffix === "03") { if (sectionType === "about" && roomForward) score += 5; … }
```
`manifest.schema.ts` mirrors the same shape with `variants: ["01","02","03"]`.

**Problem.** The only machine-readable facts about a component are family, section type, variant suffix, `copyFields`, and `requiresImage`. There is no density, image count, visual weight, style, industry fit, or adjacency information. Consequences:
- A new `hero-04` receives **zero** scoring signal — no branch mentions `"04"` — so it can only be selected by hash tie-break, and only when it happens to tie the leader.
- Adding one component requires coordinated edits in at least four places: the component file, the frontend registry, `COMPONENT_VARIANTS`, and `SECTION_SPECS` — plus new scoring branches to make it reachable. `docs/COMPONENT-CATALOG.md` documents this as the authoring checklist.
- Selection cannot reason about composition at all. It matches keywords to a suffix; it has no idea whether the hero it picked is image-heavy and whether the next section is also image-heavy.

**Why it causes the problem.** This is the hard ceiling on the component library. 100 heroes is not reachable; 6 would already break the scoring model.

**Proposed fix.** Per-component `ComponentSpec` metadata colocated with the component, a generated catalog, and a scoring function that reads characteristics instead of suffixes. Detailed in §E.

---

### P1

| # | Finding | Where | Impact |
|---|---------|-------|--------|
| F7 | **No component metadata.** Only family/section/suffix/copyFields/requiresImage exist. | `manifest.schema.ts` | Blocks all ranking, compatibility, and diversity logic |
| F8 | **Image catalog has no visual metadata, and section assignment is accidental.** `assign_section()` routes by aspect ratio + pool balancing; tags come only from folder names. 113 distinct files duplicated to 226 rows; `catalogFamilyFor()` collapses 4 families back to `premium`, so it is one pool. **Zero `cafe`/`coffee`/`bakery`/`pastry`/`bar` tags** — the launch vertical has no imagery of its own. | `import-restaurant-images.py`, `catalog.json`, `pickImage.ts` | Wrong-feeling hero shots; cafés get restaurant interiors |
| F9 | **No content constraints.** Every copy field is `z.string()` with no maximum. No per-component length budget. | `writeAllCopy.ts`, `manifest.schema.ts` | Long headlines/CTAs break layouts designed for short ones |
| F10 | **No structural validation before render.** `assemblePage` validates shape only. `factCheckPage` `console.warn`s and continues. | `assemblePage.ts`, `runPipeline.ts:534` | Broken pages ship silently |
| F11 | **Copy is not constrained by the chosen component.** `copyFields` are shared across all variants of a section type, so the writer cannot know `menu-03` features one dish while `menu-01` is a two-column list. | `manifest.schema.ts` | Copy/layout mismatch |
| F12 | **Zero visual regression coverage.** 395 tests, all pure functions. No render test, no screenshot, no DOM assertion, no responsive check. The variance harness's only hard gate is `distinctOrders < 2`, so it passes at 0.754 Jaccard. | `*.test.ts`, `variance-check.ts` | Quality regressions are invisible |
| F13 | **Single-page data model.** `Project` holds one `page Json`; there is no Site → Pages → Sections. | `schema.prisma`, `page.schema.ts` | Multi-page is not expressible |
| F14 | **Brief schema is restaurant-shaped.** `menuItems`, `signatureDishes`, `priceBand: fine_dining`, `reservation` are first-class; `SectionType` includes `menu`/`reservation` as enum members. | `brief.schema.ts`, `page.schema.ts` | Every new industry forces schema surgery |

### P2

- `realStats()` manufactures filler metrics ("1 / Cuisine Focus") that clear the data gate and put a weak stats band on nearly every page.
- `ensureStageFeel` pads all nine stages 300–900 ms — ~3–8 s of deliberate latency per build.
- `inferPageFamily` is ~110 hand-tuned regexes over restaurant vocabulary with special-case patches (`applyTeaAffinity`, "elegant === 1 && premium >= 1 → 0"). It will not survive a second industry.
- `SECTION_TO_CATALOG` reuses the `about` pool for `team` and `location_map`, and the `hero` pool for `reservation` — team "portraits" are actually interior shots.
- Contrast guard in `applyCreativePalette` only checks page-level light-on-light; per-section `background: dark|accent` combinations are unchecked.
- `NAMED_COLORS` / `FONT_STACKS` in `colorResolve.ts` duplicate concepts in `horecaDesignSystem.json`.
- `writeCopy.ts` (626 lines, per-section path) is superseded by `writeAllCopy.ts` for builds but still carries the retry/fact-check logic used by edits — two divergent copy paths.

### P3

- `defaultStats()` is a deprecated alias for `realStats()`.
- `README.md` and `CURRENT_USAGE.md` describe a 2-family / 5-section system that no longer exists.
- `backend/dist/` is committed and stale.

---

## D. Root causes

**RC1 — The decision layer and the render layer are not connected.** The Director produces archetype, signature, section plan, layout intents, palette, and type; the renderer consumes accent, bg, ink, and sometimes two font names. Everything else evaporates (F4). All diversity therefore collapses onto hue.

**RC2 — Variety was modelled as `families × suffixes` rather than as composition.** 6 families × 13 sections × 3 variants reads like 234 building blocks. It is actually 3 DOM systems × 3 near-identical variants, with a fixed order (F3, F5).

**RC3 — Component identity carries no design semantics.** Because a component is just a string, no ranking beyond keyword→suffix heuristics is expressible, and the library cannot grow (F6, F7).

**RC4 — Images are a filing cabinet, not an index.** Assignment by aspect ratio, retrieval by section + family + cuisine token. No mood, lighting, dominant colour, subject, or crop-safety data, and nothing about the launch vertical (F8).

**RC5 — There is no feedback loop.** Nothing renders, measures, or scores output. The one harness that exists cannot fail on its own stated targets (F12).

**RC6 — Token-layer correctness bugs degrade every build regardless of creative quality.** Contrast maths and font loading are wrong in ways that are invisible in code review and glaring on screen (F1, F2).

---

## E. Proposed architecture

Same nine stage names (keep the SSE contract and the UX). New internals.

```
REQUEST
  → BRIEF            core facts + vertical extension
  → DESIGN DNA       recipe-assembled, contrast-verified, deterministic-first
  → COMPOSITION PLAN page set → section beats → layout roles → emphasis/surface rhythm
  → RESOLUTION       metadata query → scored candidate selection per beat
  → CONTENT          per-slot field contracts with length budgets
  → MEDIA            facet query ranked against DNA
  → COMPOSE          Page JSON
  → VALIDATE         structural + token + a11y + duplication   (Tier 0, always)
  → RENDER           SectionFrame drives geometry
  → QA               Tier 1 always (headless metrics) · Tier 2 sampled (vision) → repair
  → TRACE            one record explaining every decision
```

### E.1 Component system

One file per component, colocated spec, generated catalog.

```ts
export const spec: ComponentSpec = {
  id: "hero.overlay-full.01",        // no family in the id
  section: "hero",
  layoutFamily: "immersive",         // editorial | grid | immersive | band | split | list | minimal

  slots: {                           // the content contract — also the copy budget
    headline: { required: true,  max: 64,  tone: "thesis" },
    body:     { required: false, max: 180 },
    cta:      { required: true,  max: 22,  kind: "action" },
  },
  media: { count: 1, aspect: "16/9", role: "atmosphere", focal: "safe-center" },

  density: 2,                        // 1–5, how much lands per screen
  visualWeight: 5,                   // 1–5, how loud
  surface: "image",                  // light | dark | either | image
  textOverMedia: true,

  styles: ["cinematic", "editorial"],
  industries: { exclude: ["saas"] }, // default is universal — opt out, don't opt in
  tier: "core",

  adjacency: { avoidAfter: ["*.immersive.*"], goodBefore: ["about.*", "menu.*"] },
  responsive: { stacksAt: 768, minTouchTarget: 44 },
};
export default function HeroOverlayFull01(props: SectionProps) { … }
```

**Registration.** Frontend discovers specs with `import.meta.glob`. A build step (`npm run components:sync`) emits `catalog.generated.json`, which the backend imports instead of `COMPONENT_VARIANTS` and `SECTION_SPECS`. Adding a component becomes: create the file → run sync → it is live in generation, in the gallery, and in the benchmark. No edits to selection, manifests, or scoring.

**Why `industries` is an exclude-list, not an include-list.** An include-list forces every existing component to be re-tagged whenever a new industry is added — exactly the "rewrite the engine per vertical" failure mode. Universal by default, opt out where genuinely inappropriate.

**Taxonomy.** Three orthogonal axes, not one:
- `section` — what content role it fills (hero, about, features, menu, gallery, testimonials, pricing, faq, cta, contact, footer, …). Extensible enum.
- `layoutFamily` — how it composes space. This is the diversity axis and should stay small (6–8 values).
- `styles` — mood tags for DNA matching. Free-form, many per component.

Theme (colour/type/radius/shadow/spacing) is a *fourth, independent* axis applied at render, not baked into the id.

### E.2 Design DNA

```ts
type DesignDNA = {
  seed: string;
  personality: string[];                    // from brief vibe/usp/audience
  layoutFamily: LayoutFamily;               // primary composition language
  secondaryFamily: LayoutFamily;            // permitted contrast, used sparingly
  rhythm: { emphasisCurve: Emphasis[]; surfaceCycle: Surface[]; spacingScale: "compact"|"normal"|"generous" };
  palette: { accent; accentInk; bg; bgAlt; bgDark; ink; muted; line; card;
             verified: Array<[fg, bg, ratio]> };   // every pair proven ≥4.5:1
  type: { displayId; bodyId; scale; headingWeight; tracking };
  geometry: { radius; shadow; mediaTreatment: "full-bleed"|"framed"|"inset"; borderStyle };
  media: { lighting: "bright"|"moody"|"neutral"; saturation: "muted"|"natural"|"rich";
           subjectBias: string[]; orientationBias };
  signature: { section: SectionType; device: string };
};
```

**Assembled from recipes, not invented per-build.** A recipe is a curated, known-good combination — palette + type pair + geometry + rhythm + media mood — drawn from `horecaDesignSystem.json` (already 30 palettes × 19 pairs) plus a small hand-written recipe layer. The LLM's job narrows to: *choose among recipes*, *choose the signature*, *write the narrative*. It never emits raw hex codes. This is the answer to "controlled design rules rather than arbitrary AI-generated hex codes", and it makes palettes reviewable, testable, and reusable.

Every DNA passes contrast verification at construction time — a DNA that cannot produce a legible CTA is rejected before it reaches a component.

### E.3 Selection and ranking

Deterministic, testable, no LLM:

```
score(candidate, beat, dna, page) =
    w1 · styleFit(candidate.styles, dna)
  + w2 · layoutFit(candidate.layoutFamily, dna, beat.role)
  + w3 · contentFit(candidate.slots, availableContent)     // hard gate if required slots unfillable
  + w4 · mediaFit(candidate.media, availableImages)        // hard gate if imagery unavailable
  + w5 · emphasisFit(candidate.visualWeight, beat.emphasis)
  + w6 · adjacencyBonus(prev, next, candidate.adjacency)
  + w7 · diversityBonus(candidate, page.usedLayoutFamilies, recentBuildLedger)
  − penalties(constraintViolations)
```
Hard gates first (content and media availability), then scoring, then a seeded tie-break. Each term is independently unit-testable, and every score is written to the trace so a bad pick is explainable rather than mysterious.

### E.4 Page planning and multi-page

```
Site
 ├ dna: DesignDNA                        shared across all pages
 ├ nav: NavModel                         derived from page set
 └ pages: Page[]
     ├ role: "home" | "about" | "menu" | "services" | "gallery" | "contact" | …
     ├ beats: SectionBeat[]              role, emphasis, surface, layout role
     └ sections: PageSection[]           resolved components + content + assets
```
Composition patterns live per `(archetype, pageRole)` — a home page for `story_led` is a different beat sequence than a home page for `menu_forward`, and an about page is a different sequence again. Shared DNA guarantees family resemblance; distinct beat patterns guarantee each page has its own composition.

Database: `ProjectVersion.page Json` becomes `ProjectVersion.site Json` with a version tag; a reader shim wraps a legacy single page as `{ pages: [{ role: "home", … }] }`. No destructive migration.

### E.5 Image intelligence

Three changes, in order:

1. **Re-index the existing 113 files** with a one-time vision pass, cached to `catalog.json`. Add per-image: `subject` (dish / interior / exterior / people / detail / ingredient), `lighting`, `dominantColors`, `saturation`, `mood`, `hasPeople`, `hasText`, `safeCropRegion`, `quality`. One-time cost, permanent asset.
2. **Stop assigning `section_type` by aspect ratio.** Section fit becomes derived from `subject` + `orientation` + `safeCrop`, so a hero request asks for *"landscape, interior or exterior, moody, text-safe region present"* rather than *"row tagged hero"*.
3. **Rank against DNA, not just cuisine.** `score = subjectFit + moodFit(dna.media) + colorHarmony(dominantColors, dna.palette) + orientationFit + freshness(usedPaths, recentBuilds)`. A luxury restaurant DNA pulls dark/warm/moody; a modern-cafe DNA pulls bright/natural/airy — from the same pool, with no category-specific branching.

Also required before launch: **source cafe / coffee / bakery / pastry / counter imagery.** The launch vertical currently has none.

### E.6 Content constraints

`ComponentSpec.slots` is the contract. The copy schema is generated *per selected component*, not per section type, so the LLM is told the real budget:
```ts
headline: z.string().max(64)   // and the prompt states "≤64 characters, one line"
```
After generation, a deterministic fit-check measures rendered length against the budget; overflow triggers one targeted shortening call for the offending fields only, not a full regeneration. This directly fixes "hero headline too long breaks the design" without another expensive loop.

### E.7 Validation (Tier 0 — every build, deterministic, milliseconds)

| Check | Fails on |
|-------|----------|
| Slot completeness | required slot empty or whitespace |
| Length budgets | any field over `spec.slots[*].max` |
| Media contract | `spec.media.count` unmet, aspect mismatch, missing asset |
| Duplicate media | same `imagePath` twice on one page |
| Adjacency | `avoidAfter` violated, two consecutive identical `layoutFamily` |
| Surface rhythm | three consecutive identical surfaces |
| Emphasis | zero or more than one `hero` emphasis |
| Contrast | every text/surface pair in the resolved DNA below 4.5:1 |
| Nav integrity | nav target not present in the page |
| Structure | duplicate section roles, missing header/footer |

Failures become repairs, not warnings: re-pick the component, shorten the copy, swap the image, adjust the surface. `factCheckPage`'s current `console.warn` becomes a real gate.

### E.8 Visual QA — tiered, so cost stays bounded

| Tier | When | How | Cost |
|------|------|-----|------|
| **0 — structural** | every build | §E.7, pure functions | ~0 |
| **1 — rendered metrics** | every build | headless render at 390 / 768 / 1440; assert no horizontal overflow, no clipped text, CTA above fold, image aspect honoured, computed-style contrast sampled, tap targets ≥44px | ~1–2 s, no model call |
| **2 — vision score** | sampled | screenshot → vision model → scores on hierarchy, spacing, type, colour, image relevance, repetition, professionalism | 1 model call |

Tier 2 runs on: the benchmark suite (always), the first build of a new project, and any build where Tier 1 flagged something. **Maximum one repair pass**, and repair emits targeted ops (swap component, shorten field, change surface, replace image) rather than regenerating the page — so the loop provably terminates. If the repaired score does not improve, keep the higher-scoring version and record it.

Scoring shape:
```json
{ "overall": 84, "hierarchy": 88, "spacing": 79, "typography": 90,
  "color": 86, "imagery": 74, "originality": 81,
  "issues": [{ "section": "gallery", "axis": "spacing", "note": "…", "fix": "spacing:roomy" }] }
```
Thresholds: ship ≥75; repair 60–74; below 60 fall back to the last known-good DNA recipe.

### E.9 Diversity system

Two scopes:
- **Within a page** — penalise repeated `layoutFamily`, repeated surface, repeated media treatment. Enforced in scoring and re-checked in Tier 0.
- **Across builds** — a small ledger keyed by `(industry, archetype)` recording the last N choices of recipe, layout-family sequence, hero component, and image paths. New builds take a diversity bonus for unused combinations. Bounded, cheap, and it directly answers "Restaurant A ≠ Restaurant B ≠ Restaurant C".

Measured continuously by the benchmark: distinct beat sequences, distinct layout-family sequences, mean pairwise text Jaccard, image reuse rate, distinct recipes.

### E.10 Multi-industry

Nothing in the engine references a vertical. Verticals are data:

```
verticals/restaurant.ts
  sectionRoles: ["menu", "reservation", …]     // extends the base role set
  briefExtension: z.object({ menuItems, signatureDishes, priceBand, … })
  archetypes: [...]
  compositionPatterns: { home: [...], menu: [...] }
  recipePreferences: [...]
  imageFacetBias: { subject: ["dish","interior"] }
```
The Brief splits into `core` (businessName, category, contact, location, story, audience, personality, media, brand) + `vertical` (typed extension). `inferPageFamily`'s regex wall is replaced by: vertical detection (a small classifier or an explicit choice at intake) → recipe selection within that vertical. Adding Real Estate means adding one vertical file and its recipes — no engine changes.

### E.11 Observability

One `GenerationTrace` per build, persisted alongside the version:
```
generationId, briefHash, seed, vertical, archetype
dna { recipeId, paletteId, typePairId, layoutFamily, signature }
plan [ { beat, role, emphasis, surface } ]
selections [ { beat, chosenId, score, runnerUp, scoreBreakdown, rejectedFor } ]
media [ { section, path, score, reason } ]
content [ { field, chars, budget, shortened } ]
validation [ { check, status, repairApplied } ]
qa { tier1, tier2, repairs, finalScore }
timings, modelCalls, tokens, cost
```
This is what makes the system improvable: when a page looks wrong you can see *which* score was wrong.

---

## F. Benchmark (build this before the refactors)

`npm run bench` — fixed briefs, fixed seeds, no LLM variance where avoidable.

Launch set (restaurants + cafés): modern cafe · luxury restaurant · casual restaurant · bakery · coffee shop · fine-dining restaurant · multi-page restaurant.
Later: SaaS · IT company · real estate · hotel · agency · portfolio.

Emits a scorecard JSON plus a contact sheet of screenshots at 390 / 768 / 1440, diffed against a committed baseline.

| Metric | Today (measured) | Target |
|--------|------------------|--------|
| Distinct section/beat orders | 2 / 8 | ≥ 6 / 8 |
| Distinct layout-family sequences | 1 | ≥ 5 / 8 |
| Mean pairwise text Jaccard | 0.754 | < 0.30 |
| Image reuse rate | 24.5% | < 10% |
| Distinct `fontDisplay` | 1 / 8 | ≥ 5 / 8 |
| Contrast pass rate (AA) on CTAs | ~25% | 100% |
| Horizontal overflow at 390px | unmeasured | 0 |
| CTA above fold at 390px | unmeasured | 100% |
| Tier-2 overall score | unmeasured | ≥ 75 median |

The harness must **fail** on these, unlike the current one.

---

## G. Roadmap

Each phase is independently shippable and independently measurable.

### Phase 0 — Correctness + benchmark  *(recommended first, ~2 days)*
**Files.** `colorResolve.ts`, `creativeDirector.ts`, `horecaDesignSystem.ts`, `frontend/index.html` + `preview.html` + `gallery.html` (or a generated shared font loader), new `backend/scripts/benchmark.ts`, `frontend` screenshot runner.
**Changes.** WCAG contrast maths + `pickReadableInk` + `ensureAccentIsUsable`; generate the font `<link>` from the design-system catalog and assert coverage at startup; always resolve a deterministic type pair in `runCreativeDirectorSync`; build the 7-prompt benchmark with real failing thresholds.
**Dependencies.** None.
**Expected result.** Every CTA legible; typography actually varies across builds; a measured baseline exists for everything that follows.
**Risks.** Font payload (subset + `display=swap`); minor accent lightness shifts.
**Tests.** Contrast unit test walking all 30 catalog palettes and all `PALETTE_BUCKETS` options; font-coverage assertion; benchmark baseline committed.

### Phase 1 — Make layout real
**Files.** `shared/SectionFrame.tsx`, `familyKit/sections/*` (11 files), then `premium/**`, then `elegant/**`.
**Changes.** `SectionFrame` becomes the mandatory shell owning surface, spacing, emphasis, and container mode; remove the duplicated `mx-auto grid max-w-6xl` from components; add a test that fails when a registered component does not render through it.
**Dependencies.** Phase 0 (for regression evidence).
**Expected result.** `layoutIntent` / `background` / `spacing` change pixels; the Director's plan stops being dead.
**Risks.** Broad visual regression — mitigate by doing familyKit first (4 families at once) behind the benchmark contact sheet.

### Phase 2 — ComponentSpec + generated catalog
**Files.** new `frontend/src/components/**/spec.ts` colocations, new `scripts/components-sync.ts`, `manifest.schema.ts` (→ reads generated catalog), `pickComponent.ts` (→ candidate query), `galleryCatalog.ts` (→ reads specs).
**Changes.** Introduce `ComponentSpec`; decouple id from family; alias table for stored pages.
**Expected result.** Adding a component = one file + sync. Component gallery gains real filters.
**Risks.** Stored Page JSON references legacy ids — alias resolution in `PageRenderer` plus a lazy version migration.

### Phase 3 — Design DNA + recipe library
**Files.** new `pipeline/designDna.ts`, `data/recipes.json`, `creativeDirector.ts`, `creativeDirectionLlm.ts`, `paletteDefaults.ts`.
**Changes.** DNA assembled from recipes with verified contrast; LLM narrowed to recipe + signature + narrative.
**Expected result.** Palettes and type are coherent by construction; no more raw-hex generation.

### Phase 4 — Composition planner
**Files.** `planSections.ts` → `pipeline/composePlan.ts`, `creativeDirectionLlm.ts`, new `data/compositionPatterns.ts`.
**Changes.** Beat-based planning; delete `CORE_SECTIONS` back-fill; surface/emphasis rhythm rules; fix `realStats` filler.
**Expected result.** Benchmark metric "distinct beat orders" moves from 2/8 toward 6/8.

### Phase 5 — Scored selection + diversity ledger
**Files.** `pickComponent.ts` → `pipeline/resolveComponents.ts`, new `pipeline/diversityLedger.ts`.

### Phase 6 — Image intelligence
**Files.** `import-restaurant-images.py`, new `scripts/index-images.ts` (one-time vision pass), `catalog.json`, `pickImage.ts`. Plus sourcing cafe/bakery/coffee imagery.

### Phase 7 — Content contracts
**Files.** `writeAllCopy.ts`, `manifest.schema.ts`, new `pipeline/fitCheck.ts`.

### Phase 8 — Validation + Tier 0/1 QA in-pipeline
**Files.** new `pipeline/validatePage.ts`, `pipeline/renderMetrics.ts`, `runPipeline.ts`.

### Phase 9 — Tier 2 visual QA + bounded repair
**Files.** new `pipeline/visualQa.ts`, `pipeline/repairPage.ts`.

### Phase 10 — Multi-page + multi-industry split
**Files.** `schema.prisma`, `page.schema.ts` → `site.schema.ts`, `brief.schema.ts` split, new `verticals/*`.

---

## H. Recommended first phase

**Phase 0.** Reasons:

1. F1 and F2 are outright bugs degrading **100%** of builds — illegible CTAs and silently-substituted fonts — and neither requires an architectural decision.
2. They are the highest visual-impact-per-line-of-code change available: roughly 20 lines of colour maths, one generated `<link>`, and one always-on type-pair resolution.
3. The benchmark is a hard prerequisite for every later phase. Without it, Phases 1–9 are unfalsifiable — you cannot prove that a rewrite of the layout system improved anything.
4. It carries essentially zero regression risk against the 395 existing tests.

Concretely, Phase 0 ships:
- `contrastRatio` / `relLuminance` / `pickReadableInk` / `ensureAccentIsUsable` in `colorResolve.ts` + a test walking every catalog palette.
- Font `<link>` generated from `horecaDesignSystem.json`, with a startup assertion that every catalog face is loaded.
- Deterministic type pair always resolved in `runCreativeDirectorSync`.
- `scripts/benchmark.ts` with the seven launch prompts, a committed baseline, screenshots at three viewports, and thresholds that fail the run.

Everything after that is measurable.
