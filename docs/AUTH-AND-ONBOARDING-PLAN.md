# Auth + Onboarding — Production Build Plan

**Status:** backend + frontend implemented, unwired from a live database — see §17
**Owner:** ProwPlus
**Companion doc:** [`PROJECT-PERSISTENCE-PLAN.md`](./PROJECT-PERSISTENCE-PLAN.md) — server-side projects, versioning, assets. Built on the `User` this doc introduces.
**Goal:** real users sign up, log in, and reach the builder — smooth enough to run unattended, hardened enough to run in production.
**Design reference:** [lovable.dev](https://lovable.dev) — dark aurora shell, one question per screen, pill inputs, white pill CTA, progress dots.

---

## 0. What exists today (audit)

Read before you write code — this shapes every decision below.

| Area | Today | Impact on auth |
|---|---|---|
| Backend | Express 4 + TS (ESM, `"type": "module"`), `tsx` dev, zod schemas | Add an `/api/auth` router; keep the same zod-validated style |
| Persistence | **None.** No DB anywhere. `catalog.json` read from disk, uploads to `backend/data/images` | We must introduce a database. This is the single biggest new piece. |
| Sessions | None | Greenfield — we can do it right the first time |
| Email | `backend/src/lib/smtpMailer.ts` (nodemailer, SMTP env already wired for lead emails) | **Reuse it.** OTP email = new template, same transport |
| Rate limiting | In-memory `Map` in `backend/src/routes/leads.ts` (10 min / 8 hits) | The shape is right, the storage is not — extract it into a shared limiter with a Redis driver (§1) |
| Frontend routing | **No react-router.** Hash-based views: `#home` / `#builder` / `#gallery` via `src/lib/appView.ts` + `useAppViewSync` | Auth needs real paths (`/login`, `/reset`) because email links point at them. See §12.2 |
| Frontend build | Vite multi-page: `index.html`, `preview.html`, `gallery.html` | Auth lives inside `index.html` app; prod host needs SPA rewrite |
| API calls | Bare `fetch("/api/...")` in ~13 places, no shared client, no auth header | Introduce `src/lib/apiClient.ts` and migrate those call sites |
| Project data | `localStorage` keys `prowplus-projects` / `prowplus-active-project` (`StoredProject[]`, capped at 30) | Anonymous users can already build. We must **claim** those projects on signup (§6.8) |
| Dev networking | Vite proxies `/api` → `localhost:4000`, so dev is same-origin | Cookies "just work" in dev. Prod must also be same-site — see §4.4 |
| CORS | `cors({ origin: FRONTEND_ORIGIN })`, no credentials | Must add `credentials: true` for the refresh cookie |
| Theme tokens | `src/index.css` has both a light "Dharwin" palette **and** `--lovable-*` dark workspace tokens | Onboarding step 1 ("Pick your style") maps directly onto these two palettes |

**Implication:** this is not "bolt auth onto an app that has users." It is "introduce the concept of a user." Budget for the DB, the session plumbing, and the localStorage→account migration as separate pieces of work.

---

## 1. Decisions (locked)

| Question | Decision | Why |
|---|---|---|
| Database | **PostgreSQL + Prisma on Neon** (pooled URL for the app, direct URL for migrations, PITR on) | Relational, shared with projects and billing; Prisma gives typed queries + reviewable migrations. See the persistence doc §16 for backup posture |
| Password hashing | **argon2id via `@node-rs/argon2`** | OWASP's current recommendation. `@node-rs/argon2` ships prebuilt binaries — no node-gyp, no native toolchain on the deploy box, and it's faster than the `argon2` package |
| Access token | **JWT (HS256), 15 min**, held **in a JS variable only** — never localStorage, never a cookie | XSS can't read it from a closure as easily as from localStorage; short TTL bounds the damage |
| Refresh token | **Opaque 256-bit random**, SHA-256 hashed at rest, **httpOnly + Secure + SameSite=Lax cookie**, path `/api/auth`, 30-day rolling | Opaque = revocable server-side. httpOnly = XSS-proof. Path-scoped = not sent on every API call |
| Refresh rotation | **Rotate on every use + reuse detection** (token family kill) | Detects stolen refresh tokens; industry standard |
| Google auth | **Google Identity Services (GIS) popup → ID token → backend verify** with `google-auth-library` | One click, no page unload, SPA state survives. Redirect/code flow is the documented fallback (§6.3d) |
| Email verification | **6-digit OTP**, 10 min TTL, hashed at rest, 5 attempts, 60s resend cooldown | Faster than magic links on mobile, works when the email opens in a different browser |
| Forgot password | **OTP → short-lived reset ticket → set password** | Same mental model as verification; no long-lived reset links sitting in inboxes |
| Rate limiting | **Redis-backed** (per IP **and** per account), behind a `RateLimiter` interface | In-memory counters are per-process — with two instances behind a load balancer, a 10-attempt lockout becomes 20. Ship the interface with an in-memory driver for local dev and Redis in prod |
| Onboarding | 4 steps, **persisted per step**, resumable, gates the builder | Matches reference screenshots; per-step saves mean a refresh never loses answers |
| Session storage | DB table (`Session`), not JWT-only | We need "log out all devices" and reuse detection |

**Not in v1** (deliberately deferred, none of them blocked by this design): 2FA/TOTP, magic links, SSO/SAML, org/team accounts, billing, email-change flow, self-serve account deletion. The schema leaves room for each — `Session` and `OAuthAccount` already generalise to more providers and more factors.

---

## 2. Architecture

```
Browser (React SPA)
 ├─ AuthProvider (React context)
 │   ├─ accessToken: string | null      ← in memory ONLY
 │   ├─ user: User | null
 │   └─ status: 'loading' | 'authed' | 'anon'
 │
 ├─ apiClient.ts
 │   ├─ attaches  Authorization: Bearer <accessToken>
 │   ├─ on 401 → single-flight POST /api/auth/refresh → retry once
 │   └─ on refresh failure → clear state → redirect /login?next=…
 │
 └─ httpOnly cookie  prow_rt=<opaque>   (Secure, SameSite=Lax, Path=/api/auth)
                              │
                              ▼
Express API  /api/auth/*
 ├─ signup / verify-email / login / logout / logout-all
 ├─ refresh   (rotate + reuse detection)
 ├─ google    (verify ID token → find-or-create → link)
 ├─ forgot-password / verify-reset-otp / reset-password
 ├─ me        (bootstrap, returns user + onboarding state)
 └─ onboarding/step  (per-step persist)
                              │
                              ▼
PostgreSQL (Prisma)
 User · OAuthAccount · Session · OtpCode · OnboardingProfile
 (+ Project / ProjectVersion / Asset — see PROJECT-PERSISTENCE-PLAN.md)
                              │
                              ▼
SMTP (existing smtpMailer.ts) — OTP + welcome emails
```

**Request lifecycle, happy path:**
1. App boots → `GET /api/auth/me` with no access token → 401 → client silently calls `POST /api/auth/refresh` (cookie is sent automatically) → gets a fresh access token + user → renders authed shell. **One round trip if the cookie is absent, two if it's present.**
2. Every subsequent API call carries the bearer token. No cookie, no CSRF surface on normal endpoints.
3. At the 15-min mark a call 401s → interceptor refreshes once → replays the original request. The user sees nothing.

---

## 3. Data model (Prisma)

`backend/prisma/schema.prisma`

```prisma
generator client { provider = "prisma-client-js" }
datasource db    { provider = "postgresql"; url = env("DATABASE_URL") }

model User {
  id              String    @id @default(cuid())
  email           String    @unique          // always stored lowercased+trimmed
  emailVerifiedAt DateTime?
  passwordHash    String?                    // null = Google-only account
  name            String?
  avatarUrl       String?
  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt
  lastLoginAt     DateTime?

  // security counters
  failedLoginCount Int      @default(0)
  lockedUntil      DateTime?

  oauthAccounts   OAuthAccount[]
  sessions        Session[]
  otpCodes        OtpCode[]
  onboarding      OnboardingProfile?

  @@index([email])
}

model OAuthAccount {
  id             String   @id @default(cuid())
  userId         String
  provider       String                       // "google"
  providerUserId String                       // Google `sub` — stable, never reuse email
  email          String?
  createdAt      DateTime @default(now())

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([provider, providerUserId])
  @@index([userId])
}

model Session {
  id               String   @id @default(cuid())
  userId           String
  familyId         String                     // rotation chain id — kill the whole family on reuse
  refreshTokenHash String   @unique           // sha256(raw token)
  userAgent        String?
  ip               String?
  createdAt        DateTime @default(now())
  lastUsedAt       DateTime @default(now())
  expiresAt        DateTime
  revokedAt        DateTime?
  replacedById     String?                    // audit trail of the rotation chain

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId])
  @@index([familyId])
  @@index([expiresAt])
}

model OtpCode {
  id          String   @id @default(cuid())
  userId      String
  purpose     String                          // "verify_email" | "reset_password"
  codeHash    String                          // argon2/bcrypt hash of the 6 digits
  attempts    Int      @default(0)
  maxAttempts Int      @default(5)
  expiresAt   DateTime
  consumedAt  DateTime?
  createdAt   DateTime @default(now())

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId, purpose])
  @@index([expiresAt])
}

model OnboardingProfile {
  id          String   @id @default(cuid())
  userId      String   @unique
  themePref   String?                         // "light" | "dark"          (step 1)
  fullName    String?                         //                            (step 2)
  role        String?                         // founder|product|designer|engineer|consultant|marketing_sales|operations|other (step 3)
  companySize String?                         // solo|2_20|21_200|200_plus (step 4)
  currentStep Int      @default(1)
  completedAt DateTime?
  updatedAt   DateTime @updatedAt

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)
}
```

**Notes**
- `passwordHash` nullable is deliberate: a Google-first user has no password until they set one.
- Never key OAuth on email — Google `sub` is the only stable identifier.
- Sweep expired `Session`/`OtpCode` rows nightly. Run it as a scheduled job with a lock (not a bare `setInterval`), or two instances will both sweep and both log noise.

---

## 4. Tokens & sessions

### 4.1 Access token
- JWT HS256, secret `JWT_ACCESS_SECRET` (32+ random bytes).
- TTL **15 minutes**.
- Claims: `sub` (userId), `sid` (session id), `email`, `ev` (emailVerified bool), `ob` (onboardingComplete bool), `iat`, `exp`, `iss: "prowplus"`, `aud: "prowplus-web"`.
- Putting `ev`/`ob` in the token lets the client route instantly without a second fetch. They go stale for at most 15 min — acceptable, and we force a refresh right after onboarding completes.
- Stored **in memory only** (`AuthProvider` state). A page refresh loses it and is recovered by the silent refresh in §2.

### 4.2 Refresh token
- `crypto.randomBytes(32).toString("base64url")` — opaque, not a JWT.
- Stored as `sha256(raw)` so a DB leak isn't a session leak.
- Cookie:
  ```
  Set-Cookie: prow_rt=<raw>; HttpOnly; Secure; SameSite=Lax; Path=/api/auth; Max-Age=2592000
  ```
- `Path=/api/auth` means it is **not** sent to `/api/build`, `/api/edit`, etc. Smaller blast radius, smaller requests.
- `SameSite=Lax` is enough because the only state-changing cookie endpoint is `/api/auth/refresh`, and it's a POST (Lax blocks cross-site POST cookies). Belt-and-braces: also require a custom header `X-Requested-With: prowplus` on refresh, which forces a preflight from any cross-origin attacker.

### 4.3 Rotation + reuse detection
```
POST /api/auth/refresh
  1. read cookie → sha256 → find Session
  2. not found                → 401, clear cookie
  3. found but revokedAt set  → REUSE DETECTED:
                                revoke every session where familyId = this.familyId
                                clear cookie, 401, log security event, email the user
  4. expired                  → 401, clear cookie
  5. valid → create new Session (same familyId, new token)
             mark old: revokedAt = now, replacedById = new.id
             set new cookie, return new access token + user
```
Keep the old row (revoked, not deleted) — that's what makes reuse detectable.

**Rotation race:** two tabs refresh at once and the loser gets a false "reuse detected." Fix with a **5-second grace window**: if `revokedAt` is within the last 5s and `replacedById` is set, return the *replacement's* access token instead of killing the family. This one detail prevents the most common "why did it log me out?" bug report.

### 4.4 Cookies in production
The refresh cookie must be first-party.

- ✅ **Recommended:** serve API and app on the same registrable domain — `app.prowplus.com` + `api.prowplus.com` with `Domain=.prowplus.com`, or reverse-proxy `/api` on the app origin (mirrors dev exactly — least surprise).
- ❌ Avoid `app.vercel.app` + `api.render.com`: that is cross-site, needs `SameSite=None`, and gets eaten by Safari ITP and third-party-cookie blocking.

`Secure` is required in prod; in local dev over `http://localhost` set `Secure` only when `NODE_ENV === "production"`.

### 4.5 CORS change
```ts
app.use(cors({
  origin: FRONTEND_ORIGIN,          // exact origin, never "*", never reflect blindly
  credentials: true,                // required for the refresh cookie
  allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
}));
```

---

## 5. API surface

All under `/api/auth`. All bodies zod-validated. All errors return `{ ok: false, error: { code, message } }` with a **stable machine code** the UI switches on.

| Method | Path | Auth | Body | Returns |
|---|---|---|---|---|
| POST | `/signup` | – | `{ email, password, name? }` | `{ ok, next: "verify_email" }` + sends OTP |
| POST | `/verify-email` | – | `{ email, code }` | access token + user + sets cookie |
| POST | `/resend-otp` | – | `{ email, purpose }` | `{ ok, retryAfterSec }` |
| POST | `/login` | – | `{ email, password }` | access token + user + cookie, **or** `{ next: "verify_email" }` |
| POST | `/google` | – | `{ credential, nonce }` | access token + user + cookie + `isNewUser` |
| POST | `/refresh` | cookie | – | new access token + user + rotated cookie |
| POST | `/logout` | cookie | – | revokes this session, clears cookie |
| POST | `/logout-all` | bearer | – | revokes every session for the user |
| GET | `/me` | bearer | – | `{ user, onboarding }` |
| POST | `/forgot-password` | – | `{ email }` | always `{ ok: true }` (enumeration-safe) |
| POST | `/verify-reset-otp` | – | `{ email, code }` | `{ resetTicket }` (JWT, 10 min, single-use) |
| POST | `/reset-password` | – | `{ resetTicket, password }` | `{ ok }` + revokes all sessions |
| POST | `/set-password` | bearer | `{ password }` | for Google-only users adding a password |
| PATCH | `/onboarding/step` | bearer | `{ step, value }` | `{ ok, currentStep }` |
| POST | `/onboarding/complete` | bearer | – | `{ ok }` + fresh access token with `ob: true` |
| POST | `/projects/claim` | bearer | `{ projects: StoredProject[] }` | `{ claimed: n }` (see §6.8) |

### Error codes (the UI switches on these — never on message text)
```
INVALID_CREDENTIALS   EMAIL_TAKEN         EMAIL_NOT_VERIFIED    OTP_INVALID
OTP_EXPIRED           OTP_MAX_ATTEMPTS    RATE_LIMITED          ACCOUNT_LOCKED
WEAK_PASSWORD         SESSION_EXPIRED     SESSION_REUSED        GOOGLE_TOKEN_INVALID
GOOGLE_EMAIL_UNVERIFIED  GOOGLE_NOT_CONFIGURED    PASSWORD_ALREADY_SET
RESET_TICKET_INVALID  PASSWORD_REUSED     INVITE_REQUIRED       PAYLOAD_TOO_LARGE
VALIDATION_ERROR      INTERNAL_ERROR
```

### `user` payload shape (single source of truth for the client)
```ts
type AuthUser = {
  id: string;
  email: string;
  name: string | null;
  avatarUrl: string | null;
  emailVerified: boolean;
  hasPassword: boolean;          // drives "Set a password" prompt for Google users
  providers: ("password" | "google")[];
  onboarding: {
    complete: boolean;
    currentStep: number;         // 1..4
    themePref: "light" | "dark" | null;
    fullName: string | null;
    role: string | null;
    companySize: string | null;
  };
};
```

---

## 6. Flows

### 6.1 Email signup → OTP verification

```
User fills email + password on /signup
  → POST /api/auth/signup
     • normalize email (trim, lowercase; strip Gmail dots/+tags ONLY for the
       duplicate check, store the original)
     • zod: email valid, password ≥ 8 chars, not in a top-1000 common list,
       not equal to the email local-part
     • if user exists AND verified  → 200 { ok:true, next:"verify_email" }   ← no leak
       (silently send a "someone tried to sign up with your email" mail instead)
     • if user exists but UNVERIFIED → overwrite passwordHash, resend OTP (this is
       the honest case: they abandoned before verifying)
     • else create User(emailVerifiedAt: null), create OtpCode, send email
  → UI navigates to /verify (email carried in route state, NOT the URL)

User types 6 digits (auto-advance, paste-whole-code supported)
  → POST /api/auth/verify-email
     • constant-time compare against codeHash; increment attempts first
     • attempts > max → invalidate the code, force resend
     • on success: consumedAt = now, emailVerifiedAt = now
     • create Session → set cookie → return access token
  → UI: brief success tick → /onboarding (step 1)
```

**Rules**
- OTP: 6 digits, generated with `crypto.randomInt(100000, 1000000)`, **hashed** at rest, 10 min TTL.
- Only one live code per `(userId, purpose)` — issuing a new one consumes the old.
- Resend cooldown 60s, max 5 sends per email per hour.
- The verify screen must survive a refresh: keep `pendingEmail` in `sessionStorage` and restore it, otherwise a refresh strands the user on a screen with no email.

### 6.2 Login
```
POST /api/auth/login
  • find user by normalized email
  • if no user → still run a dummy argon2 verify (constant-time), return INVALID_CREDENTIALS
  • if lockedUntil > now → ACCOUNT_LOCKED { retryAfterSec }
  • verify password
      fail → failedLoginCount++ ; at 10 → lockedUntil = now + 15min ; INVALID_CREDENTIALS
      pass → reset counters
  • if !emailVerifiedAt → issue a fresh OTP, return { next: "verify_email" }  ← don't dead-end them
  • if user.passwordHash == null (Google-only) → INVALID_CREDENTIALS, and the UI
    shows "Looks like you signed up with Google" with a Google button pre-focused
  • create Session, set cookie, return access token
  • if onboarding incomplete → client routes to /onboarding at the saved step
```

### 6.3 Google auth — one click, signup and login are the same button

**a) Client (GIS, popup — no page unload, SPA state survives)**
```ts
// load https://accounts.google.com/gsi/client once, with <link rel="preconnect">
const nonce = crypto.randomUUID();
sessionStorage.setItem("g_nonce", nonce);

google.accounts.id.initialize({
  client_id: import.meta.env.VITE_GOOGLE_CLIENT_ID,
  nonce,
  ux_mode: "popup",
  callback: ({ credential }) => api.post("/auth/google", { credential, nonce }),
  auto_select: false,              // never silently sign in a returning visitor
  cancel_on_tap_outside: true,
});
google.accounts.id.renderButton(el, { theme: "outline", size: "large", width: 380 });
```
Render our own styled button as the visual layer and keep Google's rendered button for the click target (Google's ToS require their branding), or use `renderButton` with `theme: "filled_black"` to match the dark shell.

