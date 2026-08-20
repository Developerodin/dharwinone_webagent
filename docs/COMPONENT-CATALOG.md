# Component catalog — craft tracker

Living list of every generated-page section variant. The build LLM **only picks from this catalog**. New geometry = a new React file (Cursor + `npm run design:detect` in `frontend/`).

Legend: **crafted** = distinctive layout · **pass** = cleaned of slop, still a conventional structure · **stale** = templated / nested cards / kickers / numbered chrome

Last updated: 2026-08-19 (evening pass)

---

## How to use this file

1. Before authoring, scan the section row — if 01/02/03 already cover the idea, **reshape** the stale one instead of cloning.
2. After a pass, flip status and one-line the layout.
3. Park new ideas in [Backlog](#backlog--new-ideas) until they ship.

Craft floor (all families):

- No cream/terracotta defaults, no section kickers (`Welcome`, `Our Menu`, `Navigate`).
- No decorative `01 / 02` unless the content is a real sequence.
- No `hover:scale` on photographs.
- One signature per page; headers/footers stay quiet.
- Copy fields stay the existing manifest shapes.
- Contact facts are hairline `dl`s, not Lucide icon tiles.

---

## Status by section

| Section | Variants | 01 | 02 | 03 | Notes |
|---------|----------|----|----|----|--------|
| header | 3 | crafted | crafted | crafted | Wordmark / masthead / overlay hamburger + off-canvas |
| hero | 3 | pass | pass | crafted | 01 full-bleed, left type, no ornament rule; 03 type-led strip / carousel |
| about | 3 | pass | pass | crafted | 03 overlapping slab |
| menu | 3 | pass | pass | crafted | 03 featured first plate |
| gallery | 3 | pass | pass | crafted | 03 film strip |
| services | 3 | pass | pass | crafted | 03 manifesto list, no cards |
| stats | 3 | pass | pass | crafted | sentence-case labels; 03 running numbers |
| testimonials | 3 | pass | pass | crafted | no uppercase role tracking; 03 one oversized quote |
| team | 3 | pass | pass | crafted | 03 lead cook as thesis |
| reservation | 3 | pass | pass | crafted | 01 left thesis, no nested form card; 03 + phone |
| location | 3 | pass | pass | crafted | 03 huge address + hours-as-type over map |
| contact | 2 | pass | pass | — | Form stays. Facts flattened. No cream booking card. No 03 (would clone the form). |
| footer | 3 | pass | pass | crafted | no Navigate kicker; text nav; 03 compact colophon |
| bold extras | 01 clones | pass | aliased | familyKit 03 | Bold 02 still Demo9 01 except new 03s. Header-03 still BoldHeader01. |

Families: `premium` + `elegant` = bespoke files. `minimal` / `rustic` / `vibrant` / `bold-03` = `familyKit`.

---

## Pass log

| Date | What |
|------|------|
| 2026-08-19 | about/menu/gallery-03; strip image hover-scale + decorative numbers; headers rewritten |
| 2026-08-19 | services/stats/testimonials/team/reservation/location/footer-03 |
| 2026-08-19 | Flatten contact/footer chrome: HairlineFacts, drop Navigate/Lucide/cream cards; hours type on location-03; familyKit reservation left-aligned |

---

## Backlog — new ideas

Ship these as real variants when the row is still thin or 01/02 look identical.

| ID | Idea | Section | Status |
|----|------|---------|--------|
| B1 | Hours-as-typography (giant open/close) | location-03 | **shipped** on location-03 (hours join under the address) |
| B2 | Dish photography rail in the menu | menu-04 | Needs assets keyed per item — catalog gap |
| B3 | Contact without Lucide icon tiles | contact-01/02 | **shipped** — hairline `dl` |
| B4 | Footer with no “Navigate” label | footer-01 | **shipped** |
| B5 | Hero with type over a vertical still (premium) | hero | FamilyKit 03 has it; premium 01/02/03 still overlay/split/carousel |
| B6 | Reservation as a standing desk: date + CTA only | reservation | **partial** — familyKit 01 is left thesis + CTA, form stays in contact |
| B7 | Team as a kitchen-pass strip (wide crops) | team | Grid of 3/4 portraits is still the 01/02 default |
| B8 | Testimonials as a press clip (source + date) | testimonials | Only if brief has real press — do not invent |
| B9 | Menu as a single-column wine-list (no prices in a card) | menu | 03 is featured plate; 01/02 still columns |
| B10 | About as a pull-quote + one still (no two-column essay) | about | 03 is overlapping slab; 01/02 still essay |
| B11 | Gallery as a single cinematic still + caption | gallery | 03 is film strip; 01/02 still grids |
| B12 | Stats as one giant number (covers, years, seats) | stats | 03 is a running line; could be one figure if the brief has a hero metric |

Do **not** add: numbered process services, cream/terracotta palettes, Inter/Fraunces, hover-zoom galleries, pill nav, contact-03 that clones the form.

---

## Authoring checklist

- [ ] Layout is not a clone of another suffix in the same section
- [ ] Uses existing copy fields (`headline`/`body`/`sectionTitle`/…)
- [ ] File &lt; 500 lines; JSDoc on new functions
- [ ] Registered in premium/elegant/familyKit + `COMPONENT_VARIANTS` + `SECTION_SPECS`
- [ ] `npm run typecheck` in `frontend/`
- [ ] Optional: `npm run design:detect` in `frontend/`
