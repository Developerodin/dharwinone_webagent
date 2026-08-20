# Project Persistence — Production Build Plan

**Status:** steps 1–5 implemented (schema, repository, read/write APIs, asset pipeline) — see §23
**Scope:** server-side projects, versioning, assets, build jobs, publishing
**Companion doc:** [`AUTH-AND-ONBOARDING-PLAN.md`](./AUTH-AND-ONBOARDING-PLAN.md) — this doc assumes `User` exists and every request is authenticated.
**Posture:** production. Not "good enough for a test round." Everything here is built to survive real users, multiple server instances, restarts, concurrent tabs, and data we cannot afford to lose.

---

## 0. What this replaces

Today a project is a blob in the browser's `localStorage`, capped at 30 entries, tied to one device, gone if someone clears their cache. The backend is entirely stateless — the client uploads the whole page JSON on every edit and stores whatever comes back.

That model has to be inverted: **the server becomes the owner of project state, and the client becomes a view of it.** That is the single largest architectural change in this document, and most other decisions follow from it.

---

## 1. Why the current architecture doesn't survive production

| # | Current behaviour | Where | Why it breaks |
|---|---|---|---|
| 1 | Projects live in `localStorage`, capped at 30 | `frontend/src/lib/projectStorage.ts` | One device only. Clear cache → work is gone. No support recovery, no cross-device, no "open it on my laptop" |
| 2 | Client posts the **entire page JSON** on every edit and every image apply | `applyPageEdit.ts` → `POST /api/edit`; `upload.ts` `/apply` | Payload grows with the page; every edit is a full round-trip of the document. Two tabs = silent last-write-wins data loss. The client is the source of truth, so a malicious client can post any page it likes |
| 3 | Backend holds **zero state** | `server.ts` — no DB | Nothing to recover from, nothing to audit, no way to fix a user's project when they email us |
| 4 | Undo history stored client-side, capped at 20, inside the same blob | `projectStorage.ts` `MAX_HISTORY` | History dies with the browser. Blob grows and re-serializes on every keystroke-level save |
| 5 | Uploads written to **local disk**, served via `express.static` | `upload.ts` → `backend/data/images/uploads` | Ephemeral filesystem on every PaaS. Dies on redeploy. Impossible to run two instances. Already **42 MB** of unoptimized multi-MB JPEGs sitting in the repo working tree |
| 6 | Images travel as base64 data URLs through `express.json({ limit: "80mb" })` | `server.ts`, `upload.ts` | +33% bandwidth, whole file buffered in Node memory, one concurrent upload spike can OOM the process |
| 7 | Build is a long LLM pipeline streamed over SSE, result kept only by the client | `routes/build.ts` | Client disconnects → the work (and the OpenAI spend) is lost. No retry, no resume, no record |
| 8 | No idempotency anywhere | all mutating routes | A retried request re-runs the pipeline and double-charges. This collides directly with the auth layer's 401-refresh-and-replay (see auth doc §6.6 / edge case 33) |
| 9 | No ownership concept | everywhere | Any client can pass any `page`; there is nothing to authorize against |
| 10 | No quotas | everywhere | One user can consume unbounded OpenAI spend and unbounded storage |

---

## 2. Target architecture

```
Client (React)
  ├─ holds a *cached copy* of the current page for instant render
  ├─ sends intents, not documents:  { projectId, instruction, expectedVersion }
  └─ reconciles from the server response (authoritative page + new version number)
                                   │
                                   ▼
API  /api/projects/*
  ├─ ownership check on every single query (ownerId is never taken from the body)
  ├─ loads the current ProjectVersion from Postgres
  ├─ runs the pipeline (build / edit / ask)
  ├─ writes a NEW immutable ProjectVersion in a transaction
  └─ returns { page, version }
                                   │
              ┌────────────────────┼─────────────────────┐
              ▼                    ▼                     ▼
        PostgreSQL           Object storage         Job runner
   Project / Version         (S3 or R2 + CDN)      BuildJob rows,
   ChatMessage / Asset       originals +           durable, resumable,
   Publication / Event       derivatives           SSE re-attachable
```

**Core principle:** `ProjectVersion` rows are **immutable**. Nothing is ever updated in place. Every build, every applied edit, every revert appends a new row. `Project.currentVersionId` is the only moving pointer. This gives us undo, redo, audit, rollback, "restore what it looked like yesterday," and safe concurrency — all from one design choice.

---

## 3. Decisions

| Question | Decision | Reasoning |
|---|---|---|
| Page storage format | **JSONB in Postgres**, one document per version | The page is a document rendered atomically. We never query inside sections across projects. Normalizing 13 section types into tables buys nothing and costs every read a join fan-out |
| Version storage | **Full snapshot per version**, not diffs | Page JSON is small (see §5.3). Snapshots make restore O(1) and revert trivially correct. Diff chains are a correctness liability for a 10× storage saving we don't need |
| Where does `page` live | **Only on `ProjectVersion`**, never on `Project` | Keeps the `Project` row narrow so list queries never touch large JSONB. This is the difference between a 40ms and a 900ms dashboard |
| Chat messages | **Separate table**, one row per message | They grow unbounded and change on a different cadence than the page. Keeping them in the project blob means rewriting the whole document on every chat turn |
| Concurrency | **Optimistic, `expectedVersion` → 409 on mismatch** | Pessimistic locks in a chat-driven editor mean a dropped connection can lock a project forever |
| Idempotency | **`Idempotency-Key` header on all mutating routes**, 24h dedupe window | LLM calls cost money and are not repeatable. Retries must be free |
| Assets | **S3 / Cloudflare R2 + CDN, presigned direct upload** | Removes base64 from the wire and the local disk from the architecture. Enables multi-instance deploys |
| Asset dedupe | **Content-addressed by sha256, per owner** | The same hero photo re-uploaded across projects stores once |
| Asset deletion | **Refcounted across versions, never hard-deleted while referenced** | An old version must still render. Deleting an image because the newest version dropped it would silently corrupt history |
| Build jobs | **Durable `BuildJob` row + resumable SSE** | A closed laptop must not destroy a 60-second pipeline run we paid for |
| Deletion | **Soft delete + 30-day trash, then hard purge** | "I deleted the wrong project" is a support ticket we should be able to answer with a single UPDATE |
| Tenancy | **Every query scoped by `ownerId` at the repository layer** | Route-level checks get forgotten. Repository-level scoping cannot be |
| Collaboration | Schema is **collaborator-ready** (`ProjectMember`), UI is owner-only for now | Adding a members table later means migrating every ownership query. Adding it now costs one table and one join |

