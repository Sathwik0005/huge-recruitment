# Reusable Project Foundation Blueprint

## Instructions for Implementing Claude

Read this entire blueprint before modifying the new project. First inspect the new project's existing code and preserve existing work. Implement the documented foundation using the project name and UI supplied by the developer. Do not invent missing architecture, credentials, environment values, schema fields, or authentication behaviour. If this blueprint is genuinely ambiguous or missing information required for a technical decision, ask the developer rather than guessing.

Do not ask unnecessary questions when the answer can be derived from this blueprint or the new project's existing UI.

## Foundation Boundary

Covers: app setup → database → auth provider → Register → Verification → Login → Forgot/Reset Password → Session/Route Protection → `/`. Nothing beyond `/` (no business features) is in scope.

## Verified Stack

| Package | Version | Purpose |
|---|---|---|
| next | 16.2.10 | App Router framework. **Non-standard: uses `src/proxy.ts` (export `proxy` + `config.matcher`) instead of `middleware.ts`.** Check `node_modules/next/dist/docs/` in the target project before assuming middleware conventions. |
| react / react-dom | 19.2.4 | UI runtime |
| typescript | ^5 | Language |
| tailwindcss / @tailwindcss/postcss | ^4 | Styling (v4, CSS-first `@theme`, no `tailwind.config.js`) |
| firebase | ^12.16.0 | Client-side Auth SDK only |
| firebase-admin | ^14.2.0 | Server-side token/session verification |
| prisma / @prisma/client | ^7.9.0 | ORM; v7 config lives in `prisma.config.ts`, not `schema.prisma` |
| @prisma/adapter-neon | ^7.9.0 | Driver adapter for Neon serverless Postgres |
| server-only | ^0.0.1 | Compile-time guard preventing server modules from being imported client-side |
| dotenv, tsx | dev | Loads `.env` for `prisma.config.ts`; runs the seed script |
| eslint / eslint-config-next | ^9 / 16.2.10 | Linting |
| vitest, @testing-library/* | dev | Unit/component tests |
| @playwright/test | dev | E2E tests |

Package manager: **npm** (`package-lock.json` present). Node `>=22.12.0`.

Do not upgrade or substitute any of the above without asking. Preserve exact major versions (Next 16 App Router semantics, Tailwind v4 CSS-first config, Prisma 7 config split).

## Architecture

```
Client (Firebase Auth SDK)                Server (Next.js)
┌────────────────────────┐                ┌───────────────────────────────┐
│ register/login forms    │  idToken       │ API routes verify idToken via  │
│ createUserWithEmail...  │ ───────────►   │ firebase-admin, then:          │
│ signInWithEmailAndPass..│                │  - create/find Prisma User     │
│ signInWithPopup(Google) │                │  - mint Firebase session       │
│ sendPasswordResetEmail  │                │    cookie, set httpOnly cookie │
│ sendEmailVerification   │                └───────────────────────────────┘
└────────────────────────┘                              │
                                                          ▼
                                           src/proxy.ts (edge, cookie-presence
                                           check only) gates protected paths
                                                          │
                                                          ▼
                                           Server Components re-verify the
                                           session cookie (firebase-admin)
                                           and look up the Prisma User by
                                           firebaseUid for role/status checks
```

Firebase Auth is the credential/identity system of record (passwords, email-verification state, Google identity). Postgres/Prisma is the system of record for application user data (name, role, status) and is keyed off `firebaseUid`. The two are linked but not merged: a Firebase user can exist without a DB `User` momentarily during registration/login races (see Security).

## Auth Flow (high level)

1. Client authenticates directly against Firebase Auth SDK (register: `createUserWithEmailAndPassword`; login: `signInWithEmailAndPassword` or `signInWithPopup(GoogleAuthProvider)`).
2. Client obtains a Firebase ID token (`user.getIdToken()`) and POSTs it to a Next.js API route.
3. API route verifies the ID token server-side (`firebase-admin` `verifyIdToken`), then reads/writes the Prisma `User` row keyed by `firebaseUid`.
4. API route mints a Firebase **session cookie** (`adminAuth.createSessionCookie`, 5-day expiry) and sets it as an `httpOnly`, `secure` (prod), `sameSite=lax` cookie.
5. `src/proxy.ts` runs on every request to a protected path and checks only for the **presence** of the session cookie (no verification — verification is too heavy for the edge runtime here) and redirects to `/login` if absent.
6. Server Components/layouts that need the real identity call `getSession()` (verifies the cookie via `firebase-admin`, returns the decoded token or `null`) and then look up the Prisma `User` by `firebaseUid` for role/status.

## User Schema

Prisma model `User` (Postgres):

| Field | Type | Nullable | Unique | Default | Purpose |
|---|---|---|---|---|---|
| id | String (cuid) | no | PK | `cuid()` | Internal primary key |
| firebaseUid | String | no | yes | — | Links row to Firebase Auth identity; all lookups after login use this |
| firstName | String | no | no | — | Profile |
| lastName | String | no | no | — | Profile |
| email | String | no | yes | — | Mirrors Firebase email; DB-unique guards duplicate accounts independently of Firebase |
| role | enum `Role` (`ADMIN`, `USER`) | no | no | `USER` | Authorization |
| status | enum `UserStatus` (`ACTIVE`, `INACTIVE`) | no | no | `ACTIVE` | Account enable/disable, checked on admin routes |
| createdAt | DateTime | no | no | `now()` | Audit |
| updatedAt | DateTime | no | no | `@updatedAt` | Audit |

No password hash is stored — Firebase Auth owns credentials entirely. No email-verification flag is stored on `User`; verification state lives only on the Firebase Auth user object (`emailVerified`) and is **not currently propagated to or checked against the DB row or session** (see Known Limitation in Security).

Relations beyond `orders`/`coupons`/etc. are business-specific and out of scope.

## Database / ORM

- Provider: PostgreSQL (Neon serverless), accessed exclusively through Prisma Client — no raw driver, no second ORM.
- Prisma **v7**: datasource URL, migrations path, and seed command live in `prisma.config.ts` (NOT in `schema.prisma`), loaded via `dotenv/config`:
  ```ts
  export default defineConfig({
    schema: "prisma/schema.prisma",
    migrations: { path: "prisma/migrations", seed: "tsx prisma/seed.ts" },
    datasource: { url: process.env["DATABASE_URL"] },
  });
  ```
- `schema.prisma` generator block:
  ```prisma
  generator client {
    provider = "prisma-client"
    output   = "../src/generated/prisma"
  }
  datasource db {
    provider = "postgresql"
  }
  ```
  Generated client is emitted to `src/generated/prisma` (import as `@/generated/prisma/client`, enums as `@/generated/prisma/enums`) — not `node_modules/.prisma`.
- Client singleton (`src/lib/prisma.ts`) uses the Neon driver adapter and a `globalThis` cache to avoid exhausting connections under Next.js dev hot-reload:
  ```ts
  const adapter = new PrismaNeon({ connectionString: process.env.DATABASE_URL! });
  export const prisma = globalForPrisma.prisma ?? new PrismaClient({ adapter });
  if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
  ```
- `postinstall` runs `prisma generate` automatically.
- Migration state tracked in `prisma/migrations/` with `migration_lock.toml` pinning `provider = "postgresql"`.

## Environment Contract

```env
DATABASE_URL=

NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
NEXT_PUBLIC_FIREBASE_APP_ID=
NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=

FIREBASE_ADMIN_PROJECT_ID=
FIREBASE_ADMIN_CLIENT_EMAIL=
FIREBASE_ADMIN_PRIVATE_KEY=

NEXT_PUBLIC_APP_URL=
```

| Variable | Purpose | Exposure | Secret? |
|---|---|---|---|
| `DATABASE_URL` | Neon Postgres connection string | server-only | secret |
| `NEXT_PUBLIC_FIREBASE_*` (6 vars) | Firebase client SDK init | client-safe (`NEXT_PUBLIC_`) | non-secret (Firebase web config is public by design) |
| `FIREBASE_ADMIN_PROJECT_ID` | Admin SDK service-account project id | server-only | secret-adjacent |
| `FIREBASE_ADMIN_CLIENT_EMAIL` | Admin SDK service-account client email | server-only | secret-adjacent |
| `FIREBASE_ADMIN_PRIVATE_KEY` | Admin SDK service-account private key (`\n`-escaped; unescape with `.replace(/\\n/g, "\n")` before `cert()`) | server-only | **secret** |
| `NEXT_PUBLIC_APP_URL` | Base URL for building absolute links (e.g. email CTAs) | client-safe | non-secret |

Create `.env.local` and `.env.example` with empty values for every variable above; never invent or copy real values. `.gitignore` must exclude `.env*` while allowing `!.env.example`. If a required value is unknown, state: `I need <VARIABLE_NAME> from <SERVICE>.` and continue other work.

`next.config.ts` requires `transpilePackages: ["firebase-admin", "jwks-rsa", "jose"]` — Next does not transpile these ESM/CJS-mixed deps by default and `firebase-admin` will fail to bundle without this.

## Styling Foundation

- Tailwind v4, CSS-first config — no `tailwind.config.js`.
- `postcss.config.mjs`: `{ plugins: { "@tailwindcss/postcss": {} } }`.
- Global stylesheet imported once in the root layout: `import "./globals.css"`.
- `globals.css` starts with `@import "tailwindcss";` followed by a `@theme inline { ... }` block defining CSS custom properties (colors, fonts) consumed as Tailwind utilities (e.g. `--color-primary` → `bg-primary`/`text-primary`).
- Fonts loaded via `next/font/google` in the root layout and exposed as CSS vars (`--font-inter`, `--font-geist-mono`) referenced from `@theme inline`.
- Reproduce only this technical wiring; the actual token values/colors are project-specific presentation supplied by the developer.

## Registration

Client-driven, no server action/redirect flow — sequence in `RegisterForm` (`"use client"`):

1. Validate fields client-side: required first/last name, email regex, password policy (`validatePassword`: ≥8 chars, upper, lower, digit, special char), confirm-password match, terms-accepted checkbox.
2. Pre-check `fetchSignInMethodsForEmail(auth, email)` — if any methods exist, show "account already exists" on the email field and stop (best-effort UX check, not the real guard — see Security race-condition note).
3. `createUserWithEmailAndPassword(auth, email, password)` against Firebase.
4. `updateProfile(user, { displayName })`.
5. `user.getIdToken()` → `POST /api/users` with `{ idToken, firstName, lastName }`.
6. Route handler verifies the token (`verifyIdToken`), then `prisma.user.create({ firebaseUid, firstName, lastName, email })`. On Prisma unique-constraint violation (`P2002`) returns 409 "account already exists". This DB-level catch is the real duplicate guard; step 2 is only a UX shortcut.
7. On success, client calls `sendEmailVerification(user)`.
8. Redirect to `/verify-email`.
9. No session cookie is set during registration — the user is signed in client-side (Firebase SDK session) but has no server session cookie until they separately hit `/login` (or the login form is invoked). Confirm this is the intended new-project behaviour, or explicitly wire a cookie-setting call after step 6 if not.

Error handling: Firebase error codes mapped to user-facing strings (`email-already-in-use`, `weak-password`, `network-request-failed`, `invalid-email`, default fallback). No rollback logic exists if `POST /api/users` fails after Firebase user creation — the Firebase account persists without a DB row (Known Limitation, see Security/Edge Cases).

## Verification

Implemented, client-driven only:

- Sent via `sendEmailVerification(user)` immediately after registration (Firebase-hosted email + link).
- User lands on `/verify-email`. Page subscribes to `onAuthStateChanged`; if no Firebase user, redirects to `/register`.
- "I've Verified My Email" button calls `reload(user)` then checks `auth.currentUser?.emailVerified`; if true, `router.push("/")`; if false, shows an inline message.
- "Resend Email" re-calls `sendEmailVerification` with a 60-second client-side cooldown timer (not server-enforced).
- `/verify-email` is **not** in `proxy.ts`'s protected-path list and has no server-side guard — it is reachable by anyone with a client Firebase session.
- **No server-side enforcement**: neither `/api/auth/login`, `getSession()`, nor `requireCustomer()`/`requireAdmin()` check `emailVerified`. An unverified user who has already completed registration (DB `User` row exists) can call `/login` and pass — see Security.

## Login

Client-driven — `LoginForm` (`"use client"`):

1. Client-side required-field validation (email present, password present).
2. Password flow: `signInWithEmailAndPassword(auth, email, password)`.
   Google flow: `signInWithPopup(auth, new GoogleAuthProvider())`.
3. `user.getIdToken()` → `POST /api/auth/login` with `{ idToken, provider: "password" | "google" }`.
4. Route verifies the token (`verifyIdToken`), looks up `prisma.user.findUnique({ where: { firebaseUid } })`.
   - Password provider + no DB user → 404 "No account found... create an account first" (password users must have registered through `/register` first).
   - Google provider + no DB user → **auto-provisions** a new `User` row (`prisma.user.create`) using the Google display name split into first/last (fallback `"Google"`/`"User"`) and the Google-verified email. This is the only path where a DB user is created outside `/api/users`.
   - On Prisma `P2002` (email already used by a different Firebase UID), returns 409.
5. On success: `createSessionCookie(idToken)` (5-day expiry) → `setSessionCookie()` (httpOnly cookie) → route returns the user JSON.
6. Client: `router.push("/")` then `router.refresh()` (forces Server Components to re-read the new cookie).
7. No role/status check occurs at login — `ADMIN`/`INACTIVE` gating happens later, per-route (`requireAdmin`), not at the login boundary.

Error handling: Firebase codes mapped (`invalid-credential`/`wrong-password`/`user-not-found` → generic "Invalid email or password"; `too-many-requests`; `network-request-failed`; popup-cancelled for Google). Loading state via `submitting`/`googleSubmitting` booleans disabling both buttons during either flow.

## Forgot / Reset Password

Entirely Firebase-hosted, application-owned only for the trigger UI:

- Route: `/forgot-password`, form component `ForgotPasswordForm` (`"use client"`).
- Input: email only, required-field validation.
- Calls `sendPasswordResetEmail(auth, email)` directly — no backend route involved.
- **Anti-enumeration**: on `auth/user-not-found` or `auth/invalid-credential`, the UI still shows the generic success state (`"If an account exists for that email, we've sent a password reset link..."`), identical to the true-success path. Other errors (`invalid-email`, `too-many-requests`, `network-request-failed`) surface distinctly — this is a partial enumeration leak (invalid-email format is distinguishable from unknown-but-valid-format email) but the account-existence signal itself is masked.
- The actual reset link, reset form, and new-password submission are 100% Firebase-hosted (Firebase Auth email action handler) — not implemented in this codebase at all.
- No server route, no rate limiting beyond Firebase's own.

## Session / Logout

- Session representation: Firebase **session cookie** (not a raw ID token, not a custom JWT) — a longer-lived, revocable-by-Firebase token minted server-side via `adminAuth.createSessionCookie(idToken, { expiresIn })`.
- Cookie: name `session`, `httpOnly`, `secure` in production, `sameSite: "lax"`, `path: "/"`, `maxAge` 5 days (matches the session cookie's own `expiresIn`).
- `getSession()` (`src/lib/session.ts`): reads the cookie, calls `verifySessionCookie(cookie)` (`adminAuth.verifySessionCookie(cookie, true)` — the `true` enables revocation checking), returns the decoded token or `null` on any failure (expired, tampered, revoked).
- Logout: `POST /api/auth/logout` → `clearSessionCookie()` (deletes the cookie). Does not call Firebase Admin to revoke refresh tokens server-side; relies solely on cookie deletion. Client should also call Firebase client `signOut(auth)` to clear client-side SDK state (verify this is wired in the new project's logout trigger — not shown in the reference files inspected).
- No `AuthProvider`/React context wraps the app for client-side auth state; components needing live client auth state (e.g. `/verify-email`) call `onAuthStateChanged` directly. Server Components get identity via `getSession()` per-request.

## Route Protection

Two independent layers:

1. **Edge-level presence check** — `src/proxy.ts` (Next 16 convention; replaces `middleware.ts`):
   ```ts
   const PROTECTED_PATHS = ["/", "/admin", "/checkout", "/order-confirmed", "/orders"];
   export function proxy(request: NextRequest) {
     const hasSession = Boolean(request.cookies.get(SESSION_COOKIE_NAME)?.value);
     if (isProtectedPath(pathname) && !hasSession) return NextResponse.redirect(new URL("/login", request.url));
     return NextResponse.next();
   }
   export const config = { matcher: ["/((?!_next/static|_next/image|api|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)"] };
   ```
   Checks cookie **presence only** — no signature/expiry verification (edge runtime constraint). `api/*` is excluded from the matcher entirely; API routes must do their own auth.
2. **Server Component re-verification**, layered per route group:
   - `(storefront)` layout (`requireCustomer`): calls `getSession()` (full cryptographic verification) then loads the Prisma `User` by `firebaseUid`; returns `null` if no session or no matching DB user — but does **not** redirect. It only supplies `user` to the `Header` for conditional rendering. Actual gating for these paths is left to the proxy layer, so if a valid session cookie exists but no DB `User` row does, the page still renders (with a "logged out" header) rather than redirecting — a gap between the two layers (Known Limitation).
   - `admin` layout (`requireAdmin`): calls `getSession()`, loads the Prisma `User`, requires `role === ADMIN && status === ACTIVE`; **does redirect** — `unauthenticated` → `/login`, `forbidden` (wrong role/status) → `/`.
   - `/login`, `/register` pages: call `getSession()` and `redirect("/")` if already authenticated (prevents re-registering/re-logging-in while signed in).
   - `/forgot-password`: no auth check either direction.

Centralize any new protected-route logic through `requireAdmin`/`requireCustomer`-style helpers, not ad hoc per-page checks — the reference project already does this for admin/storefront but the pattern should be preserved deliberately, not replicated ad hoc, if a new project adds more protected groups.

## Route Matrix

| Route | Logged-out | Logged-in | Verification rule | Redirect |
|---|---|---|---|---|
| `/register` | renders | redirects | n/a | logged-in → `/` |
| `/login` | renders | redirects | none enforced | logged-in → `/`; unauthenticated stays |
| `/forgot-password` | renders | renders | n/a | none |
| `/verify-email` | client redirects if no Firebase user | renders | none server-side | no-Firebase-user → `/register` (client-side only) |
| `/` (storefront root) | proxy redirects | renders | none enforced | logged-out → `/login` |
| `/checkout`, `/order-confirmed`, `/orders` | proxy redirects | renders | none enforced | logged-out → `/login` |
| `/admin/**` | proxy redirects | renders if `role=ADMIN` & `status=ACTIVE`, else redirects | none enforced | logged-out → `/login`; wrong role/status → `/` |

## Required Utilities / Providers

| File | Role |
|---|---|
| `src/firebase/config.ts` | Client Firebase app + exported `auth` (uses `getApps()`/`getApp()` guard for HMR safety) |
| `src/firebase/admin.ts` | `"server-only"`; Admin SDK init (`cert()` from 3 env vars, `\n`-unescape on private key), exports `verifyIdToken`, `createSessionCookie`, `verifySessionCookie` |
| `src/lib/session-cookie.ts` | Single source of truth for the cookie name constant |
| `src/lib/session.ts` | `setSessionCookie` / `clearSessionCookie` / `getSession` |
| `src/lib/admin-auth.ts` | `requireAdmin()` — role/status-gated identity for admin routes |
| `src/lib/checkout/require-customer.ts` | `requireCustomer()` — session+DB identity lookup for storefront routes (non-redirecting) |
| `src/lib/password.ts` | `validatePassword()` shared client-side password policy |
| `src/lib/prisma.ts` | Prisma Client singleton with Neon adapter + HMR-safe global cache |
| `src/proxy.ts` | Edge route-protection convention for this Next version (not `middleware.ts`) |
| `src/generated/prisma/*` | Generated Prisma Client/enums output location (import path, not `node_modules`) |
| `next.config.ts` | `transpilePackages` required for `firebase-admin` to bundle |
| `prisma.config.ts` | Prisma 7 config (schema path, migrations, seed, datasource URL) |

## Security + Edge Cases

Classification: **Existing Behaviour** (verified present) / **Known Limitation** (present but incomplete) / **Recommended Hardening** (absent, desirable).

**Race conditions on unique writes** — Existing Behaviour: both `/api/users` and `/api/auth/login` catch Prisma `P2002` on the `email`/`firebaseUid` unique constraints as the real duplicate guard; the client-side `fetchSignInMethodsForEmail` pre-check is UX-only, not the guard.

**Token lifecycle** — Existing Behaviour: no app-issued tokens exist (ID token verification and session-cookie minting are both delegated to Firebase Admin SDK, which handles random generation, TTL, and revocation internally). Session cookie TTL is 5 days, fixed, not scaled by action sensitivity — Known Limitation if the new project wants shorter admin sessions.

**Enumeration resistance** — Known Limitation: `/forgot-password` masks account-existence for the "not found" case (shows generic success) but still distinguishes `invalid-email` format errors from the success path, and `/api/auth/login`'s "No account found for this email" message for password-provider logins is an explicit enumeration leak (confirms Firebase-auth-valid-but-no-DB-row state). Recommended Hardening: make the password-login "no DB user" response identical/generic to invalid-credential responses if enumeration resistance is required for the new project.

**Session/credential revocation** — Existing Behaviour: Firebase session cookies support server-side revocation and `verifySessionCookie(cookie, true)` checks revocation status on every read, so an admin-triggered "revoke all sessions" (via Firebase Admin `revokeRefreshTokens`) would take effect on next request. Known Limitation: this codebase's own logout only deletes the local cookie; it never calls `revokeRefreshTokens`, so a stolen cookie remains valid until natural expiry (5 days) even after the legitimate user "logs out" from the app's perspective.

**Third-party auth-provider identity binding** — Existing Behaviour: Google sign-in is bound to the Firebase-verified `decoded.uid` (not just email) when looked up/created in `prisma.user`. Known Limitation: linking is implicit — if a password account and a Google account share the same email but different Firebase UIDs, the Google login path's DB write will collide on the unique `email` constraint and surface as a generic 409 rather than a deliberate "link your existing account" flow; there is no explicit re-proof-of-ownership linking step.

**Ownership scoping (IDOR)** — Existing Behaviour: `requireAdmin`/`requireCustomer` derive identity from the verified session, never from client-supplied IDs, and are applied centrally at the layout level for `/admin/**` and storefront routes respectively — not ad hoc per handler.

**Transaction boundaries** — Existing Behaviour: user creation is a single atomic Prisma `create` call (inherently atomic single statement); no multi-table writes occur in the auth foundation, so no explicit `$transaction` is needed here.

**Rate-limiting strategy** — Recommended Hardening: not implemented in this codebase for `/api/auth/login` or `/api/users`. Firebase Auth applies its own throttling to credential attempts (surfaced as `auth/too-many-requests`) for client-SDK calls, but the app's own API routes have no additional per-IP/per-account rate limiting.

**Redirect/callback validation** — Existing Behaviour (trivially): the only redirects in this foundation are hardcoded literals (`/login`, `/`, `/register`, `/verify-email`) — no client-supplied redirect target is ever accepted, so open-redirect risk does not apply here.

**Email verification enforcement** — Known Limitation: verification email is sent and a `/verify-email` UI gate exists, but no server-side check (`getSession`, `requireCustomer`, `requireAdmin`, or `/api/auth/login`) ever inspects `emailVerified`. An unverified user can complete registration, then log in and reach `/` and other protected routes normally. Recommended Hardening: check `decoded.email_verified` (Firebase ID/session token claim) in `getSession()` or at login if verification must be mandatory.

**Partial-failure/rollback on registration** — Known Limitation: if `POST /api/users` fails after `createUserWithEmailAndPassword` succeeds (network error, validation error, server error), the Firebase Auth account exists with no matching DB `User`. Nothing in the codebase reconciles this; the user would need to retry, and a subsequent Google-login-style auto-provision doesn't apply to the password path (`/api/auth/login` returns 404 for password provider + no DB user, telling them to "create an account first" — but their Firebase account already exists, so `createUserWithEmailAndPassword` will now fail with `email-already-in-use`, leaving the user stuck). Recommended Hardening: either make `/api/auth/login`'s password path auto-provision like the Google path, or add a repair/retry flow.

**Provider succeeds, DB fails (login route)** — Existing Behaviour: `/api/auth/login`'s Google branch retries user creation on every login attempt if the DB row is missing, so this specific case self-heals for Google users only.

**Inactive/disabled user** — Existing Behaviour: enforced only in `requireAdmin` (`status !== ACTIVE` → forbidden). Known Limitation: `requireCustomer` and `/api/auth/login` do not check `status`, so an `INACTIVE` customer can still log in and use the storefront.

## Edge Cases (registration/login flows)

| Case | State |
|---|---|
| Duplicate email | Existing Behaviour — DB unique constraint (`P2002`) is the real guard on both `/api/users` and `/api/auth/login`; client-side pre-check is best-effort UX |
| Invalid email format | Existing Behaviour — client regex + Firebase `auth/invalid-email` mapped |
| Weak password | Existing Behaviour — `validatePassword()` client-side policy + Firebase `auth/weak-password` fallback |
| Incorrect password | Existing Behaviour — generic "Invalid email or password" (Firebase codes collapsed) |
| Nonexistent account (password login) | Existing Behaviour — collapsed into the same generic message as incorrect password |
| Unverified account | Known Limitation — see Security |
| Inactive/disabled user | Known Limitation — only checked for admin routes, see Security |
| Firebase user exists, DB user does not (password login) | Known Limitation — 404 dead-end, see Security |
| Firebase user exists, DB user does not (Google login) | Existing Behaviour — auto-provisioned |
| DB user creation fails after Firebase account created | Known Limitation — no rollback, see Security |
| Network failure | Existing Behaviour — `auth/network-request-failed` mapped to a user-facing message on all three forms |
| Verification failure/not-yet-verified | Existing Behaviour — inline message on `/verify-email`, resend with client-side cooldown |
| Password-reset failure | Existing Behaviour — Firebase error codes mapped; unknown-account case intentionally shown as success |
| Auth loading state | Existing Behaviour — per-form `submitting` (and `googleSubmitting`) booleans disable buttons and swap label text |
| Authenticated refresh | Existing Behaviour — `router.refresh()` after login forces Server Components to re-read the new cookie |
| Unauthenticated refresh on a protected route | Existing Behaviour — proxy re-checks cookie presence on every request |
| Direct protected-route navigation while logged out | Existing Behaviour — proxy redirect to `/login` |

## Implementation Order

1. Inspect new project's existing code/structure; preserve existing work.
2. Confirm stack compatibility (Next 16 App Router conventions incl. `proxy.ts`, Tailwind v4, Prisma 7, React 19).
3. Install dependencies (table above) with npm.
4. Configure global styling: `postcss.config.mjs`, `globals.css` with `@import "tailwindcss"` + developer-supplied `@theme`/design tokens.
5. Create `.env.local` + `.env.example` with the full variable contract, empty values.
6. Configure `prisma.config.ts` (schema path, migrations path, seed command, `datasource.url`) and `schema.prisma` generator/datasource blocks (custom `output` to `src/generated/prisma`); set up `src/lib/prisma.ts` singleton with the Neon adapter.
7. Add the `User` model (+ `Role`, `UserStatus` enums) exactly per the schema table above; run `npx prisma migrate dev`.
8. Configure Firebase: `src/firebase/config.ts` (client) and `src/firebase/admin.ts` (`"server-only"`, admin cert init + `verifyIdToken`/`createSessionCookie`/`verifySessionCookie`); add `transpilePackages` to `next.config.ts`.
9. Add session-cookie plumbing: `src/lib/session-cookie.ts`, `src/lib/session.ts` (`setSessionCookie`/`clearSessionCookie`/`getSession`).
10. Implement registration: `/register` page + form using developer-supplied design (or match existing project UI if none supplied); `POST /api/users` route (verify token → create User → catch `P2002`).
11. Implement verification: `sendEmailVerification` after registration; `/verify-email` page (`onAuthStateChanged` + resend cooldown + `reload`/`emailVerified` recheck).
12. Implement login: `/login` page + form (password + optional Google); `POST /api/auth/login` route (verify token → find/create-if-Google User → mint+set session cookie).
13. Implement forgot/reset: `/forgot-password` page + form (`sendPasswordResetEmail`, generic success message including "not found").
14. Implement route protection: `src/proxy.ts` with the target project's protected-path list; `requireCustomer`/`requireAdmin`-equivalent helpers in Server Component layouts as needed; logout route (`clearSessionCookie`).
15. Implement `/` — minimal authenticated landing page proving the full chain works.
16. Verify the complete flow per the checklist below.

## Commands

```bash
npm install
npx prisma generate
npx prisma migrate dev
npm run dev
npm run build
npm start
npm run lint
npm test
npm run test:e2e
```

## Verification Checklist

```text
[ ] Dependencies install
[ ] App starts (npm run dev)
[ ] App builds (npm run build)
[ ] Global CSS/Tailwind loads (theme tokens visible in rendered page)
[ ] Environment contract complete (.env.example lists every variable, empty values)
[ ] Database connects (prisma migrate dev succeeds against DATABASE_URL)
[ ] ORM generates (prisma generate produces src/generated/prisma)
[ ] User schema/migration applies cleanly
[ ] Registration works end-to-end (Firebase user + DB User row both created)
[ ] Duplicate registration handled (409, no orphan rows)
[ ] Verification email sends; /verify-email reflects real emailVerified state
[ ] Login works (password + Google if enabled)
[ ] Invalid login handled with generic error
[ ] Forgot/reset password sends email; unknown-account shows same success UI
[ ] Session cookie set httpOnly/secure(prod)/sameSite=lax with correct maxAge
[ ] Refresh behaves correctly (authenticated stays in; unauthenticated redirected)
[ ] Route protection works (proxy.ts redirects; layout-level checks enforce role/status)
[ ] Authenticated user reaches /
[ ] Logout clears the cookie and re-triggers proxy redirect on next protected nav
[ ] .env.example contains every required variable, no real values
[ ] No secrets committed
```

## Recommended Hardening

(Not implemented in the reference project — apply only if the new project's requirements call for it.)

- Enforce `emailVerified` server-side (session/login checks) if mandatory verification is required.
- Auto-provision or otherwise unblock the password-login "Firebase account exists, DB row missing" dead-end (mirror the Google path, or add a repair flow).
- Check `status === ACTIVE` in `requireCustomer`/`/api/auth/login`, not just `requireAdmin`.
- Add per-IP/per-account rate limiting on `/api/auth/login` and `/api/users` (Firebase's own throttling covers client-SDK calls only).
- Call `revokeRefreshTokens` (or equivalent) on logout/password-change if stronger session invalidation than "cookie deleted, natural 5-day expiry" is required.
- Make the password-login "no account" message generic (matches invalid-credential) if enumeration resistance is a requirement.

## Known Reference-Project Inconsistencies

- `requireCustomer()` returns `null` silently instead of redirecting; the only reason storefront routes are actually protected is the separate `proxy.ts` cookie-presence check. If a new project ever adds a protected route to `(storefront)` without also adding it to `proxy.ts`'s `PROTECTED_PATHS`, it would be unprotected server-side. Treat `proxy.ts` as the authoritative gate for this route group, not the layout.
- Password-provider registration does not set a session cookie; the user is Firebase-signed-in client-side but has no server session until a subsequent `/login`. Confirm with the developer whether the new project should set the cookie immediately after `/api/users` succeeds.