**b) Server verification — do not skip a single check**
```ts
const ticket = await googleClient.verifyIdToken({
  idToken: credential,
  audience: GOOGLE_CLIENT_ID,          // must match ours
});
const p = ticket.getPayload();
assert(p.iss === "https://accounts.google.com" || p.iss === "accounts.google.com");
assert(p.aud === GOOGLE_CLIENT_ID);
assert(p.exp * 1000 > Date.now());
assert(p.nonce === req.body.nonce);    // replay protection
if (!p.email_verified) throw GOOGLE_EMAIL_UNVERIFIED;   // hard stop
```

**c) Find-or-create + linking**
```
1. OAuthAccount(provider:"google", providerUserId: p.sub) exists?
     → log that user in. Done. (fastest path, one DB hit)
2. Else User with email == p.email exists?
     → LINK: create OAuthAccount for them, set emailVerifiedAt if null,
       backfill name/avatar if empty. Log them in.
       Safe *only* because email_verified === true — Google proved ownership.
3. Else CREATE:
     User{ email, name: p.name, avatarUrl: p.picture,
           emailVerifiedAt: now, passwordHash: null }
     + OAuthAccount
     → isNewUser: true
```
**Google users skip email verification entirely.** They land straight on onboarding step 1 — but step 2 ("What's your name?") is **prefilled with `p.name`**, so the whole onboarding is 3 taps. That is the "single click Google signup, smooth process" the reference flow delivers.

