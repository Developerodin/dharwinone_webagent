# ProwPlus MVP — Edit System Audit

Companion to **[01-OUTPUT-QUALITY-AUDIT.md](./01-OUTPUT-QUALITY-AUDIT.md)** and **[02-FIX-PLAN.md](./02-FIX-PLAN.md)**.
**Question answered:** *why can't users edit sections properly, and what should the edit architecture be?*

---

## 1. How editing works today

```
chat message
  → POST /api/edit                                     (routes/edit.ts:39)
  → checkUnsupportedEdit()   regex refusal list        (checkEditCapability.ts:58)
  → checkThemeEditScope()
  → parseEditOpsFixture()    regex parser first        (parseEditOps.ts:25)
  → parseEditOps()           LLM fallback, sees WHOLE page JSON  (:233)
  → 4 layers of "safety net" op injection              (:318-346, edit.ts:110-136)
  → applyEditOps()           17 op types               (applyEditOps.ts:684)
  → full Page JSON returned, replaces client state
```

Plus a dev-only `PreviewInspector` panel (`frontend/src/components/PreviewInspector.tsx`) offering drag-and-drop image replacement.

The op vocabulary is genuinely broad — 17 ops covering copy, theme, tokens, per-section style, spacing, layout cycling, images, gallery count, menu items, add/remove section. **The vocabulary is not the problem. The interaction model is.**

---

## 2. Why editing feels broken

### E1 🔴 There is no way to select a section

The only ways to target a section are:

1. Naming it in prose and hoping the resolver agrees, or
2. The dev inspector, which only lists sections and replaces images.

There is **no click-a-section-to-edit affordance in the preview**. The user sees a rendered page, wants to change the third block, and must describe it in words. Everything below is downstream of this one missing feature.

The resolver stack built to compensate is enormous:

| File | Lines | Purpose |
|------|-------|---------|
| `resolveEditTarget.ts` | 311 | Section + field resolution |
| `sectionResolve.ts` | 179 | Section-name fuzzy matching |
| `fuzzyMatch.ts` | 182 | Levenshtein / token overlap |
| `parseEditOps.ts` | 349 | Regex + LLM op parsing |
| `parseStyleFixtures.ts` | 268 | Style-language regexes |
| `editIntents.ts`, `checkEditCapability.ts`, `resolveThemeIntent.ts` | ~250 | Intent classification |
| **Total** | **~1,540 lines** | **guessing what the user pointed at** |

`resolveEditTarget.ts:23-44` contains hand-maintained typo aliases (`"suhadeing"`, `"subheding"`, `"headlne"`, `"hedline"`). That is the signature of a system fighting the wrong problem — a click target makes all of it unnecessary.

### E2 🔴 "Different layout" runs out after one press

`applyEditOps.ts:591` cycles `componentId` through `COMPONENT_VARIANTS[family][type]` — length **2** for every section except `header` (3) and `hero` (3, premium/elegant only).

User flow:
- *"change the about section"* → `about-01` → `about-02` ✅
- *"still not right, try another"* → `about-02` → `about-01` ← **back to the one they rejected**

The system has no memory of rejection and nothing new to offer. Phase 3 of the fix plan (parameterised layouts) is the real answer; §4.2 below is the interim.

### E3 🔴 Brand colors are destroyed by a theme switch

`applyEditOps.ts:281` — `applyTheme()` calls `clearThemeStyleState()` then loads family defaults, and **never re-reads `brief.brandColors`**. A user who specified green-and-cream at intake and later tries the Elegant theme loses their brand permanently, with no undo. Detailed in audit §8.1; fix in plan §0.3.

### E4 🔴 No undo, no history

`applyEditOps` returns a whole new `Page`; the client overwrites state (`lib/applyPageEdit.ts`, `projectStorage.ts`). There is no op log, no previous-page stack, no "revert that". Combined with E3 and E5, a single misinterpreted instruction can destroy work with no recovery path.

Every op is already a serialisable `EditOp` — the history is *right there*, just not retained.