---

## 4. Data model

`backend/prisma/schema.prisma` (additive to the auth models)

```prisma
enum ProjectStatus   { DRAFT PUBLISHED ARCHIVED }
enum VersionSource   { BUILD EDIT REVERT DUPLICATE IMPORT MANUAL }
enum MemberRole      { OWNER EDITOR VIEWER }
enum AssetKind       { IMAGE VIDEO }
enum JobStatus       { QUEUED RUNNING SUCCEEDED FAILED CANCELLED }

model Project {
  id          String        @id @default(cuid())
  ownerId     String
  name        String                              // resolveBusinessName() logic moves server-side
  slug        String                              // url-safe, unique per owner
  status      ProjectStatus @default(DRAFT)
  pageFamily  String                              // premium | elegant | bold | minimal | rustic | vibrant

  // pointer to the live document — the ONLY mutable reference
  currentVersionId String? @unique
  currentVersion   Int     @default(0)            // monotonic counter, used for optimistic concurrency

  // small, frequently-read fields kept on the row itself
  brief            Json?                          // last confirmed brief
  direction        Json?                          // creative direction
  phase            String  @default("idle")       // ChatPhase
  enrichedChatText String  @default("") @db.Text
  thumbnailAssetId String?                        // rendered preview card image

  createdAt    DateTime  @default(now())
  updatedAt    DateTime  @updatedAt
  lastOpenedAt DateTime?
  deletedAt    DateTime?                          // soft delete
  purgeAfter   DateTime?                          // deletedAt + 30d

  owner     User             @relation(fields: [ownerId], references: [id], onDelete: Cascade)
  versions  ProjectVersion[] @relation("ProjectVersions")
  head      ProjectVersion?  @relation("ProjectHead", fields: [currentVersionId], references: [id])
  messages  ChatMessage[]
  members   ProjectMember[]
  assets    ProjectAsset[]
  jobs      BuildJob[]
  events    ProjectEvent[]
  publications Publication[]

  @@unique([ownerId, slug])
  @@index([ownerId, updatedAt(sort: Desc)])
  @@index([ownerId, status, updatedAt(sort: Desc)])
  @@index([purgeAfter])
}

model ProjectVersion {
  id        String        @id @default(cuid())
  projectId String
  version   Int                                   // 1-based, monotonic per project
  page      Json                                  // the full Page document
  brief     Json?
  direction Json?
  pageFamily String
  source    VersionSource
  summary   String        @db.VarChar(280)        // "Changed hero headline" — shown in history UI
  authorId  String?                               // null = system/pipeline
  parentVersionId String?                         // the version this was derived from
  instruction String?     @db.Text                // the user's edit prompt, for audit + support
  sizeBytes Int
  createdAt DateTime      @default(now())

  project Project         @relation("ProjectVersions", fields: [projectId], references: [id], onDelete: Cascade)
  headOf  Project?        @relation("ProjectHead")

  @@unique([projectId, version])
  @@index([projectId, createdAt(sort: Desc)])
}

model ChatMessage {
  id        String   @id @default(cuid())
  projectId String
  seq       Int                                   // monotonic per project — ordering never depends on timestamps
  role      String                                // user | assistant | agent
  content   String   @db.Text
  payload   Json?                                 // brief | questions | actions | stage* fields
  versionId String?                               // the version this message produced, if any
  createdAt DateTime @default(now())

  project Project @relation(fields: [projectId], references: [id], onDelete: Cascade)

  @@unique([projectId, seq])
  @@index([projectId, seq(sort: Desc)])
}

model ProjectMember {
  id        String     @id @default(cuid())
  projectId String
  userId    String
  role      MemberRole @default(EDITOR)
  createdAt DateTime   @default(now())

  project Project @relation(fields: [projectId], references: [id], onDelete: Cascade)

  @@unique([projectId, userId])
  @@index([userId])
}

model Asset {
  id         String    @id @default(cuid())
  ownerId    String
  sha256     String                               // content address — enables dedupe
  storageKey String    @unique                    // s3://bucket/users/<id>/<sha>.<ext>
  cdnUrl     String
  kind       AssetKind
  mime       String
  bytes      Int
  width      Int?
  height     Int?
  durationMs Int?                                 // video
  blurhash   String?                              // instant placeholder, no layout shift
  derivatives Json?                               // { webp: {...}, avif: {...}, w640: {...} }
  status     String    @default("pending")        // pending | ready | failed  (presign → commit)
  createdAt  DateTime  @default(now())

  owner User           @relation(fields: [ownerId], references: [id], onDelete: Cascade)
  links ProjectAsset[]

  @@unique([ownerId, sha256])
  @@index([ownerId, createdAt(sort: Desc)])
  @@index([status])
}

model ProjectAsset {
  projectId String
  assetId   String
  createdAt DateTime @default(now())

  project Project @relation(fields: [projectId], references: [id], onDelete: Cascade)
  asset   Asset   @relation(fields: [assetId],   references: [id], onDelete: Cascade)

  @@id([projectId, assetId])
  @@index([assetId])
}

model BuildJob {
  id          String    @id @default(cuid())
  projectId   String
  userId      String
  kind        String                              // build | edit | ask
  status      JobStatus @default(QUEUED)
  input       Json                                // brief / instruction / family
  idempotencyKey String? @unique
  stages      Json?                               // running stage log — what SSE replays on reconnect
  resultVersionId String?
  error       String?   @db.Text
  tokensIn    Int?
  tokensOut   Int?
  costCents   Int?
  startedAt   DateTime?
  finishedAt  DateTime?
  createdAt   DateTime  @default(now())

  project Project @relation(fields: [projectId], references: [id], onDelete: Cascade)

  @@index([projectId, createdAt(sort: Desc)])
  @@index([userId, createdAt(sort: Desc)])
  @@index([status])
}

model Publication {
  id         String   @id @default(cuid())
  projectId  String
  versionId  String                               // exactly which snapshot is live
  status     String   @default("live")            // live | rolled_back
  url        String
  publishedBy String?
  publishedAt DateTime @default(now())

  project Project @relation(fields: [projectId], references: [id], onDelete: Cascade)

  @@index([projectId, publishedAt(sort: Desc)])
}

model ProjectEvent {
  id        String   @id @default(cuid())
  projectId String
  userId    String?
  type      String                                // created | renamed | edited | reverted | published | deleted | restored
  meta      Json?
  createdAt DateTime @default(now())

  project Project @relation(fields: [projectId], references: [id], onDelete: Cascade)

  @@index([projectId, createdAt(sort: Desc)])
}

model IdempotencyRecord {
  key         String   @id
  userId      String
  route       String
  requestHash String                              // sha256 of the body — same key + different body = 422
  status      Int
  response    Json
  createdAt   DateTime @default(now())

  @@index([createdAt])                            // TTL sweep at 24h
}
```

