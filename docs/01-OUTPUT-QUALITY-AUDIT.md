# ProwPlus MVP — Why the Generated Websites Are Basic and Repetitive

**Audit date:** 2026-08-11
**Scope:** Full read of `backend/src/pipeline/**`, `backend/src/schemas/**`, `backend/data/**`, `frontend/src/components/**`, `frontend/src/render/**`
**Question answered:** *Why do our generated sites look generic, samey, and low-quality — and what architecture changes fix it?*

---

## 0. TL;DR — the five root causes

| # | Root cause | Effect the user sees | Severity |
|---|-----------|---------------------|----------|
| **R1** | **The page is a fixed 13-section conveyor belt.** Order never changes, section set barely changes, and each section has only 2 near-identical layouts. | "Every site looks the same." | 🔴 Critical |
| **R2** | **~70–80% of the visible words are hardcoded in React components or fabricated by template code**, not written for the business. | "Too basic, not specific to me." | 🔴 Critical |
| **R3** | **The Brief is 7 thin fields.** No hours, story, USP, signature dishes, audience, or price band. The copywriter has nothing distinctive to say. | Generic marketing filler. | 🔴 Critical |
| **R4** | **Copy is written per-section in isolation by `gpt-4o-mini`, with no shared narrative.** 13 independent calls that restate the same idea. | Repetitive, incoherent, weak copy. | 🔴 Critical |
| **R5** | **113 stock images total, shared across all businesses**, and only 3 real layout systems behind 5 "themes". | Visual sameness across every build. | 🟠 High |

Plus one credibility problem: **the pipeline fabricates testimonials, chef names, guest counts, years in business, and opening hours** (see §4). This is a trust and legal risk, not just a quality one.

---

## 1. What the system actually is

The docs in `CURRENT_USAGE.md` are out of date (they describe 2 families and a 5-section page). The real system today:

```
POST /api/intake  → assessBrief()   → extractBrief (LLM) → gaps → clarification questions (LLM)
POST /api/build   → runPipeline()   → 9 stages
POST /api/edit    → parseEditOps (LLM) → applyEditOps
```

### Build pipeline (`backend/src/pipeline/runPipeline.ts:361`)

| Stage | LLM? | Reality |
|-------|------|---------|
| Brief Extractor | ✅ | `gpt-4o-mini` → 7-field Brief |
| Creative Director | ❌ | **Pure hash function.** No LLM despite the name (`creativeDirector.ts:282`) |
| Section Planner | ❌ | 4 regex cues over a fixed spine (`planSections.ts:36`) |
| Component Picker | ❌ | Hash + keyword scoring, picks between 2 variants |
| Copywriter | ✅ | 13 independent `gpt-4o-mini` calls |
| Fact-Safety | ❌ | Regex check, 1 retry |
| Image Picker | ❌ | Static catalog filter |
| Assembler | ❌ | Zod validation |
| Renderer | ❌ | No-op on backend |

**Only 2 of 9 stages use an LLM, and the one named "Creative Director" is a deterministic hash.** That is the crux: creative decisions are made by `stableHash()`, not by intelligence.

### Families are 3 layout systems wearing 5 names

| Family | Components |
|--------|-----------|
| `premium` | Bespoke — `components/premium/**` |
| `elegant` | Bespoke — `components/elegant/**` |
| `minimal` | **Shared `familyKit`** — `minimal/registry.ts:7` |
| `rustic` | **Shared `familyKit`** — identical components, different color tokens |
| `vibrant` | **Shared `familyKit`** — identical components, different color tokens |

`createFamilyRegistry(family, tokens)` (`familyKit/createFamilyRegistry.tsx:20`) builds minimal, rustic and vibrant from the *exact same React components*. Only the Tailwind token bundle differs. So a "Minimal" site and a "Vibrant" site have identical DOM structure, identical spacing, identical section rhythm — only colors and fonts change.

---

## 2. R1 — The fixed conveyor belt (structural sameness)

### The spine never moves

`planSections.ts:52-67`:

