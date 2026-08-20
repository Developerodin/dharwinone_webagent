# Design skills — Director vs Cursor

ProwPlus does **not** generate CSS from scratch. Skills pay off in two places only.

## Runtime (OpenAI pipeline)

Distilled prompts live in [`backend/src/pipeline/designSkillPrompt.ts`](../backend/src/pipeline/designSkillPrompt.ts).

| Stage | Uses |
|-------|------|
| Creative Director | `DIRECTOR_SKILL` — mode, signature, palette, typePair. Client `brandColors` still win. |
| Copywriter | `COPY_SKILL` — specific nouns, no kickers, CTA names the action. |
| rewriteCopy | `REWRITE_SKILL` — same narrative so edits do not regress to slop. |

Do **not** paste [SKILL.md](../SKILL.md) or Impeccable's 23 commands into `extractBrief` or `parseEditOps`.

## Cursor / catalog (authoring new section variants)

The React catalog is the uniqueness ceiling. When adding or reshaping `premium-*` / `elegant-*` / `familyKit` components:

1. Shape first (one signature, no cream+terracotta, no section kickers).
2. Scan: `npm run design:detect` in `frontend/` (runs `npx impeccable detect src/components` — no backend install).
3. Commands that matter: `typeset`, `layout`, `distill`, `bolder`/`quieter`, `polish`, `clarify`.

Skip `live` / `overdrive` / `animate` unless the variant actually ships that motion.

Repo-root [SKILL.md](../SKILL.md) is Anthropic frontend-design for agents. Impeccable is the detector + command vocabulary — used as-is in Cursor, distilled in the pipeline.