### 4.1 Why `Project` carries `brief`/`direction` when versions also do
The row-level copies are the **current** values, read on every project open and on the dashboard. The version copies are the **historical** values, needed for correct reverts. Duplicating two small JSON blobs is worth avoiding a join on the hottest read path. They are written in the same transaction, so they cannot drift.

---

## 5. Versioning

### 5.1 What creates a version
| Action | New version? | Source |
|---|---|---|
| Build completes | ✅ | `BUILD` |
| Edit op applied | ✅ | `EDIT` |
| Image applied to a section | ✅ | `EDIT` |
| Revert to version N | ✅ (a new version whose content equals N) | `REVERT` |
| Duplicate project | ✅ (version 1 of the new project) | `DUPLICATE` |
| Chat message sent | ❌ | — |
| Rename / family switch without re-render | ❌ | — |

**Revert never deletes.** Reverting to v4 from v9 creates v10 with v4's content and `parentVersionId = v4`. History stays linear and append-only, so redo is just "revert to v9." This is the behaviour users expect from an editor and it's impossible to get wrong.

### 5.2 The write transaction (get this exactly right)
```ts
await prisma.$transaction(async (tx) => {
  // 1. lock + re-read under the transaction
  const project = await tx.project.findFirst({
    where: { id, deletedAt: null, OR: [{ ownerId: userId }, { members: { some: { userId } } }] },
  });
  if (!project) throw new NotFound();

  // 2. optimistic concurrency
  if (expectedVersion !== undefined && expectedVersion !== project.currentVersion) {
    throw new Conflict({ code: "VERSION_CONFLICT", currentVersion: project.currentVersion });
  }

  const nextVersion = project.currentVersion + 1;

  // 3. append the immutable snapshot
  const created = await tx.projectVersion.create({
    data: { projectId: id, version: nextVersion, page, brief, direction,
            pageFamily, source, summary, instruction, authorId: userId,
            parentVersionId: project.currentVersionId, sizeBytes: byteLength(page) },
  });

  // 4. move the pointer — guarded by the version we read, so a concurrent
  //    writer that slipped in updates 0 rows and we retry
  const moved = await tx.project.updateMany({
    where: { id, currentVersion: project.currentVersion },
    data: { currentVersionId: created.id, currentVersion: nextVersion,
            brief, direction, pageFamily, updatedAt: new Date() },
  });
  if (moved.count === 0) throw new Conflict({ code: "VERSION_CONFLICT" });

  // 5. link assets referenced by this page (idempotent upsert)
  await linkAssets(tx, id, extractAssetPaths(page));

  await tx.projectEvent.create({ data: { projectId: id, userId, type: "edited",
                                          meta: { version: nextVersion, source } } });
  return created;
});
```
The `updateMany ... where currentVersion = <what we read>` is the compare-and-swap. The unique constraint on `(projectId, version)` is the backstop: two concurrent writers cannot both create version 8.

### 5.3 Size and retention
Assets are stored as **paths** (`{ key, imagePath }`), not embedded binaries, so a page document is text plus layout metadata. Expect **20–80 KB** typical, with a **1 MB hard cap enforced at write time**.

> **Hard rule: reject any page containing a `data:` URL.** Validate on every write. One accidental base64 hero turns a 40 KB document into a 4 MB row that is then copied into every subsequent version. This is the single most likely way to blow up this table.

Retention per project:
- Keep **every version from the last 30 days**.
- Beyond 30 days, keep the last version of each day plus every `BUILD` and `PUBLISH`-referenced version.
- Never delete a version referenced by a `Publication`.
- Hard cap 500 versions per project; prune oldest non-milestone first.
- A nightly job does the pruning and writes what it removed to `ProjectEvent`.

Postgres TOAST-compresses large JSONB automatically, so a 60 KB document costs meaningfully less than 60 KB on disk. Do not hand-roll compression before measuring.

---

## 6. Concurrency and idempotency

### 6.1 Version conflicts
Every mutating request sends `expectedVersion`. On mismatch the server returns:
```json
409 { "ok": false, "error": { "code": "VERSION_CONFLICT",
      "currentVersion": 12, "yourVersion": 10 } }
```
Client behaviour, in order of preference:
1. If the local copy has **no unsaved user intent**, silently refetch the head version and re-render. The user sees their other tab's change appear. No dialog.
2. If the user has an in-flight instruction, re-issue it against the new head (the edit pipeline is instruction-based, so it re-applies cleanly).
3. Only if both fail, surface: *"This project was changed in another tab. Reload to continue."*

Most conflicts should resolve invisibly. A dialog is a failure of this design, not a feature of it.

### 6.2 Cross-tab coherence
- `BroadcastChannel("project")` publishes `{ projectId, version }` after every successful write; other tabs holding an older version refetch.
- On `visibilitychange → visible`, revalidate the head version before accepting any user input.

### 6.3 Idempotency
Required on `POST /build`, `POST /edit`, `POST /publish`, `POST /assets/commit`, `POST /projects`.
```
Idempotency-Key: <uuid v4, generated per user intent, reused across retries>

server:
  hit + same requestHash   → replay the stored response, run nothing
  hit + different body     → 422 IDEMPOTENCY_KEY_REUSED
  miss                     → reserve the key, execute, store the response
  in-flight (reserved, no response yet) → 409 REQUEST_IN_FLIGHT, client backs off
```
This is what makes the auth layer's automatic 401-refresh-and-replay safe. Without it, a token expiring mid-build silently pays OpenAI twice and appends two versions.

