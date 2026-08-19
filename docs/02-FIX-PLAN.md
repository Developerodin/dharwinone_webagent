# ProwPlus MVP — Fix Plan for Unique, High-Quality Outputs

Companion to **[01-OUTPUT-QUALITY-AUDIT.md](./01-OUTPUT-QUALITY-AUDIT.md)**.
Ordered by **quality gained per unit of work**. Phases 0–2 alone should transform perceived output quality.

---

## The one-paragraph thesis

Today the pipeline **decides with hash functions and writes with a small model against a 7-field brief**. To get unique, good sites we must invert that: **decide with an LLM art-director that emits a structured design spec, then render that spec with parameterised components, and write copy from a single narrative** — and stop fabricating facts. Uniqueness has to move from *"which of 2 hero crops"* to *"what kind of page is this, in what order, at what density, saying what."*

---

## Phase 0 — Stop the bleeding (1–2 days, no architecture change)

These are pure deletions and small fixes. Do them first; they remove the most visible "AI slop" signals.

### 0.1 🔴 Delete all fabricated content

**File:** `backend/src/pipeline/sectionDefaults.ts`

| Function | Action |
|----------|--------|
| `defaultTestimonials` | **Delete.** Only render `testimonials` when `brief.testimonials?.length > 0`. |
| `defaultTeam` | **Delete.** Only render `team` when `brief.team?.length > 0`. |
| `defaultStats` | **Delete the invented metrics.** Replace with facts derivable from the brief: number of menu items, `foundedYear` (asked, not hashed), cuisine count, dietary options. Drop the section if fewer than 3 real stats exist. |
| `defaultServices` | Keep the cue-driven cards, **delete the 4 generic fallbacks** (`Seasonal Cooking`, `Thoughtful Hospitality`, …). Drop the section if fewer than 3 real cues fire. |

Then in `planSections.ts`, gate these sections on **data availability**, not keyword cues:

```ts
if (brief.testimonials?.length >= 2) sections.push("testimonials");
if (brief.team?.length >= 2)         sections.push("team");
if (realStats(brief).length >= 3)    sections.push("stats");
```

> **A shorter honest page beats a longer fabricated one.** This will make some pages 8 sections instead of 13 — that is the correct outcome.

### 0.2 🔴 Remove hardcoded opening hours

Grep and delete every literal like `"Tue - Thu · 6:00 pm to 10:30 pm"` in `frontend/src/components/**`. Render hours only from `brief.hours` (added in Phase 1); render nothing when absent.

```bash
grep -rn --include='*.tsx' -E '(Mon|Tue|Wed|Thu|Fri|Sat|Sun)[ -]' frontend/src/components/
```

### 0.3 🔴 Restore brand colors on theme switch

**File:** `backend/src/pipeline/applyEditOps.ts:281`

```ts
function applyTheme(page: Page, family: PageFamily, brief: Brief): void {
  clearThemeStyleState(page);
  page.themeOverrides = themeOverridesForFamily(family);

  // NEW: client brand always wins over family defaults
  const brand = paletteFromBrandColors(brief.brandColors);
  if (brand) applyCreativePalette(page, brand);
  ...
```

### 0.4 🔴 Cut the artificial delay

**File:** `backend/src/pipeline/stageDelay.ts`

Once copy generation is batched (Phase 2) a real build is ~8–15s, which needs no padding. Immediately: reduce every band to `{min: 300, max: 900}` and set `PIPELINE_STAGE_DELAY=0` in dev. Stream real stage events instead of faking them.

### 0.5 🟠 Keep the creative seed alive through edits

**File:** `backend/src/pipeline/applyEditOps.ts`

Thread `direction.seed` into `ApplyEditOpsResult` and pass it to every `pickImage` / `pickGalleryImages` / `listCatalogImagePaths` call (lines 126, 219, 249, 320, 338, 532, 559). Persist `direction` alongside `page` in project storage.

### 0.6 🟠 Cross-section image dedup

**File:** `backend/src/pipeline/pickImage.ts` — add a `usedPaths: Set<string>` threaded through the build so `hero`, `about`, `location_map`, `team` and `gallery` never repeat a file on one page.

### 0.7 🟡 Housekeeping

