# Current Usage — End-to-End Pipeline Guide

How ProwPlus builds a restaurant page today: agents/stages, theme, components, images, copy fields, models, and where data lives.

**Stack:** Express + Zod + OpenAI (backend) · React + Vite + Tailwind (frontend)  
**Scope:** Restaurant pages only · Themes: `premium` | `elegant`

---

## TL;DR

| Thing | How it works today |
|-------|--------------------|
| “Agents” | **Not multi-agent.** Fixed 8-stage orchestrator. UI labels stages as `role: "agent"`. |
| Model | **`gpt-4o-mini`** (`OPENAI_MODEL` env override) |
| Theme | Keyword score on brief + chat → `premium` (default) or `elegant` |
| Sections | Hardcoded: `hero → about → menu → gallery → location_map` |
| Component | Family + section → random among `*-01` / `*-02` |
| Images | Static `catalog.json` filter (section → family → orientation). No Unsplash API. |
| Persistence | No DB. FE `localStorage`. Images on disk under `backend/data/images/`. |

---

## 1. End-to-end process

```
User dump (ChatApp)
        │
        ▼
POST /api/intake  →  assessBrief()
  • checkScope (restaurant-only)
  • extractBrief (LLM) + verify against source
  • evaluate readiness / gaps
  • optional: generateClarificationQuestions (LLM)
  • inferPageFamily → pageFamily (display/confirm)
        │
        ├─ needs_clarification → answer → re-intake
        ├─ unsupported → stop
        └─ ready → user confirms “Build page”
                │
                ▼
POST /api/build?stream=1  (confirmed: true)
        │
        ▼
runPipeline() — 8 stages (SSE to UI)
  1. Brief Extractor
  2. Section Planner
  3. Component Picker
  4. Copywriter          ← LLM
  5. Fact-Safety         ← regex, 1 LLM retry
  6. Image Picker
  7. Assembler           ← Zod Page JSON
  8. Renderer            ← noop on BE; FE PageRenderer
        │
        ▼
LivePreviewPane / PageRenderer
        │
        └─ edits: POST /api/edit
           uploads: POST /api/upload
```

**Orchestrator:** `backend/src/pipeline/runPipeline.ts` → `runPipeline`  
**Stage names:** `backend/src/pipeline/pipelineStages.ts`  
**FE chat flow:** `frontend/src/hooks/useChatFlow.ts`

### Active API routes

| Endpoint | File | Job |
|----------|------|-----|
| `POST /api/intake` | `backend/src/routes/intake.ts` | Extract brief + clarify |
| `POST /api/build` | `backend/src/routes/build.ts` | Full page gen (+ SSE) |
| `POST /api/edit` | `backend/src/routes/edit.ts` | NL → edit ops |
| `POST /api/upload` | `backend/src/routes/upload.ts` | Local image replace |

---

## 2. “Agents” — what they actually are

There is **no** LangGraph / CrewAI / multi-agent handoff. Stages share data via return values (`Brief` → `Page` → UI).

Frontend `"agent"` messages are **UI stage status labels**, not LLM personas.

| Stage / role | LLM? | File | What it does |
|--------------|------|------|--------------|
| Intake assessor | Yes (extract + questions) | `pipeline/assessBrief.ts` | Scope, gaps, clarify |
| Brief Extractor | Yes | `pipeline/extractBrief.ts` | Structured brief from chat |
| Section Planner | No | `pipeline/planSections.ts` | Fixed section list |
| Component Picker | No | `pipeline/pickComponent.ts` | Random variant per family |
| Copywriter | Yes | `pipeline/writeCopy.ts` | Fill manifest copy fields |
| Fact-Safety | Regex (+ 1 copy retry) | `pipeline/factCheck.ts` | Prices/phones must exist in brief |
| Image Picker | No | `pipeline/pickImage.ts` | Catalog filter |
| Assembler | No | `pipeline/assemblePage.ts` | Zod page JSON |
| Edit parser | Yes | `pipeline/parseEditOps.ts` | NL → ops |
| Copy rewriter | Yes | `pipeline/rewriteCopy.ts` | Free-text field rewrite |

Stages “speak” to the UI via SSE stage events during build (`onStage` callback).

---

## 3. Model in use right now

| Setting | Value |
|---------|--------|
| Default | **`gpt-4o-mini`** |
| Resolver | `getOpenAIModel()` → `process.env.OPENAI_MODEL ?? "gpt-4o-mini"` |
| Client | `backend/src/lib/openai.ts` |
| SDK | `openai` npm — `chat.completions.parse` (structured) / `.create` (rewrite) |
| Env | `backend/.env` / `.env.example` |

**No Claude / Gemini / Anthropic.** OpenAI only.

### Where LLM is called

