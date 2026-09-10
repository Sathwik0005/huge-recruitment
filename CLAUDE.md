@AGENTS.md

# Project Overview

huge-recruitment is a recruitment/hiring platform. Auth foundation (registration, email verification,
login, forgot/reset password, session handling) is done, and the jobs/applications platform (spec 03)
and admin panel (spec 04) are also built — see `.claude/rules/database.md` for the current schema.
Further feature areas continue to be added incrementally via the `/create-spec` step-roadmap workflow
(see below).

This is a young, actively-growing codebase, not a rebuild. Existing auth behavior, session handling,
and page structure should be preserved unless a task explicitly authorises a change.

# Tech Stack

- **Framework:** Next.js 16.3.0 (App Router only, no `pages/` directory), React 19.2.8, TypeScript 5 (strict mode)
- **Styling:** Tailwind CSS v4, CSS-first `@theme` config in `src/app/globals.css` — no `tailwind.config.js`
- **Database:** PostgreSQL (Neon serverless) via **Prisma 7.9.1** + `@prisma/adapter-neon` — `prisma/schema.prisma` is the single source of truth; generated client output is customized to `src/generated/prisma` (import from `@/generated/prisma/client`, not `@prisma/client`)
- **Auth:** Firebase Auth — client SDK (`firebase`) for sign-up/sign-in, `firebase-admin` server-side for session-cookie verification. **Not** NextAuth, **not** a custom JWT scheme.
- **Email:** **Resend** (`src/lib/email.ts`, `src/lib/auth-email.ts`) sends every outbound email — verification, password-reset, welcome, and job-application emails. `firebase-admin` is used only to *generate* the underlying Firebase action links (`src/lib/firebase-action-link.ts`); it does not send anything itself. Not Firebase's built-in `sendEmailVerification`/`sendPasswordResetEmail` flows.
- **Validation:** Zod is used project-wide for request validation (e.g. `src/lib/validation/application.ts`), not just a transitive dependency.
- **Testing:** `vitest` and `@playwright/test` are configured — `npm run test` / `npm run test:e2e` are wired in `package.json`, and test files exist throughout `src/`.

# Project Architecture

```
src/app/
  layout.tsx, page.tsx (public homepage), globals.css
  register/{page.tsx, RegisterForm.tsx}
  login/{page.tsx, LoginForm.tsx}
  forgot-password/{page.tsx, ForgotPasswordForm.tsx}
  verify-email/page.tsx
  api/
    users/route.ts
    auth/{login,logout,session}/route.ts
src/lib/
  prisma.ts                    Prisma client singleton (Neon adapter)
  session.ts                   setSessionCookie/clearSessionCookie/getSession (server-only)
  session-cookie.ts            SESSION_COOKIE_NAME constant
  password.ts                  password-related helpers
  mint-session.ts              mints a Firebase session cookie after verified sign-in
  require-verified-session.ts  guard requiring a verified session
  firebase-error-messages.ts   maps Firebase error codes to UI messages
src/firebase/
  config.ts                    client Firebase SDK init
  admin.ts                     firebase-admin init + verifySessionCookie
src/components/LogoutButton.tsx  the one shared (non-colocated) component so far
src/generated/prisma/**        generated Prisma client output (checked into src, not node_modules)
src/proxy.ts                   Next 16's replacement for middleware.ts
prisma/schema.prisma, prisma/migrations/**, prisma/seed.ts
```

All routes are Server Components by default; `"use client"` is used only where interactivity is
required (forms, `LogoutButton`). No route groups exist yet. No `loading.tsx`, `error.tsx`, or
`not-found.tsx` exist anywhere in `src/app`.

**`src/proxy.ts`** is Next.js 16's replacement for `middleware.ts`. It currently does an **edge
cookie-presence check only** (not full session verification) and guards `/admin/**`, redirecting to
`/login` if the session cookie is absent. This is not a substitute for server-side verification —
`src/app/admin/layout.tsx` independently re-verifies the session and admin role via
`require-admin-session.ts`, and any other route/page that returns or mutates user data must do the
same via `require-verified-session.ts`/`getSession`.

# Where Things Live

- **Routes/pages** → `src/app/**` (App Router, no route groups)
- **API/route handlers** → `src/app/api/**`
- **Database client** → `src/lib/prisma.ts` (singleton Prisma client, Neon driver adapter)
- **Database schema reference (Prisma-derived, authoritative)** → `.claude/rules/database.md` (and `prisma/schema.prisma` itself)
- **Firebase client init** → `src/firebase/config.ts`; **Firebase admin/session verification** → `src/firebase/admin.ts`
- **Session cookie handling** → `src/lib/session.ts`, `src/lib/session-cookie.ts`, `src/lib/mint-session.ts`, `src/lib/require-verified-session.ts`
- **Edge route protection (presence check only)** → `src/proxy.ts`
- **Global styles/tokens** → `src/app/globals.css`

# Code Style

## Naming Conventions

- **Route folders:** lowercase/kebab-case (`forgot-password`, `verify-email`); no route groups yet.
- **Components:** PascalCase files/exports, colocated next to the page that uses them (e.g. `src/app/register/RegisterForm.tsx`) — `src/components/LogoutButton.tsx` is the one exception for genuinely shared UI.
- **Lib/util files:** kebab-case (`session-cookie.ts`, `mint-session.ts`, `require-verified-session.ts`).
- **Prisma models/enums:** PascalCase (`User`, `Role`, `UserStatus`); enum values SCREAMING_SNAKE (`ADMIN`, `ACTIVE`) — standard Prisma convention.
- **Variables/functions:** camelCase. **Types/interfaces:** PascalCase.
- Path alias `@/*` → `./src/*` (see `tsconfig.json`).
- Do not mass-rename existing files to fit a convention without an approved task.