```ts
const sections = ["header", "hero", "about"];
if (servicesCue) sections.push("services");
sections.push("menu");
if (statsCue) sections.push("stats");
sections.push("gallery");
if (socialProofCue || !teamCue) sections.push("testimonials");
if (teamCue) sections.push("team");
sections.push("reservation", "location_map", "contact", "footer");
```

Then `CORE_SECTIONS` back-fills anything missing. Consequences:

- **Order is a constant.** Hero is always second, menu always after about, gallery always after menu, footer always last. There is no archetype where the menu leads, or where the gallery is the hero, or where a one-page reservation flow dominates.
- **`testimonials` fires on `socialProofCue || !teamCue`** — i.e. it appears on essentially every page, whether or not the business has any testimonials.
- Total distinct section-lists ≈ **8**, and they differ only by inserting 1–2 optional blocks into a fixed order.

### Variants are 2 near-identical layouts

`pickComponent.ts:26-50` — every section has exactly 2 variants (`-01`, `-02`); only `header` (all families) and `hero` (premium/elegant only) have 3.

Both variants are full-bleed, full-width, vertically stacked sections with the same vertical rhythm. Compare `familyKit/sections/HeroReservationSections.tsx:44` (hero01, full-bleed image + overlay) with `:108` (hero02, 2-col split). Real variety, yes — but only 2 options, chosen once, then frozen.

### The entropy is in the wrong dimension

For a premium build, `buildSectionVariantHints` (`creativeDirector.ts:195`) seeds 8 sections:

```
header(3) × hero(3) × about(2) × menu(2) × gallery(2) × reservation(2) × contact(2) × footer(2) = 576 combos
```

576 sounds like a lot. It is not, because:

1. The **sequence and proportions never change** — a visitor perceives page *rhythm*, not which of two hero crops was used.
2. The choice is `stableHash(seed) % 2` — a coin flip, not a design decision. Nothing connects "this is a 40-seat Kerala seafood shack" to "therefore the page should lead with the catch of the day."
3. `minimal`/`rustic`/`vibrant` share components, so the effective layout pool is **3 systems × 2 variants**, not 5 × 2.

**This is why every output feels identical.** Uniqueness must live in *structure, order, density and proportion* — currently all four are constants.

---

## 3. R2 — Most of the words are not about the business

### Only ~30 short fields per page are LLM-written

From `manifest.schema.ts:119-212`, the copy fields per section:

| Section | LLM fields |
|---------|-----------|
| header | brandName, tagline, ctaLabel, eyebrow |
| hero | headline, subheading, ctaLabel |
| about | headline, body |
| services | headline, introText |
| menu | sectionTitle, introText |
| stats | headline |
| gallery | headline, caption |
| testimonials | headline, introText |
| team | headline, introText |
| reservation | headline, body, ctaLabel |
| location_map | headline, directionsNote |
| contact | headline, introText, ctaLabel |
| footer | tagline, copyright |

**30 fields, mostly 3–10 words each → roughly 150–250 LLM-written words per page.**

### Everything else is hardcoded in the components

`grep` over `frontend/src/components/**/*.tsx` finds **91 hardcoded English sentences ≥25 chars** and dozens of hardcoded eyebrow labels:

```
"Tue - Thu · 6:00 pm to 10:30 pm"        ×4   ← invented opening hours
"Fri - Sun · 6:00 pm to 11:30 pm"        ×4
"Mon-Sun | 12:00 PM - 10:30 PM"          ×1
"Seasonal plates and neighborhood hospitality"
"Thoughtful pacing, polished floor service, and flexible experiences for lunch, dinner, or private gatherings."
"The neighbourhood adds texture, but the destination is the room itself: warm lighting, strong pours..."
eyebrow: "Welcome" "Our Story" "Premium Collection" "Fine Dining" "Curated Evenings"
         "Restaurant Experience" "Kitchen Favourites" "What Guests Say" "Moments" ...
```

Concrete examples:

- `premium/hero/PremiumHero01.tsx:38` — `<p className={pm.eyebrow}>Welcome</p>` — hardcoded, identical on every premium site.
- `familyKit/.../HeroReservationSections.tsx:80` — `<p className={tokens.eyebrowOnDark}>Restaurant Experience</p>`
- `familyKit/.../HeroReservationSections.tsx:132` — `<p className={tokens.eyebrow}>Curated Evenings</p>`
- `familyKit/.../HeroReservationSections.tsx:152` — a **second CTA button** hardcoded as `View Signature Dishes`, regardless of whether the business has signature dishes.

These strings are visually prominent (eyebrows sit above every headline) and appear on **100% of generated sites**. To a user comparing two ProwPlus sites, the eyebrows alone give the game away.

---

## 4. 🔴 The pipeline fabricates facts about the business

This is the most serious finding. `factCheck.ts` guards *LLM* copy against invented prices/phones — and then the pipeline injects invented facts directly.

`backend/src/pipeline/sectionDefaults.ts`:

### Fake testimonials with fake people (`:171`)

```ts
export function defaultTestimonials(brief: Brief): Testimonial[] {
  const quotes = [
    `${brief.businessName} delivered an unforgettable meal — generous flavor and seamless service.`,
    ...
  ];
  return quotes.map((quote, index) => ({
    quote,
    name: seededName(seed, index * 3),   // ← "Amelia Hayes", "Marcus Nguyen", ...
    role: pickFrom(GUEST_ROLES, seed, index * 5),
  }));
}
```

Three invented guests with invented names give invented praise. Published on a real restaurant's website this is a fabricated review — a consumer-protection exposure in most jurisdictions, and instantly recognisable as AI slop to any visitor.

### Fake chefs (`:189`)

```ts
export function defaultTeam(brief: Brief): TeamMember[] {
  return [0, 1, 2].map((index) => ({
    name: seededName(seed, index * 11 + 2),      // ← invented chef name
    role: pickFrom(CHEF_ROLES, seed, index * 7), // ← "Executive Chef"
    bio: bios[index]!,
  }));
}
```

Paired with `pickImage` reusing the **`about` stock pool for team portraits** (`pickImage.ts:16`), the page shows stock strangers labelled as this restaurant's executive chef.

### Fake business metrics (`:147`)

```ts
const guestBase = 800 + (stableHash(`${seed}:guests`) % 2200);  // "2.3k+ Guests Hosted"
const yearSpan = 5 + (stableHash(`${seed}:years`) % 20);        // "17+ Years of Craft"
```

A restaurant that opened last month gets "17+ Years of Craft".

### Fake opening hours

Hardcoded in components (`"Tue - Thu · 6:00 pm to 10:30 pm"`). The Brief has **no `hours` field at all**, so there is no way for these to ever be correct.

> **These four sources also directly cause the "generic" feeling.** The fabricated blocks are the largest text areas on the page, and they are near-identical across every build.

---

## 5. R3 — The Brief is too thin to produce good copy

`backend/src/schemas/brief.schema.ts:13`:

```ts
businessName, category, phone, address, menuItems[], photos[], brandColors[]
```

That's it. `photos` is documented as *intentionally always empty* at extract time.

The copywriter prompt (`writeCopy.ts:95`) passes `JSON.stringify(brief)` and asks for a headline. With only a name, a cuisine label and a price list, **the best possible output is a well-phrased generic sentence.** No model, at any size, can write distinctive copy from `{"businessName":"Spice Route","category":"Indian restaurant"}`.

### Missing fields that would actually differentiate a page

| Field | Why it matters |
|-------|---------------|
| `hours` | Stops the fabricated hours; enables a real "Visit" block |
| `story` / `founded` | The single highest-value input for an About section |
| `usp` / `whatMakesYouDifferent` | The only field that makes a hero headline non-generic |
| `signatureDishes` | Hero, menu intro, gallery captions all become specific |
| `priceBand` | Drives tone, palette and layout density |
| `audience` (date night / families / office lunch) | Drives archetype selection |
| `neighbourhood` / `landmark` | Local SEO + a real reason to visit |
| `awards` / `press` | Replaces fabricated social proof with real proof |
| `socials` / `bookingUrl` | Working CTAs instead of scroll-to-anchor |
| `dietary` (veg / vegan / halal / jain) | Critical in the Indian market this targets |