**d) Fallback: redirect / auth-code flow**
Keep `GET /api/auth/google/start` → `GET /api/auth/google/callback` (authorization code + PKCE + `state` in an httpOnly cookie) behind a flag. Needed when the popup is blocked, in embedded webviews (in-app browsers from Instagram/LinkedIn), and when third-party script loading fails. Detect popup failure and fall back automatically rather than showing an error.

**e) Google-only user tries "Forgot password"** → they have no password. Respond `{ ok: true }` as always, but the email says *"You sign in to ProwPlus with Google — tap here to continue"* rather than a reset code. No dead end, no enumeration leak.

### 6.4 Forgot password (OTP-based)
```
/forgot-password  → enter email
   POST /api/auth/forgot-password
     • ALWAYS return { ok: true } after a fixed ~250ms floor (kills timing oracles)
     • if user + has password → send 6-digit OTP (purpose: reset_password, 10 min)
     • if user + Google-only  → send the "use Google" email (§6.3e)
     • if no user             → send nothing
   → UI: "If an account exists for that email, a code is on its way."

/reset-otp → 6-digit input, same component as verification
   POST /api/auth/verify-reset-otp
     • same attempt/expiry rules
     • success → mint resetTicket: JWT { sub, purpose:"reset", jti, exp: +10min }
       signed with a SEPARATE secret; store jti in a consumed-set (or a
       one-row-per-ticket table) so it can be used exactly once
     • consume the OTP immediately

/reset-password → new password + confirm, live strength meter
   POST /api/auth/reset-password
     • verify ticket + jti unused → mark used
     • reject if new password == old (argon2 verify against current hash)
     • update passwordHash
     • REVOKE ALL SESSIONS for the user (this is the point of a reset)
     • send "your password was changed" email with an "I didn't do this" link
     • auto-login: create a fresh session, set cookie, return access token
       → user lands in the app, not on a login screen. Small thing, big UX win.
```