- Delete the dead scoring path (`scoreVariant`/`scoreHeaderVariant`) or stop passing `preferComponentId` — pick one selection system (Phase 1 replaces both).
- Remove the duplicate `verifyBriefAgainstSource` call (`runPipeline.ts:380`).
- Rewrite `CURRENT_USAGE.md` — it currently documents a system that no longer exists.

---

## Phase 1 — Give the system something to say (3–5 days)

### 1.1 Expand the Brief schema

**File:** `backend/src/schemas/brief.schema.ts`

```ts
export const briefSchema = z.object({
  // existing
  businessName: z.string().min(1),
  category: z.string().min(1),
  phone: z.string().nullable(),
  address: z.string().nullable(),
  menuItems: z.array(menuItemSchema),
  photos: z.array(z.string()),
  brandColors: z.array(z.string()).nullable(),

  // NEW — positioning (drives copy quality)
  usp: z.string().nullable(),              // "only wood-fired Neapolitan oven in Indiranagar"
  story: z.string().nullable(),            // origin / founder / heritage
  foundedYear: z.number().int().nullable(),
  signatureDishes: z.array(z.string()),    // named, for hero + gallery captions
  audience: z.string().nullable(),         // "date nights", "family Sunday lunch", "office lunch"
  priceBand: z.enum(["budget","mid","premium","fine_dining"]).nullable(),
  vibe: z.array(z.string()),               // ["cosy","loud","rooftop","minimal"]

  // NEW — real facts (kills fabrication)
  hours: z.array(z.object({ days: z.string(), open: z.string(), close: z.string() })),
  neighbourhood: z.string().nullable(),
  awards: z.array(z.string()),
  testimonials: z.array(z.object({ quote: z.string(), name: z.string(), source: z.string().nullable() })),
  team: z.array(z.object({ name: z.string(), role: z.string(), bio: z.string().nullable() })),
  dietary: z.array(z.string()),            // ["veg","vegan","jain","halal","gluten-free"]
  socials: z.object({ instagram: z.string().nullable(), bookingUrl: z.string().nullable() }).nullable(),
});
```

All new fields nullable/empty-default so existing projects keep parsing. Update `extractBrief.ts` to pull them, keeping the "never invent" rule.

### 1.2 Re-aim the intake interview

**Files:** `briefGaps.ts`, `assessBrief.ts`

Replace gap-chasing with **value-ranked questions**. Rank by copy impact, not by schema completeness:

| Priority | Field | Question |
|----------|-------|----------|
| P0 | `businessName`, `category` | (existing, required) |
| **P1** | `usp` | "In one line — what would a regular say makes you different?" |
| **P1** | `signatureDishes` | "Which 2–3 dishes are you known for?" |
| **P1** | `audience` | "Who's usually at your tables — date nights, families, office lunches?" |
| P2 | `story`, `foundedYear` | "How did the place start?" |
| P2 | `hours`, `neighbourhood` | |
| P3 | `phone`, `address`, `brandColors` | (current P1 — demote) |
| P3 | `testimonials`, `team`, `awards` | Offer as optional uploads |

Raise `MAX_CLARIFICATION_ROUNDS` to 3, ask **P1 questions first**, and let the user skip. Two good answers to P1 questions are worth more than every P3 field combined.

### 1.3 Make user photos a first-class build input

- Add an upload step **before** build — the user's photos enter `brief.photos` with a section hint.
- In `pickImage`, prefer `brief.photos` over the catalog for `hero`, `about`, `gallery`.
- Fall back to the catalog per-slot, not all-or-nothing.

This is the single biggest visual-uniqueness win available and needs no new AI.

---

## Phase 2 — A real Creative Director + narrative copy (5–8 days)

This is the core architectural change. **Do 2.1 and 2.2 together — neither works alone.**

### 2.1 Replace the hash Creative Director with an LLM art-director

**File:** `backend/src/pipeline/creativeDirector.ts`

Keep the deterministic palette/type lookup (the HoReCa catalog is good). **Add** an LLM call that emits a structured `DesignDirection`:

```ts
export const designDirectionSchema = z.object({
  // WHAT KIND OF PAGE — the missing dimension
  archetype: z.enum([
    "story_led",        // heritage/family place → about leads, long-form
    "menu_forward",     // the food is the pitch → menu near top, big type
    "visual_immersive", // rooftop/design-led → gallery-as-hero, minimal copy
    "reservation_first",// fine dining → booking above the fold
    "neighbourhood",    // local everyday spot → hours/location/directions prominent
    "quick_service",    // counter/takeaway → menu + order CTA, compact
  ]),

  // ORDER + DENSITY — currently constants
  sectionPlan: z.array(z.object({
    type: sectionTypeSchema,
    emphasis: z.enum(["hero","major","standard","compact"]),
    layoutIntent: z.enum([
      "full_bleed","split_left","split_right","centered",
      "editorial_columns","grid","band","overlap","marquee",
    ]),
    background: z.enum(["base","alt","dark","accent","image"]),
    spacing: z.enum(["tight","normal","roomy"]),
  })),

  // VOICE — currently a 7-word string
  narrative: z.object({
    positioning: z.string(),        // one sentence only this business could say
    proofPoints: z.array(z.string()).max(4),
    voiceRules: z.array(z.string()).max(4),   // "no adjective stacking", "name dishes"
    avoidPhrases: z.array(z.string()),        // "authentic experience","culinary journey"
  }),

  paletteId: z.string(),
  typePairId: z.string(),
  rationale: z.string(),
});
```

Feed it: full brief, chat text, the HoReCa palette/type catalog IDs, and the archetype definitions. Use a **strong model** here — this call runs once per build and determines everything downstream.

**Uniqueness math after this change:**

```
6 archetypes × variable section count/order × 4 emphasis × 9 layout intents
  × 5 backgrounds × 3 spacings × 28 palettes × 17 type pairs
```

More importantly, the variation is now **semantically motivated** — a heritage Udupi mess and a rooftop cocktail bar get structurally different pages, not two coin-flips on the same skeleton.

### 2.2 Two-stage narrative copywriting

**File:** `backend/src/pipeline/writeCopy.ts`

Replace 13 isolated calls with:

**Stage A — one narrative call** (already produced by 2.1's `narrative` block, or a dedicated call) yielding positioning, proof points, voice rules, banned phrases.

**Stage B — batched section copy.** One call that receives the narrative **and the full section plan**, and returns copy for *all* sections at once:

```ts
const allCopy = await writeAllSectionCopy({
  brief, direction,
  sections: planned.map(p => ({
    type: p.sectionType,
    fields: getManifest(p.componentId).copyFields,
    emphasis: ..., layoutIntent: ...,
  })),
});
```

Benefits:
- The model sees the whole page → **no repetition**, real escalation, cross-references ("the *bhatura* from the menu below").
- Copy length adapts to `emphasis` and `layoutIntent` — a `compact` `band` section gets 6 words, an `editorial_columns` about gets 120.
- **1 call instead of 13** → build drops from ~40s to ~10s, and cost roughly halves even on a bigger model.

Add an explicit anti-slop instruction block:

```
Banned: "authentic experience", "culinary journey", "a feast for the senses",
"where tradition meets innovation", "nestled in the heart of", "elevate your dining".
Every headline must contain a concrete noun from the brief (a dish, a place, a year, a technique).
Never state a fact not present in the brief.
```

### 2.3 Split the model by job

**File:** `backend/src/lib/openai.ts`

```ts
export function getModelFor(job: "extract"|"direct"|"copy"|"editops"|"questions"): string {
  switch (job) {
    case "direct":                       // creative direction — hardest call
    case "copy":  return process.env.OPENAI_MODEL_CREATIVE ?? "<strong model>";
    default:      return process.env.OPENAI_MODEL_FAST     ?? "gpt-4o-mini";
  }
}
```

Extraction, question generation and edit-op parsing stay cheap. Only direction + copy — 2 calls per build — use the strong model.

---

## Phase 3 — Parameterised components (5–8 days)

`DesignDirection.layoutIntent` is worthless until components can honour it. Today a component is a fixed JSX blob; it needs to become a small layout engine.

### 3.1 Section props carry layout intent

```ts
export type SectionComponentProps = {
  content: Record<string, unknown>;
  assets: PageAsset[];
  layout: {                                  // NEW
    emphasis: "hero" | "major" | "standard" | "compact";
    intent: "full_bleed" | "split_left" | ... ;
    background: "base" | "alt" | "dark" | "accent" | "image";
    spacing: "tight" | "normal" | "roomy";
  };
};
```

Thread it through `PageRenderer.tsx:166` and store it on `PageSection` in `page.schema.ts`.

### 3.2 Build a `SectionFrame` primitive

One shared wrapper that resolves `layout` → container classes (max-width, grid template, media aspect ratio, padding scale, background band). Each section component then only supplies its *content slots*.

**Result:** one `about` component renders 9 layout intents × 4 emphases × 5 backgrounds = 180 looks, instead of `about-01` and `about-02`.

This also fixes the "5 themes, 3 layout systems" problem — `familyKit` becomes the single engine and families become token bundles, which is what they already are in practice.

### 3.3 Move hardcoded strings into the content contract

Every eyebrow, secondary CTA and fallback sentence becomes a manifest `copyField` written by Stage B:

```ts
{
  sectionType: "hero",
  copyFields: ["eyebrow", "headline", "subheading", "ctaLabel", "secondaryCtaLabel"],
}
```

Fallbacks become neutral (`""` → render nothing), never a fake sentence. This alone removes ~91 identical strings from every generated site.

---

## Phase 4 — Imagery (parallel track)

1. **User photos first** (Phase 1.3) — highest impact.
2. **Expand the catalog** along `mood` (bright/moody/warm/clean), `subject` (dish/room/people/detail/exterior) and `cuisine`. Target 400+ files with real tag depth; current cuisine tags are 2–4 files deep.
3. **Add a live stock provider** (Unsplash/Pexels) behind an interface, queried with `cuisine + mood + subject` from the `DesignDirection`, with local caching. Keep the static catalog as offline fallback.
4. **Per-page dedup** (Phase 0.6) and per-section aspect-ratio awareness driven by `layoutIntent`.

---

## Phase 5 — Quality gates (ongoing, build this early)

You cannot fix "outputs feel same" without measuring sameness.

### 5.1 Variance harness

`backend/scripts/variance-check.ts` — build N=20 diverse fixture briefs, then report:

| Metric | Target |
|--------|--------|
| Distinct section orders | ≥ 8 of 20 |
| Mean pairwise Jaccard similarity of visible page text | **< 0.25** |
| Strings appearing on > 50% of pages | **0** (excluding brand/legal) |
| Distinct (palette, typePair) pairs | ≥ 12 of 20 |
| Image files reused across pages | < 15% |

Run in CI. Any regression that raises text similarity fails the build. *This is the metric that maps directly to the complaint "every site looks the same."*

### 5.2 Slop detector

Regex gate on generated copy for the banned-phrase list; fail the copy stage and retry once, same mechanism as `factCheck`.

### 5.3 Extend fact-safety to pipeline-injected content

`factCheck.ts` currently only inspects LLM output. Extend it to assert the **assembled page** contains no name, quote, hour, or metric absent from the brief. After Phase 0.1 this should pass trivially — keep it as a regression guard.

---

## Sequencing

```
Week 1   Phase 0 (all)        → stop fabrication, cut delay, fix brand colors
Week 1-2 Phase 5.1            → variance harness, get a baseline number
Week 2   Phase 1              → richer brief + better intake + user photos
Week 3-4 Phase 2              → LLM Creative Director + narrative copy   ← biggest win
Week 5-6 Phase 3              → parameterised components
ongoing  Phase 4              → imagery depth
```

**If only one week is available:** Phase 0 + Phase 2.2 (batched narrative copy). Those two changes remove the fabricated blocks and the repetitive filler — roughly half the perceived quality problem — without touching the component layer.

---

## Expected outcome per phase

| After | Structural variety | Copy specificity | Fabrication | Build time |
|-------|-------------------|------------------|-------------|-----------|
| Today | ~8 near-identical | Low | High | 40–60s |
| Phase 0 | ~8 (shorter, honest) | Low | **None** | 8–20s |
| Phase 1 | ~8 | Medium | None | 8–20s |
| Phase 2 | **6 archetypes × variable plans** | **High** | None | **10–15s** |
| Phase 3 | 180+ looks per section | High | None | 10–15s |