---

## 7. Assets

### 7.1 Upload flow (replaces base64-through-JSON entirely)
```
1. POST /api/assets/presign  { filename, mime, bytes, sha256 }
     • validate mime allowlist + size cap + user storage quota
     • if an Asset with (ownerId, sha256) already exists and is ready:
         → return { deduped: true, asset }   ← zero bytes transferred
     • else create Asset(status: "pending") and return a presigned PUT (5 min TTL)

2. Browser PUTs the raw file directly to S3/R2 — never touches our Node process

3. POST /api/assets/commit  { assetId }
     • HEAD the object: confirm it exists, size matches, content-type matches
     • probe dimensions / duration
     • enqueue derivative generation (webp + avif, widths 480/960/1600/2400)
     • compute blurhash
     • status: "ready"

4. POST /api/projects/:id/sections/:section/asset  { assetId, assetKey, expectedVersion }
     • server mutates the page server-side and appends a version
```

**This deletes the worst line in the codebase:** `express.json({ limit: "80mb" })`. Once assets bypass JSON, the global body limit drops to **1 MB** and the OOM risk goes with it.

### 7.2 Serving
- All asset URLs are CDN URLs (CloudFront / R2 public bucket / Cloudflare in front).
- Immutable content-addressed keys → `Cache-Control: public, max-age=31536000, immutable`.
- Serve AVIF → WebP → original via `<picture>`; use the responsive widths in `srcset`.
- Store `blurhash` and render it as the placeholder, so hero images never cause layout shift.
- **The existing 42 MB of unoptimized multi-MB JPEGs in `backend/data/images/uploads` must be migrated into object storage and run through the derivative pipeline** as part of this work — a 3.1 MB JPEG hero is a failed LCP budget on mobile no matter how fast the rest of the stack is.

### 7.3 Lifecycle and garbage collection
- `ProjectAsset` links are created for every asset referenced by **any** version of a project, not just the head.
- Deleting a project soft-deletes it; links survive.
- A nightly GC deletes objects only when: no `ProjectAsset` link exists **and** the asset is older than 24h **and** it is not `pending`. The age check protects assets uploaded but not yet placed.
- Purging a project after its 30-day trash window decrements links; assets that fall to zero links are queued for deletion, not deleted inline.