### 6.5 Logout
- `POST /logout` → revoke this session row, `Set-Cookie` with `Max-Age=0`, clear in-memory token, clear user-scoped client caches, hard-navigate to `/login`.
- Clearing in-memory state is not enough — you must revoke server-side, or the refresh cookie (if it survives) still works.
- `POST /logout-all` for the "signed out everywhere" case after a suspicious event.

### 6.6 Silent refresh — the single-flight interceptor
The one piece of client code most likely to be written wrong. Requirements:
1. **Single-flight:** ten parallel 401s must trigger **one** refresh, with the other nine queued on the same promise.
2. **Retry exactly once.** A 401 on the replayed request → log out. No loops.
3. **Never refresh** for `/api/auth/login`, `/signup`, `/refresh` themselves.
4. On failure → clear state, redirect to `/login?next=<current path>`, and restore that path after login.
5. Optional polish: proactively refresh at T-60s using the JWT `exp` while the tab is visible, so an active user never hits a 401 at all.
6. Handle `document.visibilitychange` — a laptop that slept for 3 hours wakes with an expired token; refresh on wake before firing queued requests.

```ts
let refreshing: Promise<string | null> | null = null;

async function getFreshToken() {
  refreshing ??= doRefresh().finally(() => { refreshing = null; });
  return refreshing;
}
```

### 6.7 Route guarding (three gates, in order)
```
not authed              → /login
authed, !emailVerified  → /verify
authed, !onboardingDone → /onboarding (at savedStep)
otherwise               → app (#home)
```
Guard on the **server-derived** flags in `/me` / the JWT, never on a client-only boolean. And render a real skeleton while `status === 'loading'` — never flash `/login` at an authenticated user (the classic auth flicker).

### 6.8 Claiming anonymous projects (do not skip this)
Today anyone can build a site with no account and it lands in `localStorage` (`prowplus-projects`). If signup wipes that, users lose work on their first real interaction with us.

**Production decision: projects live on the server in a real `Project` table.** The full design — versioning, assets, concurrency, publishing — is specified in [`PROJECT-PERSISTENCE-PLAN.md`](./PROJECT-PERSISTENCE-PLAN.md). The localStorage-namespacing shortcut previously floated here is **rejected**: it leaves work on one device, can't be recovered by support, and would have to be unwound later anyway.

What the auth layer owes that design:

```
On successful signup/login, client checks localStorage for prowplus-projects
  → if non-empty and unclaimed:
       POST /api/projects/import { projects: [...] }  + Idempotency-Key
       (cap: 30 projects, 5 MB each; history entries become earlier
        ProjectVersion rows; /images/uploads/* paths are re-ingested as Assets)
  → server creates Project + version chain + ChatMessage rows, owned by userId
  → client marks them claimed; keep the localStorage copy 7 days as a safety
     net, then clear
```

Ordering constraint: the import endpoint depends on steps 1–5 of the persistence build order, so **ship auth first, then persistence, then wire the import** — do not block the auth release on it. Until import exists, an anonymous user who signs up keeps their localStorage projects locally and nothing is destroyed.

---

## 7. Onboarding wizard (matches the reference screenshots)

Four questions, one per screen, progress dots at the bottom, then a `Submitting…` state.

| # | Question | Control | Field | Values |
|---|---|---|---|---|
| 1 | **Pick your style** | two preview cards (Light / Dark), selected card gets a white ring | `themePref` | `light` \| `dark` |
| 2 | **What's your name?** | single pill text input, label "Full name" | `fullName` | string 1–60 |
| 3 | **Which role fits you best?** | 4×2 icon-card grid, click = select **and advance** (no Next button) | `role` | `founder`, `product`, `designer`, `engineer`, `consultant`, `marketing_sales`, `operations`, `other` |
| 4 | **How many people work at your company?** | 1×4 icon-card row, click = select and submit | `companySize` | `solo`, `2_20`, `21_200`, `200_plus` |
| — | `Submitting…` | centered spinner + label, ~600–900ms | — | then redirect to `#home` |

**Behaviour**
- Steps 1 and 2 have a **Next** button (they need a confirm). Steps 3 and 4 **advance on click** — that is why the reference has no button on those screens. Preserves the fast-tap feel.
- **Persist every step** (`PATCH /onboarding/step`) fire-and-forget with optimistic UI. A refresh at step 3 resumes at step 3.
- **Prefill from Google:** `fullName` ← Google `name`. The user just taps Next.
- **Step 1 applies immediately** — flip the shell theme the moment they pick, before they hit Next. Instant feedback, and it maps onto the existing `:root` / `--lovable-*` token sets in `src/index.css`.
- Back navigation: `←` arrow top-left from step 2 onward; browser Back also steps backward (push a history entry per step).
- Progress dots: 4 dots, active one is an elongated pill (as in the reference), animated width transition.
- **Never block on the network.** If `PATCH` fails, keep the answer in local state and retry on the final `complete` call. A flaky connection must not trap someone on step 2.
- On `complete`: write `completedAt`, return a **fresh access token** with `ob: true` (otherwise the guard bounces them back to onboarding for up to 15 min).
- Escape hatch: allow `?skipOnboarding=1` for internal accounts (gated by a staff flag, not just the query param), and treat all four fields as optional server-side. This data is for segmentation, not gating.

---

## 8. UI/UX spec

### 8.1 Visual language (from the reference screenshots)
- **Background:** near-black `#000` top → aurora blur bottom (blue `#2b4bd8` → violet → magenta `#d9418c`). Implement as one CSS layer, not an image:
  ```css
  background:
    radial-gradient(120% 80% at 50% 120%, #e0568f 0%, #8b4bd8 28%, #2f4fd8 52%, transparent 78%),
    #000;
  ```
  Add a very subtle `filter: blur(60px)` layer or a 2% noise overlay to kill gradient banding on cheap displays.
- **Card/inputs:** fully rounded pills (`border-radius: 9999px`) for inputs and the primary button; `12px` radius for option cards.
- **Primary CTA:** white → `#e9e9ec` vertical gradient, black text, full-width of the form column (~440px), height 56px.
- **Option cards:** `background: rgba(255,255,255,0.03)`, `border: 1px solid rgba(255,255,255,0.08)`; hover lifts to `0.06`; selected gets `border-color: #fff` + subtle outer glow.
- **Type:** the app already ships Geist Variable — use it. H1 40–48px semibold, tight tracking. Labels 14px medium at 90% white. Muted text `--lovable-text-muted` (`#a1a1aa`).
- **Logo:** centered, ~64px, above the heading, on every auth and onboarding screen.
- Reuse the existing `--lovable-*` tokens rather than inventing a parallel palette.

### 8.2 Screens
| Route | Contents |
|---|---|
| `/login` | Logo · "Welcome back" · **Google button first** · "or" divider · email + password · "Forgot password?" right-aligned under password · Sign in · footer "New here? Create account" |
| `/signup` | Logo · "Create your account" · Google button · divider · email · password with strength meter + a single-line requirement hint · "By continuing you agree to Terms & Privacy" · Create account |
| `/verify` | "Check your email" · `we sent a code to a•••@gmail.com` (masked) · 6 separate digit boxes · auto-submit on the 6th · "Resend in 0:47" · "Wrong email? Change it" |
| `/forgot-password` | "Reset your password" · email · Send code · Back to sign in |
| `/reset-otp` | same OTP component, purpose reset |
| `/reset-password` | new password + confirm · strength meter · Update password |
| `/onboarding` | the 4 steps in §7 |