| Function | File | Purpose |
|----------|------|---------|
| `extractBrief` | `extractBrief.ts` | Facts only; don’t invent name/prices/phone |
| `generateClarificationQuestions` | `assessBrief.ts` | ≤3 short gap questions |
| `writeCopy` | `writeCopy.ts` | Fill only `copyFields` from manifest |
| `parseEditOps` | `parseEditOps.ts` | NL → `set_copy`, `rewrite_copy`, `set_theme`, … |
| `rewriteSectionCopy` | `rewriteCopy.ts` | Rewrite one field text |

**Fixture mode (no LLM):** `USE_FIXTURE_BRIEF=true` or `?fixture=1` → `FIXTURE_BRIEF` + fixture copy/edit parsers.

---

## 4. Theme — how we decide

**Theme = `PageFamily`:** `"premium"` | `"elegant"`

Config: `backend/src/config/pageFamily.ts`

### Decision order at build

```
input.family
  ?? inferPageFamily(brief, chatText)
  ?? getDefaultPageFamily()   // PAGE_FAMILY env or "premium"
```

Build route can also take `?family=premium|elegant`.

**Note:** FE confirm build usually does **not** pass `?family=`. Build **re-infers** from brief + chat. Intake `pageFamily` is mostly for confirm chrome.

### Inference rules (`inferPageFamily`)

File: `backend/src/pipeline/inferPageFamily.ts`

Corpus:

```text
`${brief.category} ${brief.businessName} ${chatText}`.toLowerCase()
```

1. Count **elegant** keyword hits (fine dining, michelin, tasting menu, luxury, steakhouse, …)
2. Count **premium** keyword hits (casual, cafe, pizza, diner, brunch, chinese, …)
3. Choose **elegant** only if:
   - `elegantScore >= 2` **and**
   - `elegantScore >= premiumScore + 2`
4. Else / ties → **`premium`**

### Visual theme (not LLM palettes)

| Family | Tokens | FE components |
|--------|--------|----------------|
| premium | `frontend/src/components/premium/shared/premiumTokens.ts` | `components/premium/**` |
| elegant | `frontend/src/components/elegant/shared/elegantTokens.ts` | `components/elegant/**` |

Render theme comes from **`componentId` prefix** (`elegant-*` vs `premium-*`), not a separate palette picker.

### Change theme after build

- Edit intent: `resolveThemeFamilyIntent` / `inferThemeFromColorLanguage`
- Applied via `set_theme` → remaps componentIds + re-picks images

---

## 5. Structure — which sections, in what order

**Hardcoded archetype `casual_discovery`.** No LLM planning.

File: `backend/src/pipeline/planSections.ts`

```
hero → about → menu → gallery → location_map
```

If a section can’t get a required image, it is **dropped**; remaining keep relative order.

---

## 6. Component picking

File: `backend/src/pipeline/pickComponent.ts` — `pickComponent`, `COMPONENT_VARIANTS`

### Criteria

1. `sectionType` + `family` → list of 2 variants
2. Default: **`Math.random()`** → `*-01` or `*-02`
3. Theme remap: `preferComponentId` keeps the numeric suffix across families

| Family | IDs |
|--------|-----|
| premium | `premium-{hero\|menu\|about\|gallery\|location}-0{1,2}` |
| elegant | `elegant-{hero\|menu\|about\|gallery\|location}-0{1,2}` |

### FE registries (render map)

| Path | Export |
|------|--------|
| `frontend/src/components/premium/registry.ts` | `componentRegistry` |
| `frontend/src/components/elegant/registry.ts` | `elegantRegistry` |
| `frontend/src/components/pageRegistry.ts` | merged `pageComponentRegistry` |

Edit op `cycle_section_component` flips `*-01` ↔ `*-02` within the same family.

---

## 7. Section fields — what the LLM fills vs brief data

Manifests: `backend/src/schemas/manifest.schema.ts` → `COMPONENT_MANIFESTS` / `getManifest`

| Section | Copy fields (LLM) | `requiresImage` | Extra data (not LLM) |
|---------|-------------------|-----------------|----------------------|
| hero | `headline`, `subheading`, `ctaLabel` | **true** | — |
| about | `headline`, `body` | false | — |
| menu | `sectionTitle`, `introText` | false | `items` ← `brief.menuItems` |
| gallery | `headline`, `caption` | **true** | multi image assets |
| location_map | `headline`, `directionsNote` | false | `phone`, `address` ← brief |

**Why those fields?** Each React component expects that content shape. Manifests define:

- which keys the copywriter Zod schema must produce
- whether the section dies without a catalog image

Brief schema (`backend/src/schemas/brief.schema.ts`):

```ts
businessName, category, phone, address, menuItems[{name, price, description}], photos[]
```

`photos` from extract is intentionally empty at extract time; runtime images come from catalog / upload.

---

## 8. Images — selection + storage

File: `backend/src/pipeline/pickImage.ts`

### Selection cascade (`filterCatalogEntries`)

1. Match `section_type`
2. Prefer **family + orientation**
3. Else family, any orientation
4. Else any family + orientation
5. Else any for that section

Then:

- `pickImage` → **first** match path
- `pickGalleryImages(limit=2)` → unique gallery paths for family

### Preferred orientation

| Section | Orientation |
|---------|-------------|
| hero | landscape |
| gallery | landscape |
| about | portrait |
| menu | square |

### Drop rules

- `requiresImage && !imagePath` → drop (hero)
- gallery with 0 paths → drop

### No stock-photo API at runtime

Catalog paths are local `/images/restaurant/...`.

| Path | Role |
|------|------|
| `backend/data/catalog.json` | Metadata: id, path, tags, orientation, section_type, family |
| `backend/data/images/restaurant/{hero,about,gallery,menu}/` | Canonical webp assets |
| `frontend/public/images/restaurant/` | Browser-served copies |
| `backend/data/images/uploads/` | User uploads via `/api/upload` |
| `backend/src/lib/catalog.ts` | `loadCatalog()` |

Express serves: `app.use("/images", express.static(.../data/images))`.

Catalog entry shape:

```json
{
  "id": "premium-hero-01",
  "path": "/images/restaurant/hero/hero-01.webp",
  "tags": ["restaurant", "interior", "hero", "premium"],
  "orientation": "landscape",
  "section_type": "hero",
  "family": "premium"
}
```

---

## 9. Where usage / state / config lives

| Kind | Path |
|------|------|
| Image catalog | `backend/data/catalog.json` |
| Image binaries | `backend/data/images/` |
| Fixture brief | `backend/src/data/fixtureBrief.ts` |
| Brief Zod | `backend/src/schemas/brief.schema.ts` |
| Page Zod | `backend/src/schemas/page.schema.ts` |
| Component manifests | `backend/src/schemas/manifest.schema.ts` |
| Edit ops Zod | `backend/src/schemas/editOps.schema.ts` |
| Family config | `backend/src/config/pageFamily.ts` |
| Prompts | Inline in `extractBrief.ts`, `assessBrief.ts`, `writeCopy.ts`, `parseEditOps.ts`, `rewriteCopy.ts` |
| Env | `backend/.env` (key, model, family, fixture) |
| FE project persist | `frontend/src/lib/projectStorage.ts` (**localStorage**, no DB) |
| Preview store | `frontend/src/lib/previewStorage.ts` |
| Design notes | `.cursor/context/design-system.md` |
| Project map | `.cursor/context/project-map.md` |
| Tracking | `TRACKING.md` |

---

## 10. Decision matrix (cheat sheet)

| Decision | Based on | Mechanism |
|----------|----------|-----------|
| Theme | category + businessName + chat keywords; env/query override; edit intent | `inferPageFamily` / `PAGE_FAMILY` / `?family=` / `set_theme` |
| Sections | Fixed casual_discovery list | `planSections` |
| Component variant | Family + random among 2 layouts | `pickComponent` |
| Copy fields | Manifest for `componentId` | `writeCopy` + Zod |
| Fact safety | Prices / phones / times must appear in brief | `factCheck` + 1 retry |
| Images | Catalog `section_type` + `family` + `orientation` | `pickImage` / `pickGalleryImages` |
| Scope | Restaurant-only; premium/elegant only | `checkScope` / theme edit scope |

---

## 11. Post-build edit ops (current)

NL edits go through `parseEditOps` → apply. Typical ops:

- `set_copy` / `rewrite_copy`
- `set_theme` (premium ↔ elegant; remaps components + images)
- `cycle_section_component` (`*-01` ↔ `*-02`)
- `cycle_image` (next catalog path for section/family)
- Upload replaces a section asset via `/api/upload`

---

## 12. Fixture vs live

| Mode | Trigger |
|------|---------|
| Live LLM | Default when `OPENAI_API_KEY` is set |
| Fixture | `?fixture=1` or `USE_FIXTURE_BRIEF=true` |

---

## 13. Not in current MVP

- Auth, DB / pgvector, billing
- Multi-archetype / LLM section ranking
- Publish / custom domains
- Unsplash/Pexels live fetch
- True multi-agent orchestration

---

## Key source files (quick index)

```
backend/src/pipeline/runPipeline.ts      # orchestrator
backend/src/pipeline/assessBrief.ts      # intake
backend/src/pipeline/extractBrief.ts     # LLM brief
backend/src/pipeline/inferPageFamily.ts  # theme keywords
backend/src/pipeline/planSections.ts     # structure
backend/src/pipeline/pickComponent.ts    # component pick
backend/src/pipeline/writeCopy.ts        # LLM copy
backend/src/pipeline/factCheck.ts        # fact safety
backend/src/pipeline/pickImage.ts        # image pick
backend/src/pipeline/assemblePage.ts     # page JSON
backend/src/schemas/manifest.schema.ts   # fields per component
backend/data/catalog.json                # image catalog
backend/src/lib/openai.ts                # model = gpt-4o-mini
frontend/src/hooks/useChatFlow.ts        # FE flow
frontend/src/components/pageRegistry.ts  # render registry
```