## Styling Rules

- Tailwind utility classes are the default styling method; `src/app/globals.css` holds true global
  concerns (CSS custom properties/theme tokens via `@theme`) — not a catch-all.
- No `tailwind.config.js` exists (Tailwind v4 CSS-first config) — don't reintroduce one without approval.

# Tech Constraints

- **Prisma is the sole DB access path** — no raw `pg`/another client, and no `$queryRawUnsafe`/string-built SQL with user input; use the generated typed client or parameterized `$queryRaw`.
- **Firebase Auth is the sole auth mechanism** — no NextAuth, no custom JWT scheme, no parallel session system alongside Firebase's session cookie.
- **Resend is the sole email mechanism** — no nodemailer or a second provider without explicit approval.
- Do not add another CSS framework, UI kit, ORM, or state-management library without asking first.

# Setup & Run Commands

```bash
npm install
npm run dev      # start dev server
npm run build    # production build (also runs TypeScript checking)
npm start        # run production build
npm run lint     # ESLint
```

`npm run test` (Vitest) and `npm run test:e2e` (Playwright) are configured and runnable. Copy
`.env.example` to `.env.local` and fill in real values before running `dev`/`build`. Current variables
(names only): `DATABASE_URL`, `NEXT_PUBLIC_FIREBASE_API_KEY`, `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`,
`NEXT_PUBLIC_FIREBASE_PROJECT_ID`, `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET`,
`NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`, `NEXT_PUBLIC_FIREBASE_APP_ID`,
`NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID`, `FIREBASE_ADMIN_PROJECT_ID`, `FIREBASE_ADMIN_CLIENT_EMAIL`,
`FIREBASE_ADMIN_PRIVATE_KEY`, `NEXT_PUBLIC_APP_URL`, `RESEND_API_KEY`, `RESEND_FROM_EMAIL`,
`RESEND_ADMIN_NOTIFICATION_EMAIL`, `BLOB_READ_WRITE_TOKEN`, `UPSTASH_REDIS_REST_URL`,
`UPSTASH_REDIS_REST_TOKEN`.

**Whenever a new secret or env var is introduced**, add its name (no value) to `.env.example` in the
same change, and explicitly tell the user they need to add the real value to their local `.env.local`
(never write real secret values into `.env.example`, `CLAUDE.md`, or any other tracked file).

# Feature Workflow

Features are tracked as a step-numbered roadmap, not a bug backlog:

- `/create-spec <step> <feature-name>` — creates `.claude/specs/<step>-<slug>.md` and a `feature/<slug>` branch off `main`.
- `/test-feature <step>-<slug>` — runs the 4-stage pipeline: `test-writer` → `test-runner` → `e2e-test-writer` → `e2e-test-runner`.
- `/code-review-feature <step>-<slug>` — runs `security-reviewer` and `quality-reviewer` in parallel against the diff.
- `/commit` — commits as `"Implemented Spec <step> - <description>"`, pushes, and waits for PR merge confirmation before cleaning up the branch.

# Project Tracker

| Area | Type | Status | Notes |
| --- | --- | --- | --- |
| Register / verify-email / login / forgot-password | Pages | Done (foundation) | Firebase-backed; see `PROJECT_FOUNDATION_BLUEPRINT.md` for original scope |
| `/` (public homepage) | Page | Done | Public marketing homepage (spec 02); Header/Footer render site-wide from `src/app/layout.tsx` |
| Session handling | Cross-cutting | Done (foundation) | `src/lib/session.ts` + `src/firebase/admin.ts` |
| Route protection | Cross-cutting | Done | `src/proxy.ts` guards `/admin/**` (edge presence-check) plus server-side re-verification via `require-admin-session.ts` in `src/app/admin/layout.tsx` |
| Test infrastructure (Vitest/Playwright config) | Cross-cutting | Done | `npm run test` / `npm run test:e2e` configured and wired |
| Jobs / applications | Feature area | Done (spec 03) | Public `/jobs`, `/jobs/[slug]`, guest applications with CV upload — see `.claude/rules/database.md` |
| Admin/recruiter role & dashboard | Feature area | Done (spec 03/04) | `/admin/**` (dashboard, candidates, jobs, clients, analytics), gated by `Role`/`UserStatus` via `require-admin-session.ts` |

# Warnings & Things to Avoid

- Do not expose secrets or server-only code (`src/lib/prisma.ts`, `src/firebase/admin.ts`, `DATABASE_URL`, `FIREBASE_ADMIN_PRIVATE_KEY`) to client components — only `NEXT_PUBLIC_*` values may reach the browser.
- Do not trust a client-supplied `firebaseUid`/`email`/`id` for authorization — always derive identity from `verifySessionCookie`/the verified session cookie.
- Do not treat `src/proxy.ts` as sufficient route protection — it only checks cookie presence, not validity.
- Avoid unnecessary new dependencies or parallel implementations (e.g. do not add a second auth, DB, or email pattern alongside Firebase/Prisma).
- Avoid large rewrites when a focused, scoped change is sufficient.
- Keep documented facts and unverified assumptions clearly separated in any future notes.