**Google button is above the email form on both screens.** It's the fastest path and the one that converts best.

### 8.3 Micro-interactions and motion
- Step/route transitions: 220ms, content fades + travels 8px on the y-axis. Forward = enter from below, back = enter from above.
- Respect `prefers-reduced-motion: reduce` → cross-fade only, no travel.
- Buttons: 120ms ease-out, `active:scale-[0.98]`.
- Submit buttons swap their label for an inline spinner and **keep their width** (no layout jump).
- OTP boxes: focus ring animates; wrong code → 300ms horizontal shake + red border, then auto-clear and refocus box 1.
- Success on verify: green tick draws in (~400ms) before routing — that beat makes the transition feel intentional rather than abrupt.
- Preload the next step's icons so cards never pop in.

### 8.4 Form behaviour (the details users notice)
- Correct autocomplete: `email`, `current-password`, `new-password`, `one-time-code` (this is what triggers iOS OTP autofill from the SMS/Mail suggestion bar).
- `inputMode="numeric"` + `pattern="[0-9]*"` on OTP boxes → numeric keypad on mobile.
- Paste a 6-digit code into box 1 → distribute across all six.
- Validate **on blur**, and after the first failed submit switch to on-change. Never validate while someone is still typing their first email.
- Enter submits from any field. Enter on the last onboarding option advances.
- Disable submit only while in-flight — never for "invalid form", because a permanently dead button gives no explanation.
- Errors render **under the field**, one line, in `#f87171`, plus `aria-live="polite"` on a form-level error region.
- Trim whitespace on email before submit (copy-paste picks up a trailing space constantly).
- Show a password reveal toggle (eye icon) — it materially reduces mobile login failures.
- Caps Lock warning on the password field.

### 8.5 Accessibility
- Every input has a real `<label>` (visible, as in the reference).
- OTP group: `role="group"` + `aria-label="Verification code"`; each box `aria-label="Digit 1 of 6"`.
- Onboarding cards are `<button>` elements with `aria-pressed`, reachable by Tab, activated by Enter/Space, arrow keys move within the grid.
- Focus ring visible on all interactive elements (`:focus-visible`, 2px, white at 70%).
- Contrast: muted text on near-black must stay ≥ 4.5:1 — `#a1a1aa` on `#0c0c0e` passes; do not go dimmer.
- On route change, move focus to the new `<h1>` and announce it.

### 8.6 Mobile
- Single column, 24px side padding, content vertically centred but top-aligned once the keyboard opens.
- `100dvh`, not `100vh` (iOS Safari toolbar).
- Onboarding step 3's 4×2 grid becomes 2×4 under 480px; step 4's row becomes a 2×2 grid.
- Keep the submit button above the keyboard — scroll the focused field into view on focus.

---

## 9. Security checklist

| # | Control | Detail |
|---|---|---|
| 1 | Passwords | argon2id (`m=19456, t=2, p=1`), never logged, never returned |
| 2 | Password policy | ≥ 8 chars, blocklist of the top ~1000 leaked passwords, reject email-derived. **No forced symbol/uppercase rules** — they push people to `Password1!` |
| 3 | Timing safety | Dummy hash verify when the user doesn't exist; fixed ~250ms floor on `/forgot-password` |
| 4 | Enumeration | `/signup`, `/forgot-password`, `/login` never reveal whether an email exists |
| 5 | Brute force | Per-IP: 10 login attempts / 15 min. Per-account: lock 15 min after 10 fails. Exponential backoff on repeat lockouts |
| 6 | OTP | Hashed at rest, 6 digits, 10 min, 5 attempts, single live code per purpose, 60s resend cooldown, 5/hour cap |
| 7 | Refresh tokens | Opaque, hashed at rest, rotated on use, reuse kills the family, path-scoped httpOnly cookie |
| 8 | CSRF | Bearer tokens for normal APIs (no cookie → no CSRF). Cookie endpoints: `SameSite=Lax` + POST-only + required `X-Requested-With` header |
| 9 | XSS | Access token never in localStorage; refresh token httpOnly; set CSP `default-src 'self'` with explicit allowances for `accounts.google.com`; never `dangerouslySetInnerHTML` on user text |
| 10 | Google ID token | Verify signature, `iss`, `aud`, `exp`, `nonce`, and require `email_verified` |
| 11 | Open redirect | `?next=` must be validated as a same-origin relative path (`/^\/(?!\/)/`) before any redirect |
| 12 | Secrets | `JWT_ACCESS_SECRET`, `JWT_RESET_SECRET` (separate!), `GOOGLE_CLIENT_SECRET` in env only; fail fast on boot if any is missing or under 32 chars |
| 13 | Transport | HTTPS-only in prod, HSTS, `app.set("trust proxy", 1)` behind the load balancer so rate-limit IPs are real |
| 14 | Headers | Add `helmet` — it's one line and covers `X-Frame-Options`, `nosniff`, referrer policy |
| 15 | Body size | The global `express.json({ limit: "80mb" })` is for hero images. **Mount `/api/auth` with its own `express.json({ limit: "16kb" })`** — an 80 MB login body is a free DoS |
| 16 | Logging | Log auth events (signup, login, fail, lockout, reuse-detected) with userId + IP. **Never** log tokens, codes, or passwords |
| 17 | Session hygiene | Revoke all sessions on password reset; email the user on password change and on reuse-detection |
| 18 | Dependencies | `argon2`, `jsonwebtoken`, `google-auth-library`, `@prisma/client`, `helmet`, `cookie-parser` — pin them, run `npm audit` before we hand out the URL |
| 19 | Email content | OTP emails contain the code and nothing clickable that authenticates. State the purpose, the expiry, and "ignore this if it wasn't you" |
| 20 | Prisma | Parameterized by construction — no raw SQL interpolation anywhere in auth code |

---

## 10. Performance

**Budgets**
| Metric | Target |
|---|---|
| Auth page LCP | < 1.2s on 4G |
| `/login`, `/signup` p95 | < 400ms (argon2 dominates; measured ~7ms/verify locally at m=19456, expect 20–40ms on a small vCPU) |
| `/refresh` p95 | < 60ms |
| `/me` p95 | < 40ms |
| Auth bundle (JS, gzipped) | < 60kB |
| Perceived login → app | < 1s |

**Techniques**
- **Bootstrap in one round trip:** `/refresh` returns the user object alongside the access token — no separate `/me` call on boot.
- **Code-split** the auth + onboarding routes out of the builder bundle. Testers who never log out should not pay for auth code; conversely a first-time visitor shouldn't download the whole builder before seeing a login form.
- **Preconnect** to `accounts.google.com` and the API origin in `index.html`.
- **Lazy-load** the GIS script on first paint of the auth screen, not in `main.tsx`.
- **Proactive refresh** at T-60s while the tab is visible → the user never waits on a 401→refresh→retry chain.
- **Prefetch** the builder chunk while the user is on onboarding step 3 — by the time they finish, the app is already parsed.
- **DB indexes:** `User.email`, `Session.refreshTokenHash` (unique), `Session.familyId`, `OtpCode(userId, purpose)`. Every hot auth query must be a single indexed lookup.
- **Connection pooling:** use a pooled Postgres URL (PgBouncer/Neon pooler). A cold Prisma connection per request will dominate every number above.
- **Argon2 is CPU- and memory-bound** — `@node-rs/argon2` runs off-thread so it does not block the event loop, but each in-flight verify holds `memoryCost` bytes. At m=19456 that is 19 MiB per concurrent login; size the instance for peak concurrent logins, not for a single hash. Re-measure under concurrency before changing the parameters.
- **Optimistic navigation:** on submit, start the route transition immediately and render the destination skeleton while the request is in flight.
- Onboarding `PATCH` calls are fire-and-forget — never make the user wait on a step save.