### E5 🟠 Silent misfires

When the resolver guesses wrong, the op still applies. `parseEditOps.ts:114-138` maps a bare `body` → `about`, `caption` → `gallery`, `sectionTitle` → `menu` by hardcoded assumption. Ask to "rewrite the body copy" while looking at the reservation block and the *about* section changes instead. The summary says `Rewrote about.body` — correct-looking, wrong section, and the user may not notice until later.

There is no confidence threshold on apply. `resolveEditTarget` computes `confidence` (`:259`) and **the caller ignores it**.

### E6 🟠 Uploads are restricted to 3 sections

`PreviewInspector.tsx:73`:

```ts
if (section.type !== "hero" && section.type !== "about" && section.type !== "gallery") {
  throw new Error("This section does not support media uploads.");
}
```

But pages also render images in `team` (3 slots), `location_map` and `reservation` — precisely the sections showing **stock strangers labelled as this restaurant's chefs** (audit §4). The user can see the problem and cannot fix it.

### E7 🟠 Contradictory capability messages

`checkEditCapability.ts:11` lists `/\bvideo\b/i` as **unsupported**, while `:78` tells users uploads support `mp4/webm/mov` and `SectionMedia` renders video. "Change the hero video" → refusal message for a feature that works.

Similarly `/\breorder\b/i` is refused, yet section order is the single most requested structural edit.

### E8 🟠 The creative seed is dropped on every edit

`cycle_image` (`:532`), `applyTheme` (`:338`) and `buildGalleryAssets` (`:126`) call the image picker **without a seed**, so post-edit images fall back to global default ordering — pulling the page toward the same images every other site uses. The page becomes *more* generic the more the user edits it.

### E9 🟡 Missing ops users will immediately want

| Missing | Notes |
|---------|-------|
| `add_menu_item` | Can rename/reprice/remove, but **cannot add** a dish |
| `reorder_section` | Actively refused by regex |
| `set_hours` | No brief field, no op |
| `set_section_media_layout` | Can't flip image left/right |
| `undo` | See E4 |

### E10 🟡 Four competing safety nets

Op injection happens in `parseEditOps.ts:318`, `:330`, `edit.ts:110`, `:114`, `:125` — five places that can add ops the parser didn't return, plus a fixture parser that pre-empts the LLM entirely (`parseEditOps.ts:240`). Behaviour is hard to predict or test; a change in one layer can be silently overridden by another.

---

## 3. Root cause

> **The edit system is a natural-language *guessing* system where it should be a natural-language ***refinement*** system layered on direct selection.**

Chat is excellent for *"make it warmer, less corporate"*. It is a poor way to say *"this block, third from the top."* The product currently forces chat to do both, which is why ~1,540 lines of resolver code still misfires.

---

## 4. Fix plan

### 4.1 🔴 P0 — Direct section selection (the unlock)

Make sections clickable in `LivePreviewPane`:

1. `PageRenderer.tsx:154` already wraps each section in a keyed `div` with `sectionDomId(section.type)`. Add hover outline + click handler.
2. Clicking sets `selectedSectionIndex` in chat state.
3. The chat composer shows a chip: **`Editing: Menu ▾`** — and every instruction is scoped to that section.
4. Pass `targetSection` in the `/api/edit` body; when present, **skip section resolution entirely** and only resolve the *field*.

```ts
type EditBody = {
  instruction?: string;
  targetSection?: SectionType;   // NEW — from click, bypasses ~1,540 lines of guessing
  targetField?: string;          // NEW — from inline click on a text node
  page?: unknown; brief?: unknown; family?: unknown;
};
```

**Then delete or demote:** the typo alias table, `findLeadingCopyTarget`, most of `sectionResolve.ts`. Keep fuzzy resolution only as the fallback for unscoped instructions.

### 4.2 🔴 P0 — A section action panel

On selection, show contextual controls rather than requiring prose:

```
┌─ Menu section ───────────────────┐
│ Layout      ◀ 2 of 2 ▶           │
│ Background  [base][alt][dark]    │
│ Spacing     [tight][•][roomy]    │
│ Image       [Replace] [Shuffle]  │
│ Move        [▲] [▼]              │
│ [Remove section]                 │
│ ─────────────────────────────    │
│ Or describe a change…            │
└──────────────────────────────────┘
```

Every control maps to an **existing op** — `cycle_section_component`, `set_section_style`, `set_section_spacing`, `cycle_image`, `remove_section`. The backend needs almost nothing new; this is a frontend build over shipped capability. Deterministic controls for deterministic changes; chat for creative ones.

### 4.3 🔴 P0 — Edit history + undo

```ts
type ProjectState = {
  page: Page;
  brief: Brief;
  family: PageFamily;
  direction: CreativeDirection;        // persist the seed (fixes E8)
  history: Array<{ op: EditOp; pageBefore: Page; at: number; summary: string }>;
};
```

Cap at 20 entries in `localStorage`. Surface **Undo** in `EditorTopBar` and after every edit summary in chat. This turns misfires from destructive into annoying — the difference between an unusable and a usable editor.

### 4.4 🟠 P1 — Confidence gate instead of silent apply

`resolveEditTarget` already returns `confidence`. Use it:

```ts
if (!body.targetSection && target.confidence < 0.7) {
  return { ok: true, needsConfirmation: true,
           question: `Did you mean the ${target.section} section?`,
           candidates: [...] };
}
```

Render as quick-reply chips. Asking once beats silently editing the wrong block.

### 4.5 🟠 P1 — Close the capability gaps

| Fix | Where |
|-----|-------|
| Allow uploads for `team`, `location_map`, `reservation` | `PreviewInspector.tsx:73`, `uploadSectionImage.ts` |
| Remove `/\bvideo\b/` from `UNSUPPORTED_PATTERNS` | `checkEditCapability.ts:11` |
| Add `reorder_section` op + arrows in the panel | `editOps.schema.ts`, `applyLayoutOps.ts` |
| Add `add_menu_item` op | `editOps.schema.ts`, `applyEditOps.ts` |
| Restore brand colors in `applyTheme` | `applyEditOps.ts:281` |
| Thread `direction.seed` through all edit image picks | `applyEditOps.ts` (6 call sites) |

### 4.6 🟠 P1 — Collapse the safety nets

One resolution path:

```
targetSection given?  → use it, resolve field only
else regex fixture hit (high confidence)? → use it
else LLM parse → if confidence low, ASK; never silently inject
```

Delete the duplicated injection blocks in `edit.ts:110-136` (they re-implement `parseEditOps.ts:318-346`).

### 4.7 🟡 P2 — Real layout variety in the cycler

After fix-plan Phase 3, `cycle_section_component` becomes **`remix_section`**: re-roll `layoutIntent` × `emphasis` × `background` for that one section, excluding combinations the user already rejected. That is when *"try another layout"* stops looping between two options.

---

## 5. Priority summary

| ID | Issue | Sev | Fix |
|----|-------|-----|-----|
| E1 | No section selection in preview | 🔴 | 4.1 |
| E2 | Layout cycling loops between 2 | 🔴 | 4.2 → 4.7 |
| E3 | Brand colors lost on theme switch | 🔴 | 4.5 |
| E4 | No undo / no history | 🔴 | 4.3 |
| E5 | Silent wrong-section edits | 🟠 | 4.4 |
| E6 | Uploads limited to 3 sections | 🟠 | 4.5 |
| E7 | Contradictory capability messages | 🟠 | 4.5 |
| E8 | Creative seed dropped on edit | 🟠 | 4.5 |
| E9 | Missing add-item / reorder / hours ops | 🟡 | 4.5 |
| E10 | Four competing op-injection layers | 🟡 | 4.6 |

**Highest leverage:** 4.1 + 4.2 + 4.3 together. Direct selection, deterministic controls, and undo convert editing from "argue with a parser and hope" into "point, adjust, revert" — and let ~1,500 lines of resolver code be deleted rather than extended.