### 7.4 Security
- MIME allowlist enforced server-side from magic bytes after upload, not from the client's declared `Content-Type`.
- Strip EXIF (GPS coordinates in a restaurant owner's phone photo is a real privacy leak).
- Serve user assets from a **separate origin** to the app, so a malicious SVG cannot execute in our origin. Better: don't accept SVG at all.
- Presigned URLs are single-key, 5-minute, PUT-only, with an enforced `content-length-range`.

---

## 8. Build jobs

The build pipeline is a multi-stage LLM run streamed over SSE. In production it must be durable.

```
POST /api/projects/:id/build   { brief, family, Idempotency-Key }
  → create BuildJob(QUEUED) → return { jobId } immediately (202)
  → client opens GET /api/jobs/:jobId/stream (SSE)

Worker (in-process for now, extractable to a queue later):
  → status RUNNING, append each stage to job.stages as it completes
  → on success: write the ProjectVersion in the §5.2 transaction,
                set resultVersionId, status SUCCEEDED
  → on failure: status FAILED + error, NO version written

SSE stream:
  → on connect, first replay every stage already in job.stages,
    then attach to the live feed
  → client disconnects and reconnects → it catches up, nothing lost
  → client never reconnects → the version is still written. The work is not lost.
```

Why this matters: a build costs real OpenAI tokens and takes tens of seconds. Today, closing the tab throws away both the money and the result. Persisting the job also gives us per-user cost accounting (`tokensIn`/`tokensOut`/`costCents`), which is what §13's quotas are enforced against.

Keep the worker in-process initially — a `BuildJob` row plus an in-memory dispatcher. The schema is queue-ready, so moving to BullMQ/SQS later is a swap of the dispatcher, not a migration.

---

## 9. API surface

All routes require a bearer token. **Ownership is resolved from the token, never from the body.**

### Projects
| Method | Path | Notes |
|---|---|---|
| GET | `/api/projects` | cursor paginated, `?status=&q=&limit=24&cursor=`. **Summary fields only — never selects `page`** |
| POST | `/api/projects` | `{ name?, family? }` → empty draft. Idempotent |
| GET | `/api/projects/:id` | `?include=page,messages,versions` — nothing heavy by default |
| PATCH | `/api/projects/:id` | rename, family, slug |
| DELETE | `/api/projects/:id` | soft delete → trash |
| POST | `/api/projects/:id/restore` | out of trash |
| POST | `/api/projects/:id/duplicate` | copies head version as v1, relinks assets |
| POST | `/api/projects/:id/open` | touches `lastOpenedAt` (fire-and-forget) |

### Content
| Method | Path | Notes |
|---|---|---|
| POST | `/api/projects/:id/build` | 202 + `jobId`; SSE via `/api/jobs/:jobId/stream` |
| POST | `/api/projects/:id/edit` | `{ instruction, targetSection?, targetField?, expectedVersion }` → new page + version |
| POST | `/api/projects/:id/ask` | read-only Q&A, no version |
| GET | `/api/projects/:id/versions` | paginated list, metadata only |
| GET | `/api/projects/:id/versions/:v` | full snapshot. Immutable → `Cache-Control: private, max-age=31536000, immutable` |
| POST | `/api/projects/:id/revert` | `{ toVersion, expectedVersion }` |
| GET | `/api/projects/:id/messages` | `?before=<seq>&limit=50`, newest-first |
| POST | `/api/projects/:id/messages` | append; server assigns `seq` |

### Assets
| Method | Path |
|---|---|
| POST | `/api/assets/presign` |
| POST | `/api/assets/commit` |
| GET | `/api/assets` (owner's library, cursor paginated) |
| DELETE | `/api/assets/:id` (unlink + queue GC) |
| POST | `/api/projects/:id/sections/:section/asset` |

### Publishing
| Method | Path |
|---|---|
| POST | `/api/projects/:id/publish` → snapshot the head version, render, upload, return the live URL |
| POST | `/api/projects/:id/unpublish` |
| GET | `/api/projects/:id/publications` |
| POST | `/api/projects/:id/publish/rollback` `{ toPublicationId }` |

### Response envelope
```json
{ "ok": true, "data": { ... }, "meta": { "version": 12, "nextCursor": "..." } }
{ "ok": false, "error": { "code": "VERSION_CONFLICT", "message": "...", "details": {...} } }
```
Error codes: `PROJECT_NOT_FOUND` `FORBIDDEN` `VERSION_CONFLICT` `PAGE_TOO_LARGE` `DATA_URL_REJECTED` `QUOTA_EXCEEDED` `ASSET_NOT_READY` `IDEMPOTENCY_KEY_REUSED` `REQUEST_IN_FLIGHT` `JOB_FAILED` `INVALID_PAGE`.

---

## 10. The server-authoritative edit refactor

This is the change that touches the most existing code, so it gets its own section.

**Today**
```
client → POST /api/edit { instruction, page, brief, family, direction }
server → parse ops → applyEditOps(page) → returns { page }
client → saveProject(localStorage)
```

**Target**
```
client → POST /api/projects/:id/edit { instruction, targetSection?, expectedVersion }
server → load head version from DB
       → parse ops → applyEditOps(page)
       → validate (schema, size cap, no data: URLs)
       → append version (transaction §5.2)
       → return { page, version, summary }
client → replace local cache, update version pointer
```

**What actually changes in the code**
- `backend/src/routes/edit.ts` — the route stops trusting `req.body.page` and loads it from `ProjectVersion` instead. **The entire pipeline underneath is untouched.** `applyEditOps`, `parseEditOps`, `resolveEditTarget`, `checkScope` and their tests all keep working on a `Page` object; only its provenance changes. This refactor is smaller than it looks.
- `backend/src/routes/build.ts` — wrapped in a `BuildJob`, writes a version on completion.
- `backend/src/routes/upload.ts` — `/apply` no longer takes a page; it takes `assetId` + `projectId`.
- `frontend/src/lib/applyPageEdit.ts` — stops sending `page`, starts sending `projectId` + `expectedVersion`.
- `frontend/src/lib/projectPersist.ts` — becomes a thin server-sync layer; `resolveBusinessName` moves server-side so the dashboard name matches everywhere.
- `frontend/src/lib/projectStorage.ts` — demoted from source of truth to an **offline cache** (see §15.3), same function signatures so `ChatApp.tsx` and `useChatFlow.ts` barely change.

**Payload impact:** an edit request drops from "the whole document" to a few hundred bytes. On a slow connection, that alone is the difference between an edit feeling instant and feeling broken.

**Server-side validation we get for free:** the page can no longer be whatever the client says it is. Every write is schema-validated against `pageSchema` before it's stored.

---

## 11. Publishing

The point of the product is a live website, so the persistence model has to reach that far.

```
POST /api/projects/:id/publish
  1. resolve head ProjectVersion  (publish a version, never "the current state")
  2. server-render the page to static HTML + CSS (reuse the existing PageRenderer via SSR)
  3. inline critical CSS, rewrite asset URLs to CDN, emit sitemap.xml + robots.txt + OG tags
  4. upload the bundle to  sites/<projectSlug>/<versionId>/
  5. flip the routing pointer for the hostname to that prefix   ← atomic
  6. purge the CDN cache for the hostname
  7. write Publication { versionId, url }
```

- Publishing a **version id**, not a mutable pointer, makes rollback a pointer flip back to a previous `Publication`. No rebuild, near-instant.
- The published site is static files on a CDN — it does not touch the API, so builder downtime never takes customer sites down. That property is worth designing around from the start.
- Custom domains (`Domain` table: hostname, projectId, verification token, TXT-verified, cert status) can come later, but the hostname→prefix indirection in step 5 must exist now or retrofitting it means re-publishing every site.
- Keep every published version's bundle until it is superseded twice, so rollback always has somewhere to land.

---

## 12. Performance

### 12.1 Budgets
| Operation | Target (p95) |
|---|---|
| `GET /api/projects` (24 items) | < 60ms |
| `GET /api/projects/:id?include=page` | < 80ms |
| `POST .../edit` (excluding LLM) | < 120ms |
| Version write transaction | < 40ms |
| Dashboard first paint | < 1.0s |
| Project open → rendered preview | < 700ms |

### 12.2 The rules that keep those numbers
1. **Never `SELECT *` on `Project` joined to `ProjectVersion`.** The list endpoint selects an explicit column set — no `page`, no `brief`. Enforce with a shared `projectSummarySelect` object; make it the only way the repository exposes lists.
2. **Cursor pagination**, keyset on `(updatedAt, id)`. `OFFSET` degrades linearly and users with 200 projects will find it.
3. **Partial indexes** for the hot path:
   ```sql
   CREATE INDEX project_owner_recent ON "Project" ("ownerId", "updatedAt" DESC)
     WHERE "deletedAt" IS NULL;
   ```
4. **Immutable version caching.** `GET /versions/:v` can be cached forever by the browser — history browsing costs one request per version, ever.
5. **Denormalize the dashboard card.** `name`, `thumbnailAssetId`, `pageFamily`, `updatedAt`, `status` all live on `Project`. Rendering the dashboard must not read a single version row.
6. **Pooled connections** (PgBouncer / Neon pooler). With `tsx watch` in dev, use a global Prisma singleton or hot-reload will exhaust the pool in minutes.
7. **Thumbnail generation is async.** Never block a build response on rendering a preview card.
8. **Prefetch the head version** when a dashboard card enters the viewport — opening a project should feel like it was already open.
9. **Compress responses** (`compression` middleware); a 60 KB page JSON gzips to roughly 8 KB.
10. **Trim what you send.** `GET /projects/:id` without `include=messages` should not fetch 400 chat rows.

### 12.3 Watch items
- JSONB columns near 1 MB start to hurt on update-heavy tables. We only ever `INSERT` versions, never `UPDATE` them, which sidesteps the worst of it — but this is exactly why the "no `data:` URLs" rule is non-negotiable.
- `ChatMessage` grows fastest. Paginate it from day one; never load a full history to render the last 20 turns.

---

## 13. Quotas, cost control, abuse

Auth makes per-user accounting possible for the first time. Use it.

| Limit | Default | Enforced at |
|---|---|---|
| Projects per user | 50 | `POST /projects` |
| Versions per project | 500 (prune non-milestones) | version write |
| Page document size | 1 MB | version write |
| Storage per user | 2 GB | `/assets/presign` |
| Single asset | 25 MB image / 50 MB video | presign |
| Builds per user per day | 30 | build route + `BuildJob` count |
| Edits per user per hour | 120 | edit route |
| Concurrent builds per user | 2 | job dispatcher |
| Chat messages per project | 2000 | message append |

- Quota rejections return `QUOTA_EXCEEDED` with `{ limit, used, resetsAt }` so the UI can say something specific rather than "something went wrong."
- Track `costCents` per `BuildJob`. A daily aggregate per user is the earliest warning that something is being abused, and it's the input to pricing later.
- Rate limits belong in the same shared limiter introduced by the auth work — one implementation, keyed by `userId` here rather than by IP.

---

## 14. Security and tenancy

1. **Every repository function takes `userId` and scopes on it.** No route may call Prisma directly. This is the one rule that prevents the entire class of "user A opens user B's project" bugs.
   ```ts
   // projects.repo.ts — the ONLY entry point to the Project table
   function scope(userId: string) {
     return { deletedAt: null, OR: [{ ownerId: userId },
                                    { members: { some: { userId } } }] };
   }
   ```
2. **IDs are cuids, not sequential integers** — no enumeration, and a leaked URL doesn't imply a guessable neighbour.
3. **Validate every stored page against `pageSchema`** on write. The client is no longer trusted to produce well-formed documents.
4. **Reject `data:`, `javascript:`, and off-origin `imagePath` values** at write time. Asset paths must resolve to an `Asset` the user owns.
5. **Sanitize copy fields.** Page content is rendered into published HTML — treat every string as untrusted and escape at render. A stored-XSS in a published restaurant site is our liability, not the user's.
6. **Audit trail.** `ProjectEvent` records who did what. When a user says "my site changed and I didn't do it," we need an answer.
7. **Soft delete means data is still there** — include it in the deletion path for GDPR requests, and purge for real on account deletion (cascades are already declared).
8. **Signed URLs for private assets**, public CDN only for published sites.
9. **Never log page content or briefs** (they contain customer business data). Log ids and sizes.

---

## 15. Migration from localStorage

### 15.1 One-time claim on first login
```
On login/signup, if localStorage `prowplus-projects` is non-empty and unclaimed:
  POST /api/projects/import  { projects: StoredProject[], Idempotency-Key }
    • per project: create Project + version 1 from `page`, replay `messages`
      into ChatMessage rows with assigned seq, map `history` entries into
      earlier ProjectVersion rows (oldest first) so undo history survives
    • rewrite any /images/uploads/* path: locate or ingest the file into
      object storage, create the Asset, point the page at the CDN URL
    • cap: 30 projects, 5 MB per project, reject anything else with a report
  → mark claimed; keep the localStorage copy for 7 days as a safety net, then clear
```
Do not silently drop what won't import — return a per-project result and tell the user which ones needed attention.

### 15.2 Existing on-disk uploads
The 42 MB already in `backend/data/images/uploads` needs a one-off script: hash each file, upload to object storage, create `Asset` rows, generate derivatives, and build a `{ oldPath: cdnUrl }` map used by the import above. Run it before the first import, keep the local directory read-only afterward as a fallback, and delete it a release later.

### 15.3 Rollout without a flag day
1. **Ship reads first.** Server-side projects exist; the client reads from the server but keeps writing to localStorage as a mirror.
2. **Dual-write.** Every mutation goes to the server; localStorage becomes a write-through cache used only for offline render.
3. **Cut over.** localStorage is demoted to a read-only cache; the server is authoritative. `projectStorage.ts` keeps its exported function names so `ChatApp.tsx` and `useChatFlow.ts` need minimal edits.
4. **Remove the mirror** once a release has passed with no fallback hits (instrument it — count how often the cache is read because the server failed).

This ordering means no release exists where a user's work can be lost in the gap.

---

## 16. Backups and durability

- **Managed Postgres with PITR** (Neon / RDS / Supabase). Point-in-time recovery, not just nightly dumps — a bad migration at 14:00 needs a 13:59 restore, not last midnight.
- **Nightly logical dump** to object storage, 30-day retention, in a *different* account or region.
- **Restore drill before launch.** A backup that has never been restored is not a backup. Time it and write down the number.
- **Object storage versioning enabled** on the asset bucket, with a lifecycle rule expiring non-current versions after 30 days.
- **Migrations:** expand → backfill → contract. Never a destructive migration in a single deploy. Every migration reviewed for lock duration — an `ALTER TABLE` that rewrites a large table will take the site down.
- **Deletes are soft by default.** The only hard delete is the purge job, and it runs against `purgeAfter < now()` with a dry-run mode.

---

## 17. Observability

| Signal | Why |
|---|---|
| p50/p95/p99 per route | catches the JSONB-in-list-query regression before users do |
| Version writes/min, conflict rate | a rising 409 rate means the client reconciliation in §6.1 is wrong |
| Build job duration, success rate, cost per job | LLM spend and reliability in one place |
| Assets: uploads, dedupe hit rate, GC deletions, storage per user | storage growth is the cost that creeps |
| Table + index sizes weekly | `ProjectVersion` is the one to watch |
| Errors by `error.code` | the stable codes in §9 make this a one-line dashboard |
| Slow query log > 100ms | with `pg_stat_statements` enabled |

Alert on: conflict rate spike, build failure rate > 5%, p95 project-open > 500ms, any user crossing 80% of a quota, purge job failure, GC deleting more than expected in one run.

---

## 18. Edge cases

| # | Case | Expected behaviour |
|---|---|---|
| 1 | Two tabs edit the same project | Second write gets 409; client silently refetches head and re-applies (§6.1). No dialog in the common case |
| 2 | Same edit submitted twice (double-click, retry, auth replay) | Idempotency key → one version, one LLM call, replayed response |
| 3 | Token expires mid-build, client refreshes and replays | Idempotency key means the job is joined, not restarted |
| 4 | Client disconnects mid-build | Job completes server-side, version written. Reopening the project shows the result |
| 5 | Build fails at stage 6 of 8 | No version written. Job `FAILED` with the stage log intact for support |
| 6 | LLM succeeds but the DB write fails | Transaction rolls back, job `FAILED`, response includes a retry token. Never leave a half-written version |
| 7 | User reverts to v3, then wants v9 back | v9 still exists; revert forward. Nothing was destroyed |
| 8 | Revert to a version referencing a deleted asset | Assets referenced by any version are never GC'd (§7.3), so it renders |
| 9 | Asset uploaded but never placed in a page | `pending`/unlinked, GC'd after 24h |
| 10 | Same photo uploaded to 5 projects | One object, one `Asset`, five `ProjectAsset` links |
| 11 | Delete an asset still used by an older version | Unlink from the current page; object retained while any version references it |
| 12 | Page exceeds 1 MB | `PAGE_TOO_LARGE`, write rejected, previous version untouched |
| 13 | A `data:` URL reaches a page write | `DATA_URL_REJECTED` with the offending section named |
| 14 | Project deleted while a build is running | Job cancelled; if it completes first, the version is written to a soft-deleted project and disappears with it |
| 15 | Restore from trash after 31 days | Gone. Trash expiry is shown in the UI with a countdown |
| 16 | Two projects, same name | Allowed. Slugs disambiguate (`my-cafe`, `my-cafe-2`) |
| 17 | Rename to a slug that collides | Server appends a suffix and returns the actual slug — never a 409 for a rename |
| 18 | User at the 50-project cap | `QUOTA_EXCEEDED` with `{limit, used}`; UI offers deleting from trash |
| 19 | Storage quota hit mid-upload | Rejected at presign, before a byte moves |
| 20 | 500 versions reached | Prune oldest non-milestone; user-visible history stays continuous |
| 21 | Chat history reaches 2000 messages | Oldest archived out of the hot table; the project still opens fast |
| 22 | Import with a corrupt localStorage blob | Per-project validation; the good ones import, the bad ones are reported |
| 23 | Import run twice (user logs in on two devices) | Idempotency key + a `sourceLocalId` uniqueness check — no duplicates |
| 24 | User signs up on device B where device A has projects | Device B imports its own localStorage; device A's projects are already on the server. Both merge cleanly |
| 25 | Concurrent version writes racing | `(projectId, version)` unique constraint + CAS pointer update; loser retries once, then 409 |
| 26 | Publish while an edit is in flight | Publish resolves the head at transaction time; the in-flight edit becomes the next version, unpublished until republished |
| 27 | Rollback a publication whose version was pruned | Publication-referenced versions are exempt from pruning (§5.3) |
| 28 | Custom domain removed while live | Site falls back to the platform subdomain; publication stays live |
| 29 | Owner deletes their account | Cascade purges projects, versions, messages, jobs; assets unlinked and GC'd; published sites taken down first |
| 30 | Clock skew between instances | Ordering uses the `seq`/`version` integers, never timestamps |
| 31 | Instance dies holding a running job | On boot, mark `RUNNING` jobs older than the timeout as `FAILED` with a retryable flag |
| 32 | Slow client on 3G opens a 60 KB page | gzip + immutable version caching; the second open is free |

---

## 19. Build order

Each step is independently deployable and leaves the app working.

| # | Step | Deliverable |
|---|---|---|
| 1 | **Postgres + Prisma + auth models** | prerequisite — see the auth doc |
| 2 | **Project + ProjectVersion + repository layer** | scoped repo functions, version-write transaction, unit tests on the CAS path |
| 3 | **Read APIs** | `GET /projects`, `GET /projects/:id`, versions list. Dashboard reads from the server |
| 4 | **Write APIs + version writes** | create / rename / delete / restore / duplicate |
| 5 | **Object storage + presigned uploads** | `Asset`, presign/commit, derivatives, blurhash. Migrate the 42 MB of existing uploads |
| 6 | **Server-authoritative edit** (§10) | `/api/projects/:id/edit`; drop the global 80 MB body limit to 1 MB |
| 7 | **BuildJob + resumable SSE** (§8) | durable builds, cost accounting |
| 8 | **ChatMessage persistence** | paginated history, server-assigned `seq` |
| 9 | **Import from localStorage** (§15) | dual-write, then cut over |
| 10 | **Quotas + observability** (§13, §17) | limits enforced, dashboards live |
| 11 | **Publishing** (§11) | static render → CDN → live URL, rollback |
| 12 | **GC, pruning, purge, backups drill** (§7.3, §5.3, §16) | the jobs that keep it healthy at month six |

Steps 1–6 are the critical path to "projects are real." Steps 7–12 are what make it production rather than a demo.

---

## 20. Environment

```bash
# database
DATABASE_URL=postgresql://...?sslmode=require&connection_limit=10&pool_timeout=20
DIRECT_DATABASE_URL=            # unpooled, for prisma migrate

# object storage (S3 or Cloudflare R2 — R2 has no egress fees, worth it for a site builder)
STORAGE_PROVIDER=r2
STORAGE_BUCKET=prowplus-assets
STORAGE_REGION=auto
STORAGE_ACCESS_KEY_ID=
STORAGE_SECRET_ACCESS_KEY=
STORAGE_ENDPOINT=
CDN_BASE_URL=https://cdn.prowplus.com
PRESIGN_TTL_SECONDS=300

# published sites
SITES_BUCKET=prowplus-sites
SITES_BASE_DOMAIN=sites.prowplus.com

# limits
MAX_PAGE_BYTES=1048576
MAX_PROJECTS_PER_USER=50
MAX_VERSIONS_PER_PROJECT=500
MAX_STORAGE_BYTES_PER_USER=2147483648
MAX_BUILDS_PER_DAY=30
TRASH_RETENTION_DAYS=30
VERSION_RETENTION_DAYS=30
```

---

## 21. Test plan

**Unit (vitest — already configured):** version-write CAS under simulated races · page size + `data:` URL rejection · slug generation and collisions · asset refcount link/unlink · GC eligibility · retention pruning keeps milestones · idempotency replay vs. body mismatch · quota arithmetic at boundaries.

**Integration (against a real test database):** create → build → 3 edits → revert → duplicate, asserting the exact version chain · two concurrent edits, exactly one wins with a clean 409 · delete → restore → delete → purge · import a realistic localStorage blob and verify history survives · tenancy: user B gets 404 (not 403 — don't confirm existence) on every project route.

**Load:** 200 projects on one account, dashboard p95 < 60ms · 50 concurrent edits across projects · 20 concurrent builds, confirming quota and pool limits hold.

**Failure injection:** kill the process mid-build → job reconciles on boot · storage 503 during commit → asset stays `pending`, no orphan page reference · DB failover during a version write → transaction rolls back cleanly.

**Manual:** two browsers on one project · close the laptop mid-build and reopen · upload a 24 MB photo on 3G · revert 10 versions and forward again · publish, edit, republish, roll back.

---

## 22. Open questions

1. ~~Postgres host~~ **RESOLVED: Neon.** Branching gives us a preview database per PR, the pooler is built in, and PITR is included. Pooled URL for the app, `DIRECT_DATABASE_URL` for migrations.
2. ~~R2 vs. S3~~ **RESOLVED: Cloudflare R2.** Zero egress is decisive for serving published sites with large hero images. Accessed through the S3-compatible API so the storage driver stays portable.
3. ~~In-process job runner vs. a real queue~~ **RESOLVED: in-process now, behind a `JobDispatcher` interface.** Fine to ~100 concurrent users; swapping in BullMQ later is a driver change, not a migration.
4. ~~Publishing target~~ **RESOLVED: CDN-hosted static files** (§11). Faster, cheaper, and customer sites stay up even when the builder is down.
5. **Do we need collaborators in v1?** The `ProjectMember` table is in the schema either way; the question is only whether the UI ships. Costs ~a week if yes.
6. **Version retention window** — 30 days of full history is generous. If storage is a concern, 14 days plus milestones halves it. Decide before step 12, not after the table is large.


---

## 23. Implementation status

### Built and verified — build-order steps 2 through 5
| Area | Files | Notes |
|---|---|---|
| Schema + migration | `prisma/schema.prisma`, `migrations/20260820010000_projects_and_assets/` | `Project`, `ProjectVersion`, `ChatMessage`, `ProjectMember`, `Asset`, `ProjectAsset`, `ProjectEvent`, `IdempotencyRecord` + 5 enums. Two partial indexes appended by hand (Prisma cannot express a `WHERE` on an index) |
| Limits | `src/config/limits.ts` | Every quota and cap in one reviewable module |
| Page guards | `src/projects/pageGuards.ts` | Size cap → scheme scan → schema parse, in that order. Recursive scanner, so a `data:` URL buried in section `content` is caught, not just one in `assets[]` |
| Query shapes | `src/projects/select.ts` | `projectSummarySelect` makes the "list endpoint drags every page JSONB" mistake unrepresentable |
| Repository | `src/projects/repo.ts` | Ownership `scope()` on every query · CAS version write · keyset pagination · create/rename/soft-delete/restore/duplicate/revert |
| Slugs | `src/projects/slug.ts` | Accent folding, collision suffixes, never-empty fallback |
| Maintenance | `src/projects/maintenance.ts` | Trash purge, milestone-preserving version pruning, chat trimming |
| Storage | `src/storage/config.ts`, `driver.ts` | S3-compatible (R2), presigned PUT with signed `ContentLength`, immutable cache headers |
| Assets | `src/assets/{service,mime,derivatives,links}.ts` | Presign → upload → commit → link → collect. Content-addressed dedupe, magic-byte sniffing, EXIF stripping, blurhash, AVIF/WebP at 4 widths |
| Idempotency | `src/middleware/idempotency.ts` | Insert-to-reserve (atomic), body-hash mismatch → 422, in-flight → 409, 5xx releases the key |
| Routes | `src/routes/projects.ts`, `assets.ts` | 15 endpoints, all behind `requireAuth` + `requireVerified` |
| Tests | `src/projects/*.test.ts`, `src/assets/*.test.ts` | 53 new; full suite **300 passing** |

### Deviations from the spec above, and why
1. **Error model generalized.** `auth/errors.ts` became `lib/httpError.ts` with `HttpError` and one `ErrorCode` union covering auth, projects and assets. Two parallel error types would have meant two client-side handlers.
2. **`ok()` moved to `lib/respond.ts`** and gained a `meta` slot for `nextCursor`. It is no longer auth-specific.
3. **Prisma client made lazy** (`getPrisma()` behind a proxy). It was constructed at import time, which meant any module importing a repository needed a live `DATABASE_URL` just to load — including unit tests for pure helpers. Construction is now deferred to the first query.
4. **Projects start at version 0, not 1.** Version 0 means "no document yet"; the first build appends version 1. This keeps `currentVersion` an honest count of stored documents instead of requiring an empty placeholder version nobody can revert to.
5. **Asset linking is best-effort for unknown paths.** Catalog images and legacy `/images/uploads/...` paths have no `Asset` row, so they are ignored rather than rejected — otherwise every pre-existing page would fail to save.
6. **Blurhash added** (not in the original spec) — 28 characters on the row, and it is what stops a hero photo from shifting the layout when it loads.

### Bug caught during verification
The project and asset routers were first mounted **after** the global `express.json({ limit: "80mb" })`. Whichever parser runs first consumes the body, so the 2 MB and 64 KB limits silently did nothing. Now mounted before it, and verified: 3 MB → 413 on `/api/projects` and `/api/assets`, still accepted on the legacy `/api/intake`.

### Not yet built
- **Step 6 — server-authoritative edit.** `/api/edit` still trusts `req.body.page`. This is the change that makes the whole design real, and it is deliberately separate: it alters the behaviour of a running app, and the client must move at the same time.
- **Step 7 — `BuildJob` + resumable SSE.** Table not yet in the schema; adds with the feature.
- **Step 8 — chat persistence.** Table exists and is pruned; no routes yet.
- **Step 9 — localStorage import.** Needs steps 1–5 in place, which they now are.
- **Step 11 — publishing.** `Publication` table not yet added.
- Frontend: nothing consumes these endpoints yet.

### Blocked on you
| Needed | For |
|---|---|
| Neon `DATABASE_URL` + `DIRECT_DATABASE_URL` | `npm run db:deploy` to apply both migrations. Nothing is exercised end-to-end until then |
| R2 bucket + keys + `CDN_BASE_URL` | Uploads. Without them the asset routes return `STORAGE_UNAVAILABLE` and the rest of the API works normally |

Serve `CDN_BASE_URL` from a **different origin** than the app — a malicious upload must not be able to execute in the app's origin.