---

## 11. Edge cases

| # | Case | Expected behaviour |
|---|---|---|
| 1 | Signup with an email that exists and is verified | Generic success + "someone tried to sign up" email. No enumeration |
| 2 | Signup with an email that exists but is unverified | Overwrite password, resend OTP, continue to `/verify` |
| 3 | Signs up with password, later clicks Google (same email) | Link accounts silently (Google verified the email). Now `providers: ["password","google"]` |
| 4 | Signs up with Google, later tries email+password login | `INVALID_CREDENTIALS` + UI hint "You signed up with Google", Google button highlighted |
| 5 | Google user wants a password | `POST /set-password` (bearer-auth'd), no current-password required since they never had one |
| 6 | Google `email_verified: false` | Reject. Do not create or link an account |
| 7 | Two Google accounts, same person | Two `providerUserId`s, different emails → two users. Expected. Account merging is out of scope |
| 8 | Google popup blocked / in-app webview | Auto-fall back to the redirect flow (§6.3d) |
| 9 | User closes the Google popup | Silent no-op. No error toast |
| 10 | OTP expired | `OTP_EXPIRED` → inline "Code expired" + a live Resend button |
| 11 | 6 wrong OTP attempts | Invalidate the code, force a resend, 60s cooldown |
| 12 | Resend spammed | 60s cooldown client + server; 5/hour hard cap → `RATE_LIMITED` with `retryAfterSec` shown as a countdown |
| 13 | Refresh on the `/verify` screen | Restore `pendingEmail` from sessionStorage; if absent, bounce to `/login` with an explanatory message |
| 14 | Verifies in a second tab | First tab's poll/focus handler notices via `/me` and moves on. Or accept the stale tab — do **not** show an error |
| 15 | Two tabs refresh simultaneously | 5-second rotation grace window (§4.3) — the loser gets the replacement token, not a logout |
| 16 | Laptop sleeps 3h, wakes | `visibilitychange` triggers a refresh before queued requests fire |
| 17 | Refresh token stolen and replayed | Reuse detection kills the whole family, both parties are logged out, user is emailed |
| 18 | User clicks "log out" in one tab | Broadcast via `BroadcastChannel("auth")` so every tab clears state at once |
| 19 | Password reset while logged in elsewhere | All sessions revoked. Other tabs land on `/login` at their next refresh |
| 20 | Reset ticket reused | `jti` already consumed → reject, send them back to `/forgot-password` |
| 21 | Reset OTP requested for a Google-only account | "Sign in with Google" email, generic UI response |
| 22 | Same email in different cases (`A@x.com` / `a@x.com`) | Normalize to lowercase on write and lookup — one account |
| 23 | Gmail dots / `+tag` | Normalize **only** for the duplicate check; store and email the address as typed |
| 24 | Disposable-email domains | Blocklist maintained but **log-only at launch** — flip to blocking only if abuse shows up in the metrics. False positives cost real signups |
| 25 | Email delivery fails (SMTP down) | Signup still succeeds; return `{ next:"verify_email", emailDelayed:true }` and show "Taking longer than usual — resend". Never roll back the account |
| 26 | Email lands in spam | Verify screen carries "Check your spam folder" copy after 30s. Set SPF/DKIM before the test round |
| 27 | Onboarding abandoned at step 3 | `currentStep: 3` persisted → next login resumes at step 3 |
| 28 | Onboarding step save fails | Keep the answer client-side, retry on `complete`. Never block |
| 29 | Onboarding completed twice (double-click) | Idempotent — `completedAt` set once, second call returns ok |
| 30 | Anonymous user with 12 localStorage projects signs up | Claim flow (§6.8). Nothing is lost |
| 31 | Two people share one laptop | Projects are server-side and owner-scoped, so nothing leaks. On logout, clear the in-memory token, the user cache, and any localStorage read-cache (persistence doc §15.3) |
| 32 | Deep link while logged out (`/#builder?project=x`) | Redirect `/login?next=%2F%23builder%3Fproject%3Dx`, restore after login (validate it's same-origin) |
| 33 | Access token expires mid-build (long LLM call) | The pipeline route is bearer-authed; the interceptor refreshes and replays. Ensure replay works for streaming/`POST /api/build` too — **test this explicitly**, it's the one endpoint where a silent retry could double-charge an OpenAI call. Make build submissions idempotent with a client-generated `requestId` |
| 34 | Clock skew on the client | Never compare `exp` against client time for auth decisions; use it only for the proactive-refresh heuristic with a 60s buffer |
| 35 | Slow 3G, user double-taps "Sign in" | Button disabled while in-flight; server-side, a duplicate signup returns the same generic result |
| 36 | User hits Back after logout | Guard renders `/login`; also `Cache-Control: no-store` on all `/api/auth` responses |
| 37 | Browser blocks third-party cookies | Irrelevant if the API is same-site (§4.4). This is why that decision matters |
| 38 | Locked account (10 fails) then correct password | `ACCOUNT_LOCKED` with a countdown, not `INVALID_CREDENTIALS` — otherwise they'll reset a password they already knew |
| 39 | Email typo at signup (`gnail.com`) | Client-side domain-typo suggestion: "Did you mean gmail.com?" before submitting |
| 40 | Onboarding theme choice vs system theme | The explicit choice wins and persists to `OnboardingProfile.themePref`; expose it later in settings |

---

## 12. Build plan — file by file

### 12.1 Backend
```
backend/
  prisma/
    schema.prisma                    § 3
    migrations/
  src/
    db/
      client.ts                      singleton PrismaClient (avoid tsx-watch connection leaks)
    auth/
      passwords.ts                   hash / verify / policy check / common-password list
      tokens.ts                      signAccess, verifyAccess, mintResetTicket, verifyResetTicket
      sessions.ts                    create / rotate / revoke / revokeFamily / reuse detection
      otp.ts                         generate / hash / verify / attempt + cooldown accounting
      google.ts                      verifyIdToken + findOrCreateOrLink
      cookies.ts                     setRefreshCookie / clearRefreshCookie (env-aware Secure)
      rateLimit.ts                   shared limiter (extract from routes/leads.ts), keyed by ip|account
      emails.ts                      OTP / welcome / password-changed / security-alert templates
                                     → built on the existing lib/smtpMailer.ts
    middleware/
      requireAuth.ts                 bearer → req.user, 401 with SESSION_EXPIRED
      requireVerified.ts             gate for endpoints needing a verified email
      errorHandler.ts                { ok:false, error:{ code, message } } shape
    routes/
      auth.ts                        all endpoints in § 5
      onboarding.ts                  PATCH /step, POST /complete
    schemas/
      auth.schema.ts                 zod for every body
  .env.example                       + the new vars in § 13
```
`server.ts` changes:
```ts
app.set("trust proxy", 1);
app.use(helmet());
app.use(cors({ origin: FRONTEND_ORIGIN, credentials: true,
               allowedHeaders: ["Content-Type","Authorization","X-Requested-With"] }));
app.use(cookieParser());
app.use("/api/auth", express.json({ limit: "16kb" }), authRouter);   // BEFORE the 80mb parser
app.use(express.json({ limit: "80mb" }));
// then existing routers, with requireAuth applied to build/edit/ask/upload
app.use(errorHandler);
```

### 12.2 Frontend — routing decision

There is no router today; views are hash-based (`#home`/`#builder`/`#gallery`). Email links and shareable auth URLs need real paths.

**Recommended:** add `react-router-dom@7` and wrap the app:
```
/login /signup /verify /forgot-password /reset-otp /reset-password   → public
/onboarding                                                          → authed
/*  → <ChatApp/>  (keeps its existing #home/#builder/#gallery hash behaviour untouched)
```
This is additive — `ChatApp` and `useAppViewSync` keep working exactly as they do now. Production hosting needs a catch-all rewrite to `index.html` (Vercel `rewrites`, Netlify `_redirects`, or nginx `try_files`). `preview.html` and `gallery.html` stay as separate entries and must be excluded from the rewrite.

*Alternative if you want zero new deps:* extend `appView.ts` with auth views and use hash routes (`#login`). Cheaper now, but email links become `https://app.../#reset-otp` — uglier, and some email clients mangle fragments. **Take the router.**

```
frontend/src/
  auth/
    AuthProvider.tsx           context: user, accessToken (memory), status, login/logout/refresh
    useAuth.ts
    RequireAuth.tsx            the three gates in § 6.7 + skeleton while loading
    authApi.ts                 typed wrappers over every § 5 endpoint
    broadcast.ts               BroadcastChannel("auth") cross-tab sync
  lib/
    apiClient.ts               ★ single fetch wrapper: bearer + 401 single-flight refresh + retry-once
                               → then migrate the 13 existing bare fetch() call sites onto it
    projectStorage.ts          ← namespace keys by userId, add claim/migrate helper (§ 6.8)
  pages/auth/
    LoginPage.tsx  SignupPage.tsx  VerifyEmailPage.tsx
    ForgotPasswordPage.tsx  ResetOtpPage.tsx  ResetPasswordPage.tsx
  pages/onboarding/
    OnboardingFlow.tsx         step state machine + persistence + history
    steps/StepStyle.tsx  StepName.tsx  StepRole.tsx  StepCompanySize.tsx
    SubmittingScreen.tsx
  components/auth/
    AuroraBackground.tsx       the gradient shell (§ 8.1) — used by auth + onboarding
    AuthCard.tsx  GoogleButton.tsx  OtpInput.tsx  PasswordField.tsx
    PasswordStrengthMeter.tsx  ProgressDots.tsx  OptionCard.tsx  FormError.tsx
  hooks/
    useCountdown.ts            resend timers
    useGoogleIdentity.ts       lazy-load GIS, popup + redirect fallback
```

### 12.3 Ordering (each step is independently shippable)
1. **DB + Prisma** — schema, migration, `db/client.ts`, connect to a hosted Postgres. Verify with a scratch query.
2. **Password auth backend** — signup/verify/login/refresh/logout/me + sessions + OTP + emails. Test with curl only.
3. **Frontend auth shell** — `AuthProvider`, `apiClient`, router, `RequireAuth`, `/login` + `/signup` + `/verify`. Now a human can sign up.
4. **Google auth** — console setup, `useGoogleIdentity`, `/api/auth/google`, linking.
5. **Forgot password** — three screens + three endpoints.
6. **Onboarding** — the 4 steps, persistence, gate, theme application.
7. **Protect the app** — `requireAuth` on `/api/build`, `/api/edit`, `/api/ask`, `/api/upload`; migrate frontend fetch call sites; project claiming.
8. **Polish + hardening** — motion, a11y pass, rate limits, helmet, security-review pass, load-test `/login`.

---

## 13. Environment variables

```bash
# backend/.env  (append to the existing file)
DATABASE_URL=postgresql://user:pass@host:5432/prowplus?sslmode=require&connection_limit=10

JWT_ACCESS_SECRET=          # 32+ random bytes:  openssl rand -base64 48
JWT_RESET_SECRET=           # DIFFERENT value from the above
ACCESS_TOKEN_TTL=15m
REFRESH_TOKEN_TTL_DAYS=30

GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=       # only needed for the redirect/code fallback
GOOGLE_REDIRECT_URI=http://localhost:4000/api/auth/google/callback

APP_URL=http://localhost:5173      # for links inside emails
COOKIE_DOMAIN=                     # blank in dev; ".prowplus.com" in prod
NODE_ENV=development

# OTP / limits
OTP_TTL_MINUTES=10
OTP_MAX_ATTEMPTS=5
OTP_RESEND_COOLDOWN_SEC=60
LOGIN_MAX_ATTEMPTS=10
LOGIN_LOCKOUT_MINUTES=15

# EMAIL_FROM / SMTP_* already exist — reuse them
```
```bash
# frontend/.env
VITE_GOOGLE_CLIENT_ID=      # same value as GOOGLE_CLIENT_ID
```
Boot-time guard: fail loudly if `JWT_ACCESS_SECRET`, `JWT_RESET_SECRET`, or `DATABASE_URL` is missing, or if the two secrets are equal.

---

## 14. Google Cloud Console setup

1. Cloud Console → **APIs & Services → OAuth consent screen** → External → app name, support email, logo, Terms + Privacy URLs.
2. Scopes: `openid`, `email`, `profile`. Nothing more — extra scopes trigger verification review and scare users.
3. **Credentials → Create OAuth client ID → Web application.**
4. **Authorized JavaScript origins** (required for GIS): `http://localhost:5173`, plus the production app origin.
5. **Authorized redirect URIs** (only for the code-flow fallback): `http://localhost:4000/api/auth/google/callback` + prod equivalent.
6. While in "Testing" mode, add every tester's Gmail address as a test user — otherwise they hit "app not verified". Publish before a wider round.
7. Copy the client ID into both `backend/.env` and `frontend/.env`.

---

## 15. Test plan

**Backend unit (vitest — the repo already runs it):** password policy, argon2 round-trip, OTP hash/verify/attempt-exhaustion/expiry, JWT sign+verify+tamper rejection, session rotation, **reuse detection kills the family**, rotation grace window, Google payload validation (bad `aud`/`iss`/`exp`/`nonce`/`email_verified`), rate limiter windows, email normalization.

**Integration (supertest against a test DB):** full signup→verify→login→refresh→logout; reset flow end-to-end; Google new-user vs link-existing; enumeration responses identical for existing vs missing emails; lockout after 10 fails; 80mb-body rejection on `/api/auth`.

**Manual E2E (record the pass/fail in `TRACKING.md`):**
- Signup → OTP → onboarding → builder, on Chrome + Safari + iOS Safari + Android Chrome.
- One-click Google signup for a brand-new Google account (should be: 1 click + 3 taps to the builder).
- Google login for an account that already exists with a password (linking).
- Refresh the page on every single screen — nothing should be lost.
- Kill the network mid-onboarding, restore it, complete — answers survive.
- Two tabs: log out in one, verify the other reacts.
- Leave a tab idle 20 minutes, then act — no visible re-auth.
- Anonymous project → signup → project still there.
- Reset password, confirm other devices are logged out.

**Launch gate:** `/security-review` on the auth diff · `npm audit` clean · SPF/DKIM/DMARC configured and verified against Gmail + Outlook so OTP mail doesn't land in spam · load-test `/login` at expected peak (argon2 is the bottleneck) · confirm the Redis limiter works with more than one instance running.

---

## 16. Open questions

1. ~~Server-side `Project` table vs. namespaced localStorage?~~ **Resolved: server-side, production-grade.** See [`PROJECT-PERSISTENCE-PLAN.md`](./PROJECT-PERSISTENCE-PLAN.md). Auth ships first; the import endpoint lands with the persistence work (§6.8).
2. **Invite-only or open signup at launch?** An invite-code field on `/signup` is ~1 hour and keeps OpenAI spend predictable during the first cohort. Recommendation: add it, gated by an env flag.
3. ~~Per-user rate limits on `/api/build`?~~ **Resolved: yes.** Quotas and per-user cost accounting are specified in the persistence doc §13.
4. **Do we need onboarding answers to change product behaviour** (e.g. `role: designer` → default to a different page family), or is it segmentation only? Affects nothing structurally, but decide before we write the copy.
5. **Deploy target** — decides the cookie strategy in §4.4. Settle it before writing the cookie helper; a cross-site API origin would force `SameSite=None` and put us at the mercy of third-party-cookie blocking.


---

## 17. Implementation status

### Built and verified
| Area | Files | Notes |
|---|---|---|
| Prisma schema + migration | `backend/prisma/schema.prisma`, `prisma/migrations/20260820000000_init_auth/` | `User`, `OAuthAccount`, `Session`, `OtpCode`, `ResetTicket`, `OnboardingProfile`. Migration SQL generated offline; not yet applied to a database |
| Env validation | `src/config/env.ts` | Fails at boot on a missing/short/duplicated secret — verified |
| DB client | `src/db/client.ts` | Prisma 7 + `@prisma/adapter-pg`, globalThis singleton so `tsx watch` cannot exhaust the pool |
| Passwords | `src/auth/passwords.ts` | argon2id, policy, timing-equalising fake verify |
| Email identity | `src/auth/email.ts` | normalize / dedupe / mask |
| Tokens | `src/auth/tokens.ts` | HS256 pinned, separate reset secret, jti |
| Sessions | `src/auth/sessions.ts` | Rotation, reuse detection, grace window, absolute lifetime cap |
| OTP | `src/auth/otp.ts` | Hashed codes, attempt + cooldown + hourly caps |
| Google | `src/auth/google.ts` | Full claim verification incl. nonce and `email_verified` |
| Emails | `src/auth/emails.ts` | Six templates on the existing SMTP transport |
| Rate limiting | `src/auth/rateLimit.ts` | `RateLimiter` interface + memory driver |
| Routes | `src/routes/auth.ts`, `src/routes/onboarding.ts` | All 16 endpoints from §5 |
| Middleware | `src/middleware/requireAuth.ts`, `errorHandler.ts` | Session-liveness check on every request |
| Server wiring | `src/server.ts` | helmet, trust proxy, CORS credentials, 16kb auth body limit, maintenance sweep |
| Tests | `src/auth/*.test.ts` | 43 new tests; full suite 247 passing |

### Deviations from the spec above, and why
1. **`@node-rs/argon2` instead of `argon2`** — prebuilt binaries, no node-gyp on the deploy box. Measured ~7ms/verify at m=19456 (see §10).
2. **`User.emailKey` column added** — the spec described Gmail dedupe but stored only `email`. A folded key with its own unique index is the only way to enforce it at the database level rather than in application code that can be bypassed.
3. **`Session.familyStartedAt` and `revokedReason` added** — a rolling 30-day session with no absolute cap never expires; `familyStartedAt` carries the family's origin forward so the 90-day ceiling is enforceable. `revokedReason` makes support questions answerable.
4. **`ResetTicket` table added** — the spec said "store jti in a consumed-set" without saying where. A table with a conditional update is the single-use guard.
5. **No redundant `@@index([email])` on `User`** — `@unique` already creates one; a duplicate index only costs write throughput.
6. **Rate limiting is Redis-*ready*, not Redis-*backed*** — the interface and memory driver are built. **A Redis driver must be added before running more than one instance**, or per-account lockouts are divided by the instance count.

### Frontend — built and verified
| Area | Files | Notes |
|---|---|---|
| API client | `src/lib/apiClient.ts` | Bearer injection, **single-flight** refresh, retry-exactly-once, network-error normalization |
| Session state | `src/auth/AuthProvider.tsx`, `useAuth.ts` | Token in closure (never React state, never localStorage), proactive refresh at T-60s, refresh on tab wake |
| Cross-tab sync | `src/auth/broadcast.ts` | `BroadcastChannel` — sign out in one tab, every tab follows |
| Typed API | `src/auth/authApi.ts`, `types.ts` | `ApiError` carrying stable codes + `retryAfterSec` / `attemptsRemaining` |
| Route guards | `src/auth/RequireAuth.tsx` | Three gates in order, skeleton while loading (no auth flicker), `safeNextPath` open-redirect guard |
| Google | `src/auth/useGoogleIdentity.ts`, `components/auth/GoogleButton.tsx` | Lazy GIS load, popup flow, nonce per attempt, graceful degradation when the script is blocked |
| Auth screens | `src/pages/auth/*` | Login, Signup, Verify, Forgot, Reset code, Reset password |
| Onboarding | `src/pages/onboarding/OnboardingFlow.tsx` | Four steps per the reference, per-step persistence, resume, Google name prefill, live theme apply |
| Components | `src/components/auth/*` | Aurora shell, pill fields, password reveal + Caps Lock, strength meter, 6-box OTP, progress dots, option cards |
| Router | `src/App.tsx` | react-router v7, every auth route lazy-loaded |

Measured bundle (gzipped): Login 1.29 kB · Signup 1.67 kB · Verify 1.20 kB · Onboarding 3.41 kB — all split out of the 117 kB builder chunk, comfortably inside the 60 kB budget in §10.

### Not yet built
- Google redirect/auth-code fallback (`/google/start`, `/google/callback`) — the GIS popup path is complete and degrades to hiding the button when the script is blocked.
- Applying `requireAuth` to `/api/build`, `/api/edit`, `/api/ask`, `/api/upload`. **Deliberately deferred**: enabling it before a session exists would break the running app. Turn it on in the same change that ships auth.
- Redis rate-limit driver (required before running more than one instance).
- Migrating the ~13 existing bare `fetch("/api/…")` call sites onto `apiClient`. They work untouched today because the pipeline routes are still unauthenticated; they must move before the routes are protected.

### Known pre-existing issue, not introduced here
`frontend/src/components/shell/SectionPickerPopover.tsx` is an **untracked** work-in-progress file that imports `@/lib/sectionPicker`, which does not exist. It is not referenced by any other module, so `vite build` succeeds — but `npm run build` runs `tsc -b` first and **fails on it**. Either finish or delete that file to unblock the production build. Left in place because it is someone's in-progress work, not ours to discard.

### Deploy note
`react-router` needs a catch-all rewrite to `index.html` (Vercel `rewrites`, Netlify `_redirects`, nginx `try_files`), or a hard refresh on `/login` returns 404. **Exclude `preview.html` and `gallery.html`** — they are separate Vite entry points and must not be rewritten.

### Blocked on you
| Needed | For | Where it goes |
|---|---|---|
| Neon `DATABASE_URL` + `DIRECT_DATABASE_URL` | Applying the migration; nothing can be tested end-to-end without it | `backend/.env` |
| Two secrets from `openssl rand -base64 48` | Boot | `JWT_ACCESS_SECRET`, `JWT_RESET_SECRET` |
| Google OAuth client ID | Google sign-in | `GOOGLE_CLIENT_ID` + `frontend/.env` `VITE_GOOGLE_CLIENT_ID` |
| SMTP credentials | OTP delivery (already configured for lead email) | existing `SMTP_*` vars |

Once `DATABASE_URL` is set: `cd backend && npm run db:deploy` applies the migration.
