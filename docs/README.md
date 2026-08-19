# ProwPlus MVP — Output Quality Docs

Audit of why generated websites come out basic and repetitive, and the plan to fix it.
Written 2026-08-11 against `main` @ `dc4323a`.

| Doc | What's in it |
|-----|--------------|
| **[01-OUTPUT-QUALITY-AUDIT.md](./01-OUTPUT-QUALITY-AUDIT.md)** | What the system actually does today, the 5 root causes of generic output, the fabricated-content problem, and a 28-item issue register with `file:line` evidence. |
| **[02-FIX-PLAN.md](./02-FIX-PLAN.md)** | Phased remediation: stop fabrication → richer brief → LLM Creative Director + narrative copy → parameterised components → imagery → quality gates. |
| **[03-EDIT-SYSTEM-AUDIT.md](./03-EDIT-SYSTEM-AUDIT.md)** | Why section editing misfires (~1,540 lines of guessing where a click should be), 10 ranked issues, and the direct-selection + undo redesign. |

## Start here

1. **Phase 0** in the fix plan — one to two days, pure deletions and small fixes, removes the most visible AI-slop signals.
2. **Phase 5.1** (variance harness) — get a baseline similarity number before changing generation, so improvement is measurable rather than felt.
3. **Phase 2** — the LLM Creative Director + batched narrative copy. This is the change that makes outputs genuinely differ.

## Note on existing docs

`CURRENT_USAGE.md` and `README.md` at the repo root are stale — they describe 2 families, a 5-section page, `Math.random()` component picking, and no Creative Director. All four are now wrong. Rewriting them is Phase 0.7.
