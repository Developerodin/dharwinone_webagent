# Cursor review prompt

Paste everything below the line into Cursor.

---

You are reviewing a large change to this repo that introduced **authentication** and **server-side project persistence**. It was written by another AI agent. Your job is to **verify it, challenge it, and give me your own judgment** — not to agree with it.

Read the two design docs first, because they state the intent the code is supposed to implement:
- `docs/AUTH-AND-ONBOARDING-PLAN.md`
- `docs/PROJECT-PERSISTENCE-PLAN.md`

## What changed

**Backend** (`backend/`)
- Prisma 7 + local Postgres (`webagent`), 3 migrations in `prisma/migrations/`
- Auth: `src/auth/*`, `src/routes/auth.ts`, `src/routes/onboarding.ts`, `src/middleware/{requireAuth,errorHandler,idempotency}.ts`
- Projects: `src/projects/*`, `src/routes/{projects,projectPipeline}.ts`
- Assets: `src/assets/*`, `src/storage/*`
- Edit pipeline extracted to `src/pipeline/runEdit.ts` and shared by legacy `/api/edit` and new `/api/projects/:id/edit`
- Startup dependency check: `src/config/preflight.ts`

**Frontend** (`frontend/`)
- Auth: `src/auth/*`, `src/pages/auth/*`, `src/pages/onboarding/*`, `src/components/auth/*`
- API client with single-flight token refresh: `src/lib/apiClient.ts`
- Server project client: `src/lib/projectApi.ts`, `src/lib/projectSync.ts`
- Rewired save path: `src/lib/{projectPersist,confirmBuildFlow,editUploadFlows,applyPageEdit,performPageEdit}.ts`
- `src/lib/projectStorage.ts` demoted from source of truth to a local cache

## The core design claim to test

Projects used to live in `localStorage`. Now the server owns them:
- `ProjectVersion` rows are **immutable**; every build/edit/revert appends one
- `Project.currentVersionId` is the only moving pointer, updated by compare-and-swap
- The client sends **intents** (`{instruction, expectedVersion}`), not documents
- `localStorage` is a read-through cache for instant render and offline open

**Verify this actually holds.** Specifically: find any code path that changes a page but does not append a version. Two such bugs were already found and fixed (image upload in `editUploadFlows.ts`, and `PreviewInspector.persistPage`) — assume there are more and go looking.

## Where I most doubt it — start here

1. **`sentMessageCounts` in `src/lib/projectPersist.ts`.** A module-level `Map<projectId, count>` decides which chat messages have been pushed. Ask: what happens when the messages array *shrinks* (reset chat, switch project, restore an older session)? `messages.slice(alreadySent)` on a shorter array returns `[]` — are messages silently dropped? Is the rollback-on-failure correct under two concurrent saves?

2. **`serverVersion` threading in `src/hooks/useChatFlow.ts`.** This was inserted mechanically next to every `projectId,` in dependency objects. It typechecks, but check the indentation and whether it landed in objects where it is meaningless or, worse, where a *stale* value is now being passed. Trace one real edit end to end and confirm the `expectedVersion` sent is the version actually being edited from.

3. **`openProject` in `src/ChatApp.tsx`** calls `restoreProject(id)`, awaits `hydrateProject(id)`, then calls `restoreProject(id)` again. Does this flash stale content? What happens if hydration fails mid-way — is the user left in a builder with a page that does not match `serverVersion`?

4. **Cache/server divergence.** `projectSync.toStoredProject()` sets `page: null` for projects in the list. If anything reads `project.page` before `hydrateProject` runs, it gets null. Find those readers.

5. **Conflict recovery.** The server returns `409 VERSION_CONFLICT {currentVersion, yourVersion}`. The design doc (§6.1 of the persistence plan) says the client should silently refetch and re-apply, and only show a dialog as a last resort. **The client currently does neither** — it just surfaces the error. Is that acceptable for now, or is it a real two-tab data-loss risk? Recommend the smallest correct fix.

6. **Legacy endpoints.** `/api/edit`, `/api/build`, `/api/upload` still accept a client-supplied page and store nothing. Nothing should call them any more. Verify that, and tell me whether deleting them now is safe or premature.

7. **`/api/upload` still writes to local disk** (`backend/data/images/uploads`) while the new asset pipeline uses S3 presigned uploads. Two storage paths coexist. Is that a real inconsistency, and what is the migration order you would pick?

## Security — verify, do not assume

- Every project query goes through `scope(userId)` in `src/projects/repo.ts`. Find any query that bypasses the repository.
- Another user's project must return **404, not 403** (a 403 confirms the id exists).
- Page writes reject `data:` / `javascript:` URLs and cap at 1 MB (`src/projects/pageGuards.ts`). Try to get past the recursive scanner.
- Access token is in a JS closure, refresh token is an httpOnly `Path=/api/auth` cookie with rotation + reuse detection (`src/auth/sessions.ts`). There is a deliberate **5-second grace window** on rotation — assess whether that is sound.
- `Idempotency-Key` protects expensive routes because the auth layer auto-replays requests after a token refresh. Check the replay is correct on failure paths.

## What has and has not been tested

- Backend: **300 tests pass**, typecheck clean. Every endpoint verified with curl against the live database.
- **The UI was never exercised in a browser** — the agent could not open localhost. The frontend wiring is verified only by typecheck, a successful build, and matching HTTP contracts. Treat every frontend claim as unverified.
- `frontend/src/components/shell/SectionPickerPopover.tsx` is a pre-existing untracked file importing `@/lib/sectionPicker`, which does not exist. It breaks `npm run build` (`tsc -b`). Not caused by this work. Tell me whether to finish or delete it.

## What I want back

1. **Bugs**, ranked by whether they lose user data. For each: the file, the concrete failure scenario, and the smallest fix.
2. **Design calls you disagree with**, with your reasoning. Named candidates: full page snapshots per version instead of diffs; `localStorage` kept as a cache rather than removed; the rotation grace window; version 0 meaning "no document yet".
3. **What you would do next**, in priority order, given the goal is production. Say plainly if you think something here should be ripped out rather than extended.

Do not restate the design docs back to me. Read the code and tell me where it is wrong.