### Intake asks the wrong questions

`assessBrief.ts` + `briefGaps.ts` only chase 6 gaps: `businessName, category, menuItems, phone, address, brandColors`. It asks *"What is your phone number?"* — data that improves the footer — and never asks *"What makes your place different?"* — data that improves the entire page. And `MAX_CLARIFICATION_ROUNDS = 2` caps the interview before it gets anywhere interesting.

---

## 6. R4 — Copy generation has no narrative spine

`runPipeline.ts:424-439` loops over planned sections and calls `generateCopy` once per section:

```ts
for (const { sectionType, componentId } of planned) {
  const rawCopy = await generateCopy(sectionType, componentId, brief, useFixture, family);
  ...
}
```

Each call (`writeCopy.ts:62`) sees **only the brief** — never the other sections' copy, never a positioning statement, never a voice guide beyond a one-line `toneForFamily()` string.

Consequences:

1. **Repetition.** Hero says "authentic Italian experience", about says "rooted in tradition and quality ingredients", gallery says "a glimpse into our kitchen", testimonials say "every detail felt intentional". Four sections, one idea, restated.
2. **No escalation.** Good landing pages build an argument. This builds a list.
3. **No cross-references.** The hero can't tease the dish the menu section features, because it doesn't know what the menu section will say.
4. **Sequential latency.** 13 serial LLM calls; nothing is batched or parallelised.
5. **Weak model for the hardest job.** `getOpenAIModel()` defaults to `gpt-4o-mini` (`lib/openai.ts`) for *everything*, including the creative writing that determines perceived quality. Extraction and op-parsing are fine on a small model; copywriting is not.

### Family "voice" is one line

`writeCopy.ts:22-36`:

```ts
case "rustic": return "warm and grounded — hearth, craft, honest hospitality";
```

A 7-word tone hint cannot produce a distinct voice. And since `minimal`/`rustic`/`vibrant` render identical components, the voice string is the *only* thing separating those three families.

---

## 7. R5 — The image layer

`backend/data/catalog.json`: **226 entries but only 113 unique image files**, duplicated once for `premium` and once for `elegant`.

| Family | Section | Orientation | Pool size |
|--------|---------|-------------|-----------|
| premium | hero | landscape | **30** |
| premium | about | portrait | 33 |
| premium | gallery | landscape | 28 |
| premium | menu | square | 20 |
| elegant | (same numbers — same files, retagged) | | |

`catalogFamilyFor()` (`config/pageFamily.ts:39`) maps `minimal`, `rustic`, `vibrant` → the **premium pool**. So three of five themes draw from the same 30 hero shots.

Further problems:

- **`pickImage` returns `matches[0]`** (`pickImage.ts:278`) — the top-ranked entry. Two Italian restaurants in the same family land on adjacent images at best.
- **Cuisine coverage is shallow.** 45 non-generic tags across 113 files; e.g. `indian` appears on 32 entries = 16 unique files. A "Kerala seafood" or "Parsi café" brief scores 0 on every entry and falls back to alphabetical order.
- **No cross-section dedup.** `team`, `location_map` and `about` all pull from the `about` pool (`pickImage.ts:14-18`); the same portrait can appear twice on one page.
- **Uploads are second-class.** `photos` is always empty at build; the user's real photos only enter via post-build `/api/upload`, and `PreviewInspector.tsx:73` restricts uploads to `hero`/`about`/`gallery` only.

**The single highest-leverage image fix is making the user's own photos a first-class build input.** A restaurant's real food photos beat any stock catalog.

---

## 8. Additional issues found

### 8.1 🔴 Brand colors are destroyed on theme switch

`applyEditOps.ts:281`:

```ts
function applyTheme(page: Page, family: PageFamily, brief: Brief): void {
  clearThemeStyleState(page);                          // wipes themeOverrides
  page.themeOverrides = themeOverridesForFamily(family); // family defaults only
```

`brief.brandColors` is never re-read. A user who said "our brand is green and cream", then says "try the elegant theme", permanently loses their brand colors. `assemblePage.ts:14` seeds them at build time; nothing restores them after. A helper that would do it exists unused at `applyStyleOps.ts:172`.

### 8.2 🔴 33–57 seconds of deliberate fake delay per build

`stageDelay.ts` pads every stage to simulate "agent work":

| Stage | Padding (ms) |
|-------|-------------|
| Brief Extractor | 3000–5500 |
| Creative Director | 2500–4500 |
| Section Planner | 3000–5000 |
| Component Picker | 3500–6500 |
| Copywriter | 6000–10000 |
| Image Picker | 5000–8500 |
| Assembler | 6000–10000 |
| Renderer | 4000–7500 |
| **Total artificial** | **33.0 – 57.5 s** |

Stages that do *zero* async work (Section Planner, Component Picker, Assembler, Renderer) sleep 16.5–29s combined. Users wait ~a minute and get a basic page — the delay actively raises expectations that the output then fails to meet.

### 8.3 🟠 The creative seed dies after the first edit

`buildCreativeSeed()` (`creativeDirector.ts:125`) drives image rotation and variant hints at build. But in `applyEditOps.ts`, `cycle_image` (`:532`), `applyTheme` (`:338`) and `buildGalleryAssets` (`:126`) call `pickImage`/`pickGalleryImages` **without a seed**. After any theme switch or image cycle, the page falls back to the global default ordering — pulling it *toward* the same images every other site uses.

### 8.4 🟠 `pickComponent` scoring is dead code for 8 of 13 sections

`runPipeline.ts:314-320` passes `direction.sectionVariantHints[sectionType]` as `preferComponentId`, and `pickComponent.ts:257` short-circuits on that immediately. So the ~200 lines of keyword scoring in `scoreVariant()` / `scoreHeaderVariant()` only run for `services`, `stats`, `testimonials`, `team`, `location_map`. Two competing selection systems, one silently disabled.

### 8.5 🟡 `verifyBriefAgainstSource` runs twice

`assessBrief.ts:236` verifies, returns a `ready` brief; `runPipeline.ts:380` verifies again when `input.brief` is absent. Harmless but indicates the intake/build boundary isn't crystallised.

### 8.6 🟡 Docs are stale

`CURRENT_USAGE.md` states 2 families, 5 sections (`hero → about → menu → gallery → location_map`), `Math.random()` component picking, and "no Creative Director". All four are wrong now. `README.md` claims "95 entries" (actually 226/113).

---

## 9. How much of a generated page is actually about the business?

Rough word-count for a typical premium build:

| Source | Approx. words | Business-specific? |
|--------|--------------|-------------------|
| LLM copy (30 short fields) | 150–250 | ✅ Yes |
| Menu items from brief | 40–120 | ✅ Yes |
| Hardcoded component strings (eyebrows, 2nd CTAs, fallback bodies, hours) | 150–250 | ❌ No — identical every site |
| `defaultServices` (4 cards) | ~60 | ⚠️ Template with name substituted |
| `defaultStats` (4 items) | ~15 | ❌ Fabricated |
| `defaultTestimonials` (3 quotes + names) | ~70 | ❌ Fabricated |
| `defaultTeam` (3 bios + names) | ~55 | ❌ Fabricated |

**≈ 45–55% of the words a visitor reads are either identical across all ProwPlus sites or invented.** That is the measurable form of "the websites are too basic."

---

## 10. Where uniqueness must come from

Uniqueness is currently attempted at the **cheapest, least visible layer** (which of two hero crops) and absent at the **most visible layers**. Ranked by how much a human perceives them:

| Layer | Perceptual weight | Current variability |
|-------|------------------|--------------------|
| **Page structure** — which sections, in what order, at what density | 🔥🔥🔥🔥🔥 | ~8 near-identical lists, fixed order |
| **Copy specificity** — does it say something only this business could say | 🔥🔥🔥🔥🔥 | Low — thin brief, isolated calls |
| **Imagery** — are these this restaurant's photos | 🔥🔥🔥🔥 | 113 shared stock files |
| **Type + color** | 🔥🔥🔥 | Good — 28 palettes, 17 type pairs (HoReCa catalog is the strongest asset in the repo) |
| **Component variant** | 🔥 | 2 per section — where all current effort goes |

The `horecaDesignSystem.json` catalog (28 palettes, 17 type pairs, 90 cuisine buckets) is genuinely strong and under-used. It ships design *tokens* but no design *decisions*: nothing maps a brief to a layout archetype, section density, or media treatment.

---

## 11. Verified issue register

| ID | Issue | File | Sev |
|----|-------|------|-----|
| A1 | Fixed section order; no archetypes | `planSections.ts:52` | 🔴 |
| A2 | Only 2 layout variants per section | `pickComponent.ts:26` | 🔴 |
| A3 | 5 themes = 3 layout systems | `familyKit/createFamilyRegistry.tsx:20` | 🟠 |
| A4 | Creative Director is a hash, not an LLM | `creativeDirector.ts:282` | 🔴 |
| B1 | 91 hardcoded sentences in components | `components/**/*.tsx` | 🔴 |
| B2 | Hardcoded eyebrows on every section | `PremiumHero01.tsx:38` et al | 🔴 |
| B3 | Hardcoded opening hours | `familyKit/**`, `premium/**` | 🔴 |
| C1 | Fabricated testimonials + names | `sectionDefaults.ts:171` | 🔴 |
| C2 | Fabricated chef team | `sectionDefaults.ts:189` | 🔴 |
| C3 | Fabricated guest counts / years | `sectionDefaults.ts:147` | 🔴 |
| C4 | Stock strangers labelled as this restaurant's chefs | `pickImage.ts:16` | 🔴 |
| D1 | Brief has 7 fields, no story/USP/hours | `brief.schema.ts:13` | 🔴 |
| D2 | Intake asks low-value gap questions only | `briefGaps.ts:114` | 🟠 |
| D3 | Clarification capped at 2 rounds | `assessBrief.ts:24` | 🟡 |
| E1 | 13 isolated copy calls, no narrative | `runPipeline.ts:424` | 🔴 |
| E2 | `gpt-4o-mini` used for creative writing | `lib/openai.ts` | 🟠 |
| E3 | Family voice is a 7-word string | `writeCopy.ts:22` | 🟠 |
| F1 | 113 unique images for all businesses | `data/catalog.json` | 🟠 |
| F2 | 3 families share the premium image pool | `config/pageFamily.ts:39` | 🟠 |
| F3 | `pickImage` returns `matches[0]` | `pickImage.ts:278` | 🟠 |
| F4 | No cross-section image dedup | `pickImage.ts:14` | 🟠 |
| F5 | User photos never used at build | `extractBrief.ts:13` | 🟠 |
| G1 | Brand colors lost on theme switch | `applyEditOps.ts:281` | 🔴 |
| G2 | 33–57s artificial delay per build | `stageDelay.ts` | 🔴 |
| G3 | Creative seed dropped in all edit paths | `applyEditOps.ts:532` | 🟠 |
| G4 | `scoreVariant` dead for 8/13 sections | `pickComponent.ts:257` | 🟡 |
| G5 | Double brief verification | `runPipeline.ts:380` | 🟡 |
| G6 | `CURRENT_USAGE.md` / `README.md` stale | docs | 🟡 |

Edit-system issues are catalogued separately in **[03-EDIT-SYSTEM-AUDIT.md](./03-EDIT-SYSTEM-AUDIT.md)**.
The remediation plan is in **[02-FIX-PLAN.md](./02-FIX-PLAN.md)**.
