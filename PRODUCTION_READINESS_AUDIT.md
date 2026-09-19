# HUGE RECRUITMENT — PRODUCTION READINESS AUDIT

**Audit type:** Read-only. No files were modified, no packages installed, no migrations run, no build/lint executed. All findings below are sourced from direct inspection of the repository (via 5 parallel read-only research passes covering build/env/secrets, SEO/metadata, auth/API security, database/email/privacy, and performance/accessibility/errors).

**Important housekeeping note:** `CLAUDE.md` (the project's own doc) is stale in several places versus the actual code:

- It says no test scripts exist — `package.json` now has `"test": "vitest"` and `"test:e2e": "playwright test"`, and test files exist under `src/`.
- It says emails are sent via "Firebase's own built-in flows" — the actual code sends all verification/reset/welcome/application emails via **Resend** (`src/lib/email.ts`, `src/lib/auth-email.ts`); Firebase Admin is only used to _generate_ the action links.
- It says `src/proxy.ts`'s `PROTECTED_PATHS` is empty — it actually protects `/admin/**`.
- It says Jobs/candidates/admin features are "Not started" — they are substantially built (`src/app/jobs/**`, `src/app/admin/**`, `src/app/employers`, `src/app/sectors`, `src/app/contact-us`).

None of this is a defect in the app — it's a documentation drift issue worth fixing separately so future audits/agents aren't misled.

---

## 1. Executive Summary

The application's **engineering fundamentals are strong**: authentication, session handling, admin route gating, rate limiting, API input validation, file-upload verification, and database transaction/race-condition handling are all well implemented — better than a typical "auth-foundation Step" project. Domain/URL hygiene in application code is clean (no hardcoded localhost/vercel.app in production code paths; everything correctly reads `NEXT_PUBLIC_APP_URL`).

However, the site is **not yet production-ready from an SEO and hardening standpoint**: there is no sitemap, no robots.txt, no structured data (JobPosting schema, despite the schema having every field needed), no Open Graph/Twitter card images, no site-wide HTTP security headers (CSP/HSTS/X-Frame-Options/Referrer-Policy/Permissions-Policy), and no root-level 404/error page. These are all real gaps for a public-facing recruitment site whose core value (job pages) depends on search visibility.

Nothing found rises to "the app is broken" — the gaps are pre-launch hygiene items, not functional defects.

---

## 2. Current Architecture

- **Framework:** Next.js 16.3.0, App Router only, React 19.2.8, TypeScript 5 (strict mode)
- **Styling:** Tailwind CSS v4, CSS-first `@theme` config, no `tailwind.config.js`
- **Database:** Neon serverless Postgres via Prisma 7.9.1 + `@prisma/adapter-neon`; client output at `src/generated/prisma`
- **Auth:** Firebase Auth (client SDK + firebase-admin for session-cookie verification); session cookie is `httpOnly`, `secure` in prod, `sameSite: lax`, 5-day expiry
- **Email:** **Resend** (not Firebase's built-in flows, despite CLAUDE.md) — verification, password reset, welcome, and application-confirmation emails; Firebase Admin only mints the action links
- **File storage:** Vercel Blob (`@vercel/blob`) for candidate CVs — serverless-safe, no local filesystem writes
- **Rate limiting:** Upstash Redis (`@upstash/ratelimit` + `@upstash/redis`) — covers applications, CV upload, verification email, forgot-password, verification-complete
- **Validation:** Zod is now genuinely used (contra CLAUDE.md's "transitive only" claim) for the guest job-application schema
- **Route protection:** `src/proxy.ts` (edge cookie-presence check) protects `/admin/**`; `src/lib/require-admin-session.ts` does the real server-side verification (session + `email_verified` + DB role/status check) in `src/app/admin/layout.tsx`
- **Feature surface (built):** register/login/forgot-password/verify-email, public homepage, `/jobs` listing + `/jobs/[slug]` detail, `/sectors`, `/employers`, `/contact-us`, `/privacy-policy`, `/terms-of-service`, `/admin` (dashboard, candidates, jobs, clients, analytics), guest job applications with CV upload
- **No cron jobs, no webhooks, no OAuth/social login, no analytics/GA/GTM/Clarity configured anywhere.**

---

## 3. Production Readiness Score

| Category                 | Score /100 | Why                                                                                                                                                  |
| ------------------------ | ---------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| Build/Deployment         | 70         | Minimal but functional `next.config.ts`; no `vercel.json`; stray untracked `prisma.zip` at repo root; build/lint not executed in this read-only pass |
| SEO (overall)            | 25         | Metadata thin on most pages, no per-page robots directives, no canonical fallback                                                                    |
| Sitemap                  | 0          | Missing entirely                                                                                                                                     |
| Robots.txt               | 0          | Missing entirely                                                                                                                                     |
| Metadata                 | 30         | Titles present on some pages, no descriptions/OG/Twitter/metadataBase anywhere                                                                       |
| Structured Data          | 0          | No JSON-LD anywhere despite schema supporting JobPosting fully                                                                                       |
| Security (headers/CSRF)  | 55         | No CSP/HSTS/X-Frame-Options/Referrer-Policy/Permissions-Policy anywhere                                                                              |
| Authentication           | 85         | Strong: cookie config, admin gating, anti-enumeration, rate limiting                                                                                 |
| Database                 | 85         | Well-normalized, transaction-safe, indexed; a couple of items need verification (migrations checked in, isPrimary invariant transaction)             |
| Email                    | 75         | Functionally solid and safe; SPF/DKIM/DMARC is an external DNS task, not verifiable in-repo                                                          |
| Environment Variables    | 80         | Complete `.env.example`, no leaked secrets; a few dead/unused vars (Cloudinary) to clean up                                                          |
| Performance              | 55         | No `next/image` usage anywhere — real Core Web Vitals/LCP cost on marketing pages                                                                    |
| Accessibility            | 75         | Good patterns sampled (labels, aria-live, alt text); not exhaustively audited across all pages                                                       |
| Privacy/GDPR (technical) | 70         | Good data minimization and admin gating; no candidate self-service access/deletion path yet                                                          |
| Error Handling           | 65         | Excellent at the API layer; no root-level `not-found.tsx`/`error.tsx`                                                                                |

**Overall weighted score: 64/100 — GO WITH CONDITIONS** (see Section 22).

---

## 4. CRITICAL BLOCKERS

None found that would make the site non-functional or unsafe to launch. The items below are **launch-blocking from an SEO/professionalism standpoint** for a recruitment site whose business depends on job pages being found, even though they don't break functionality:

- **No sitemap** (`src/app/sitemap.ts` missing) — Google cannot efficiently discover job pages.
- **No robots.txt** (`src/app/robots.ts`/`public/robots.txt` missing) — no crawl guidance, no sitemap reference.
- **No HTTP security headers** — no CSP, HSTS, no clickjacking protection (X-Frame-Options/frame-ancestors) anywhere in `next.config.ts` or elsewhere. This is a genuine security gap for a public site collecting PII (job applications), not just a nice-to-have.
- **Confirm `NEXT_PUBLIC_APP_URL` is actually set to `https://hugerecruitment.co.uk`** in the Vercel Production environment — the code is correctly built to depend entirely on this var (no hardcoded fallback), so a missing/wrong value in Vercel breaks canonical URLs, email links, and password-reset links simultaneously.

---

## 5. HIGH PRIORITY ISSUES

1. No Open Graph / Twitter card images or metadata anywhere — sharing the site link on WhatsApp/LinkedIn/Facebook produces an unbranded, unprofessional preview.
2. No JobPosting structured data — job pages have every field needed (title, datePosted/publishedAt, validThrough/closingDate, employmentType, jobLocation, baseSalary via JobPayRate) but emit no JSON-LD, losing Google Jobs rich-result eligibility entirely.
3. Auth pages (`/login`, `/register`, `/forgot-password`, `/reset-password`, `/verify-email`, `/auth/action`) and all `/admin/**` pages have no `noindex` directive — currently indexable by default with no metadata blocking them.
4. No root-level `src/app/not-found.tsx` / `error.tsx` — only the `/jobs` subtree has these; any other route (e.g. `/admin`, `/contact-us`) falls back to Next's generic default page on error/404.
5. `next/image` is used nowhere in the codebase — 6 non-email raw `<img>` tags on high-traffic marketing pages (homepage hero/sector tiles, employers page, header, footer, reviews/hero carousels) skip automatic resizing/lazy-loading/modern-format serving, directly hurting LCP/CLS.
6. Untracked `prisma.zip` (480KB) at the repo root bundling schema/migrations/admin source — stray clutter that shouldn't ship or be mistaken for a backup source of truth; confirmed to contain only the empty `.env.example` template, not real secrets, but should be removed before deploy.
7. No candidate-facing self-service access to their own application data (view/export/delete) — a GDPR data-subject-access consideration worth a legal/product decision before or shortly after launch, given the site collects name/email/phone/location/CV.

---

## 6. MEDIUM PRIORITY ISSUES

1. Job canonical URL (`src/app/jobs/[slug]/page.tsx`) has no hardcoded production-domain fallback — if `NEXT_PUBLIC_APP_URL` is ever unset at runtime, canonical becomes `undefined` silently rather than failing loudly.
2. Closed jobs (`JobStatus.CLOSED`) remain served at 200 with no `noindex` — reasonable for UX (no dead links from shares) but means Google may keep indexing roles no longer accepting applications indefinitely; worth a deliberate decision (e.g. noindex closed jobs after some period).
3. No rate limit on `/api/auth/login` or `/api/auth/session` themselves (relies entirely on Firebase's own throttling) — low risk given Firebase's own protections, but worth confirming Firebase project abuse protection is active.
4. Rate limiter fails open silently (only a `console.error`, no alerting) if `UPSTASH_REDIS_REST_URL`/`TOKEN` are unset in production — must be verified present in Vercel env before launch, since a silent misconfiguration removes all rate limiting with no visible symptom.
5. `src/app/api/applications/route.ts` logs the raw `error` object on its catch path, inconsistent with other routes that log only `errorClass`/`errorMessage` — a minor log-hygiene inconsistency, not a confirmed PII leak.
6. Dead/unused environment variables in local `.env.local` (`BLOB_STORE_ID`, `CLOUDINARY_API_KEY/SECRET/CLOUD_NAME`) — not referenced anywhere in `src/`, leftover from an abandoned integration; should be removed to avoid confusion or accidental reintroduction of a second file-storage path.
7. No `metadataBase` set in `src/app/layout.tsx` — relative OG/canonical URLs (once added) won't resolve predictably without it.
8. No www↔apex redirect configured anywhere (`next.config.ts` has no `redirects()`) — need to pick one canonical origin (`https://hugerecruitment.co.uk`, no `www`) and redirect the other.
9. `public/` still contains unused default Next.js scaffold SVGs (`file.svg`, `globe.svg`, `next.svg`, `vercel.svg`, `window.svg`) — harmless but should be cleaned up.
10. No analytics/Search Console verification configured anywhere (expected pre-launch, but should be an explicit task before/at launch).
11. No data-retention/deletion policy or mechanism for `JobApplication` records (no soft-delete/TTL) — a privacy/GDPR technical consideration for legal review, not a code bug.

---

## 7. LOW PRIORITY ISSUES

1. No `apple-touch-icon` or web app manifest (`favicon.ico` alone exists and is valid).
2. A few raw `<img>` tags (`HeaderClient.tsx`, `Footer.tsx`, `HeroCarousel.tsx`, `ReviewsCarousel.tsx`) weren't individually verified for non-empty `alt` text — quick manual check recommended.
3. `prisma/migrations/` wasn't exhaustively diffed against `schema.prisma` in this pass — run `npx prisma migrate status` before deploy to confirm clean state.
4. The `JobPayRate.isPrimary` "exactly one true per job" invariant's enforcing transaction (documented in `.claude/rules/database.md` as "delete-and-recreate") wasn't located/verified in this pass — confirm it exists in the job-editor save path.
5. SPF/DKIM/DMARC DNS records for `hugerecruitment.co.uk` are an external Resend/registrar-side checklist item, not visible in the repository — verify in Resend's domain dashboard.

---

## 8. SEO Audit

### Metadata

- Root layout (`src/app/layout.tsx:13-16`): only `title: "Huge Recruitment"` + a `description`. No `metadataBase`, `openGraph`, `twitter`, `title.template`, or default `robots`. `lang="en"` is correctly set.
- `src/app/page.tsx` (homepage) and `src/app/jobs/page.tsx` (job listing) have **no metadata export at all** — inherit only the generic layout title.
- `src/app/jobs/[slug]/page.tsx:19-36` has `generateMetadata` with dynamic title/description and a conditional canonical — best-covered page in the app, but canonical depends entirely on `NEXT_PUBLIC_APP_URL` with no fallback, and has no OG/Twitter tags.
- `sectors`, `employers`, `contact-us` pages: title only, no description/canonical/OG.
- `privacy-policy`, `terms-of-service`: no metadata at all (duplicate generic title with homepage).
- Auth pages and all `/admin/**` pages: no metadata at all, no noindex.

### Canonicals

Only `/jobs/[slug]` has a canonical, and it's fragile (env-var dependent, no fallback). No other page sets one.

### Sitemap

**Missing entirely** — no `src/app/sitemap.ts`, no `public/sitemap.xml`. Given jobs are created/closed/archived dynamically, a **dynamic sitemap** via the App Router `MetadataRoute.Sitemap` API is the right approach — enumerate static public routes plus every `PUBLISHED` job by slug (reusing `src/lib/job-dto.ts`'s existing status-filter logic), excluding `DRAFT`/`ARCHIVED`/expired-`CLOSED` jobs and all `/admin/**`, auth pages, `/api/**`.

### Robots.txt

**Missing entirely** — no `public/robots.txt`, no `src/app/robots.ts`. Recommended policy: allow `/`, disallow `/admin/*`, `/api/*`, `/login`, `/register`, `/forgot-password`, `/reset-password`, `/verify-email`, `/auth/action`; reference `https://hugerecruitment.co.uk/sitemap.xml`. This is purely an SEO/crawl-budget measure — it does not conflict with or replace the existing session-based protection on `/admin/**`.

### Structured Data

**Absent entirely** — zero matches for `JobPosting`, `application/ld+json`, `schema.org` anywhere. All fields needed for `JobPosting` schema already exist on the `Job` model (title, overview, publishedAt≈datePosted, closingDate≈validThrough, employmentType, townOrCity/countyOrRegion/postcode≈jobLocation, JobPayRate≈baseSalary) — this is an implementable gap, not a data-availability gap.

### JobPosting SEO

- URL structure: `/jobs/[slug]`, unique, server-generated slug — good.
- Server-rendered as an async Server Component — fully crawlable.
- Unique titles/descriptions per job — good.
- Closed jobs stay live at 200 (no 410), which is a reasonable UX choice but should be paired with a deliberate noindex-after-close decision.
- `ARCHIVED`/unknown slugs correctly 404 via `not-found.tsx`.
- No JobPosting schema, not in any sitemap (because no sitemap exists).

### Indexing Strategy

- **Index, follow:** `/`, `/jobs`, `/jobs/[slug]`, `/sectors`, `/employers`, `/contact-us`, `/privacy-policy`, `/terms-of-service`.
- **Noindex, nofollow:** `/login`, `/register`, `/forgot-password`, `/reset-password`, `/verify-email`, `/auth/action` — no ranking value, tokenized/single-use links shouldn't be crawled or cached.
- **Noindex, nofollow (already access-gated):** all `/admin/**` — internal tool, no public value; noindex here is belt-and-suspenders on top of existing session checks, not a replacement for them.
- `/api/**` routes aren't indexed by nature but should be excluded via robots.txt to avoid wasted crawl budget.

---

## 9. Security Audit

- **HTTP security headers are entirely missing** site-wide (no CSP, HSTS, X-Frame-Options/frame-ancestors, Referrer-Policy, Permissions-Policy) except one route-local `X-Content-Type-Options: nosniff` on the admin CV-download response. This is the standout security gap — no clickjacking protection, no HSTS enforcement anywhere. **HIGH priority fix via `next.config.ts`'s `headers()`.**
- No CSRF token exists, but `sameSite: lax` cookies + JSON-body POST requests mitigate classic CSRF (cross-origin `fetch` with credentials needs CORS opt-in that isn't granted) — acceptable given current architecture, LOW risk.
- No hardcoded secrets/API keys/private keys found anywhere in `src/`. `.env.local` is correctly gitignored and confirmed never committed to git history.
- API routes reviewed (12 files under `src/app/api/**`): consistent pattern of Zod/manual validation, no stack traces returned to clients, admin routes properly gated via `requireAdminSession()`, no IDOR found, no excessive data exposure (public job DTO explicitly excludes `Client`/internal fields), CSV export has formula-injection escaping, CV download has filename sanitization against header injection.
- Job-application submission has genuinely strong defense-in-depth: honeypot field, rate limiting, duplicate-submission idempotency, TOCTOU-safe transaction re-checking job status, and post-upload magic-byte verification of the CV file independent of client-reported MIME type.

---

## 10. Authentication Audit

- Session cookie (`src/lib/session.ts`): `httpOnly: true`, `secure` in production, `sameSite: "lax"`, 5-day expiry — correctly configured.
- `src/proxy.ts` does an edge presence-check redirecting unauthenticated `/admin/**` requests to `/login`; `src/lib/require-admin-session.ts` does the real server-side check (verified session + `email_verified` + DB `role === ADMIN && status === ACTIVE`), applied in `src/app/admin/layout.tsx` for every admin page — layered correctly, not relying on the edge check alone.
- Rate limiting via Upstash covers applications, CV upload, verification email resend, forgot-password, and verification-complete — IP-keyed for guests, uid-keyed for authenticated actions.
- Anti-enumeration: forgot-password and verification-complete return identical generic responses regardless of account existence.
- Auth provider claims from the client are never trusted directly — the authoritative sign-in method/verification state is always re-derived from the verified Firebase ID token server-side.
- Gaps: no explicit rate limit on the login/session-mint endpoints themselves (relies on Firebase's own throttling — low risk); rate limiter fails open (not closed) if Upstash env vars are missing, with no alerting beyond a console.error.

---

## 11. Database Audit

- Prisma 7.9.1 + `@prisma/adapter-neon`, correct singleton pattern in `src/lib/prisma.ts` avoiding dev hot-reload connection leaks.
- Schema is well-normalized with correct `onDelete` semantics (`Restrict` on in-use sectors/jobs, `SetNull` on audit fields, `Cascade` on job child tables) and appropriate indexes for common query paths.
- Race conditions are handled correctly: job-application submission wraps the job-status re-check and the create in a single `$transaction`, closing the gap between page load and submit; duplicate submissions are idempotent rather than erroring.
- `prisma/seed.ts` only seeds the 5 fixed `Sector` reference rows — safe reference data, not demo/fake data; nothing here needs stripping before production.
- Not verified in this pass (recommend before deploy): that `prisma/migrations/` is fully checked in and clean (`npx prisma migrate status`), and that the `JobPayRate.isPrimary`-invariant transaction actually exists in the job editor's save path.

---

## 12. Email Audit

- Provider is **Resend** (contradicts CLAUDE.md's "Firebase's own built-in flows" description) — verification, password-reset, welcome, and application-confirmation emails are all sent via Resend, with Firebase Admin used only to generate the underlying action links.
- Sender/recipient fully environment-driven (`RESEND_API_KEY`, `RESEND_FROM_EMAIL`, `RESEND_ADMIN_NOTIFICATION_EMAIL`) — no hardcoded email addresses in template code (the only hardcoded email string anywhere is the intentional `info@hugerecruitment.co.uk` mailto link in the footer/contact page).
- All user-supplied content in emails is HTML-escaped — no injection risk in admin notification emails.
- Fails safe: missing Resend env vars cause notification sends to log and return rather than throw; email failures never block auth flows.
- Links use `NEXT_PUBLIC_APP_URL` — same dependency as the rest of the app; verify this is set correctly in Vercel Production.
- SPF/DKIM/DMARC are DNS-side configuration at the domain registrar / Resend's dashboard for `hugerecruitment.co.uk` — not visible in-repo, flagged as an external pre-launch checklist item.

---

## 13. Environment Variables

| Variable                                                                   | Used Where                                             | Required in Prod?           | Secret?       | Status                                                      | Recommendation                                                                                                               |
| -------------------------------------------------------------------------- | ------------------------------------------------------ | --------------------------- | ------------- | ----------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| `DATABASE_URL`                                                             | `src/lib/prisma.ts`                                    | Yes                         | Yes           | Present in `.env.example`/`.env.local`                      | Use a **separate** production Neon URL                                                                                       |
| `NEXT_PUBLIC_FIREBASE_*` (7 vars)                                          | `src/firebase/config.ts`                               | Yes                         | No (public)   | Present                                                     | Set in Vercel Production                                                                                                     |
| `FIREBASE_ADMIN_PROJECT_ID/CLIENT_EMAIL/PRIVATE_KEY`                       | `src/firebase/admin.ts`                                | Yes                         | Yes           | Present                                                     | Set in Vercel Production                                                                                                     |
| `NEXT_PUBLIC_APP_URL`                                                      | email links, canonical URLs, password-reset generation | Yes                         | No            | Present                                                     | **Must equal `https://hugerecruitment.co.uk`** in Vercel Production — hard dependency, multiple flows fail-closed without it |
| `RESEND_API_KEY` / `RESEND_FROM_EMAIL` / `RESEND_ADMIN_NOTIFICATION_EMAIL` | `src/lib/email.ts`, `auth-email.ts`                    | Yes                         | Yes (API key) | Present                                                     | Set in Vercel Production                                                                                                     |
| `BLOB_READ_WRITE_TOKEN`                                                    | CV upload                                              | Yes                         | Yes           | Present                                                     | Set in Vercel Production                                                                                                     |
| `UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_REST_TOKEN`                      | rate limiting                                          | Yes (fails open without it) | Yes           | Present                                                     | **Must verify set** — silent failure mode if missing                                                                         |
| `BLOB_STORE_ID`, `CLOUDINARY_API_KEY/SECRET/CLOUD_NAME`                    | none (unused)                                          | No                          | Yes           | Dead vars in local `.env.local` only, not in `.env.example` | Remove — leftover from abandoned integration                                                                                 |

No secret values were printed or inspected beyond key names/presence, per the audit's own privacy rules.

---

## 14. Domain & URL Audit

- Grepped all of `src/**` for `localhost`, `127.0.0.1`, `0.0.0.0`, `vercel.app`, `http://` — every hit is confined to `*.test.ts(x)` mock files. **Zero occurrences in production code paths.**
- Production URL is correctly sourced from `NEXT_PUBLIC_APP_URL` everywhere needed (email links, canonical URLs, action-link generation), with fail-closed behavior (throws) if unset in the places that matter most (password reset).
- No hardcoded fallback domain anywhere — meaning correctness at runtime depends entirely on the Vercel env var being set correctly, which cannot be verified by static analysis.
- No www↔apex redirect configured. **Recommendation: canonicalize on `https://hugerecruitment.co.uk` (no `www`)** and add a redirect for the `www` variant, since that's what's referenced throughout the code/docs already.

---

## 15. Performance Audit

- `next/image` is used **nowhere** in the codebase — 6 non-email raw `<img>` tags exist on marketing pages (`HeaderClient.tsx`, `Footer.tsx`, `ReviewsCarousel.tsx`, `HeroCarousel.tsx`, `employers/page.tsx`, homepage `page.tsx` x2), skipping automatic resizing/lazy-loading/modern-format serving. This is the most concrete Core Web Vitals risk found (LCP/CLS on image-heavy marketing pages).
- Fonts correctly self-hosted via `next/font/google` in the root layout — no render-blocking Google Fonts request.
- Client/server component boundaries are well-scoped — server components handle data fetching (e.g. `/jobs` page fetches jobs+sectors in parallel via `Promise.all`), with `"use client"` pushed down to interactive leaf components only.
- Query patterns are good: scoped `select`s (not full-row fetches) in the application-submission transaction and duplicate-check query.
- `loading.tsx`/`error.tsx`/`not-found.tsx` exist for the `/jobs` subtree (well implemented — skeleton loader, retry-capable error boundary) but **no root-level equivalents exist**, so errors/404s outside `/jobs` fall back to Next's generic default page.
- Not fully audited in this pass: admin candidates list/CSV export query shape for pagination-related N+1 risk at scale — worth a dedicated follow-up given CSV export could be an unpaginated full-table query.

---

## 16. Accessibility Audit

Based on a sampled pass (not exhaustive across all pages):

- Forms consistently use `<label htmlFor>`, `aria-live`/`role="alert"`/`role="status"` on dynamic messages, correct `autoComplete` attributes, and properly paired `disabled` states.
- `/jobs` listing uses `aria-labelledby` and an `sr-only`/`aria-live="polite"` region announcing filtered result counts — a solid pattern for dynamic lists.
- Single `h1` per sampled page; decorative icons correctly marked `aria-hidden="true"`.
- Not individually verified: `alt` text on 3 of the 6 raw `<img>` tags found in the performance section (`HeaderClient.tsx`, `Footer.tsx`, `HeroCarousel.tsx`, `ReviewsCarousel.tsx`) — one (`employers/page.tsx`'s sector images) was confirmed to use meaningful alt text.
- No major violations found in the sampled surface; a full manual or automated (axe) pass across all ~22 page routes was outside this audit's scope.

---

## 17. Error Handling

- API-layer error handling is genuinely strong: consistent pattern of catching known business errors distinctly from unknown ones, returning generic client-facing messages, logging details server-side only (`console.error`), and never serializing raw error objects into JSON responses. The job-application route in particular handles CV-upload verification failures, transaction rollback, and post-submission email-send failures without losing already-persisted data.
- One inconsistency: the applications route logs the raw `error` object rather than `errorClass`/`errorMessage` like other routes — worth normalizing before routing logs to a third-party aggregator.
- **Gap:** no root-level `not-found.tsx`/`error.tsx`/`global-error.tsx` — only `/jobs` has these. In production builds Next strips stack traces by default, so this is a branding/UX gap, not a security leak, but it means a broken `/admin` or `/contact-us` request currently shows Next's generic unstyled page.

---

## 18. Vercel Deployment Audit

- No filesystem writes to local/persistent disk anywhere — CV storage correctly uses `@vercel/blob`, which is serverless-safe (unlike writing to `/public` or local disk, which wouldn't persist across Vercel's ephemeral instances).
- No cron/background jobs and no `vercel.json` cron config — nothing to fail on serverless timeouts.
- No long-running/streaming processes — all routes are standard request/response handlers, fitting Vercel's serverless function model.
- `transpilePackages: ["firebase-admin", "jwks-rsa", "jose"]` in `next.config.ts` is a deliberate, correct fix for those packages' ESM/CJS interop under Next's bundler.
- No `images.remotePatterns` configured — currently moot since `next/image` isn't used anywhere yet, but will need addressing the moment `next/image` is adopted for any externally-hosted image.
- No `vercel.json` exists at all — relying entirely on Vercel zero-config defaults, which is fine for this app's current shape but means there's no explicit control over headers/redirects/regions unless added via `next.config.ts` or `vercel.json`.
- Build/lint were not executed in this read-only audit pass — recommend an explicit `npm run build` verification pass before deploy to catch any TypeScript/lint errors not visible to static reading.

---

## 19. Privacy/GDPR Technical Considerations

_(Technical observations only — not legal advice; recommend appropriate legal/compliance review before launch.)_

- `src/lib/job-dto.ts`'s canonical public projection explicitly excludes `Client`/internal admin fields from every public-facing job query — a genuinely good, enforced-by-convention data-minimization pattern.
- Admin CSV export of candidate data is properly gated behind `requireAdminSession()` and escapes cells against CSV-formula injection.
- `JobApplication` collects fullName/email/phone/location/CV metadata (binary stored in Vercel Blob, not Postgres) plus an explicit `privacyConsentAt`/`privacyPolicyVersion` timestamp — a minimal, consent-tracked data model.
- No `localStorage`/`sessionStorage` usage anywhere — no client-side PII persistence risk.
- **Gap for review:** there is no candidate-facing way to view, export, or request deletion of their own submitted application data (tracked only by an opaque `publicReference`, no link to a `User` account) — a data-subject-access-request consideration.
- **Gap for review:** no visible data-retention policy or automatic cleanup for old `JobApplication` records.

---

## 20. Exact Files That Need Changes

| File (new or existing)                                                                                                                                | Change                                                                                                       | Why                                                                                     | Priority | SEO | Security | Deployment |
| ----------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------- | -------- | --- | -------- | ---------- |
| `src/app/sitemap.ts` (new)                                                                                                                            | Create dynamic sitemap enumerating static routes + `PUBLISHED` jobs via existing `job-dto.ts` filters        | Sitemap missing entirely                                                                | CRITICAL | Yes | No       | No         |
| `src/app/robots.ts` (new)                                                                                                                             | Allow public routes, disallow `/admin/*`, `/api/*`, auth pages; reference sitemap                            | robots.txt missing entirely                                                             | CRITICAL | Yes | No       | No         |
| `next.config.ts`                                                                                                                                      | Add `headers()` with CSP, HSTS, X-Frame-Options/frame-ancestors, Referrer-Policy, Permissions-Policy         | No site-wide security headers exist                                                     | CRITICAL | No  | Yes      | Yes        |
| `src/app/layout.tsx`                                                                                                                                  | Add `metadataBase`, default `openGraph`/`twitter`, `title.template`                                          | No base metadata config exists                                                          | HIGH     | Yes | No       | No         |
| `src/app/opengraph-image.tsx` / static OG image (new)                                                                                                 | Add a branded OG/Twitter image                                                                               | No social preview image anywhere                                                        | HIGH     | Yes | No       | No         |
| `src/app/login/page.tsx`, `register/page.tsx`, `forgot-password/page.tsx`, `reset-password/page.tsx`, `verify-email/page.tsx`, `auth/action/page.tsx` | Add `metadata = { robots: { index: false, follow: false } }`                                                 | Auth pages currently indexable                                                          | HIGH     | Yes | No       | No         |
| `src/app/admin/layout.tsx` or each admin page                                                                                                         | Add noindex metadata                                                                                         | Admin pages currently indexable (belt-and-suspenders on top of existing session gating) | HIGH     | Yes | No       | No         |
| `src/app/not-found.tsx`, `src/app/error.tsx` (new)                                                                                                    | Add root-level branded 404/error pages                                                                       | Only `/jobs` has these today                                                            | HIGH     | No  | No       | Yes        |
| `src/app/jobs/[slug]/page.tsx`                                                                                                                        | Add JobPosting JSON-LD via a `<script type="application/ld+json">`, using existing `Job`/`JobPayRate` fields | No structured data despite full field availability                                      | HIGH     | Yes | No       | No         |
| `HeaderClient.tsx`, `Footer.tsx`, `HeroCarousel.tsx`, `ReviewsCarousel.tsx`, `employers/page.tsx`, homepage `page.tsx`                                | Replace raw `<img>` with `next/image`                                                                        | No image optimization anywhere                                                          | HIGH     | No  | No       | No (perf)  |
| `prisma.zip` (repo root)                                                                                                                              | Delete                                                                                                       | Untracked stray archive, not needed                                                     | HIGH     | No  | No       | Yes        |
| `.env.local`                                                                                                                                          | Remove `BLOB_STORE_ID`, `CLOUDINARY_*`                                                                       | Dead/unused vars from abandoned integration                                             | MEDIUM   | No  | No       | No         |
| `src/app/jobs/[slug]/page.tsx`                                                                                                                        | Add a hardcoded production-origin fallback for canonical URL construction                                    | Canonical silently becomes `undefined` if env var missing                               | MEDIUM   | Yes | No       | No         |
| `next.config.ts`                                                                                                                                      | Add `redirects()` for www→apex (or chosen direction)                                                         | No canonical-domain redirect exists                                                     | MEDIUM   | Yes | No       | No         |
| `src/app/api/applications/route.ts`                                                                                                                   | Normalize error logging to `errorClass`/`errorMessage` pattern used elsewhere                                | Minor log-hygiene inconsistency                                                         | MEDIUM   | No  | Yes      | No         |
| `public/file.svg`, `globe.svg`, `next.svg`, `vercel.svg`, `window.svg`                                                                                | Delete                                                                                                       | Unused Next.js scaffold leftovers                                                       | LOW      | No  | No       | No         |
| `CLAUDE.md`                                                                                                                                           | Update stale sections (test scripts, email provider, proxy protection, feature-tracker status)               | Documentation drift found across multiple sections                                      | LOW      | No  | No       | No         |

---

## 21. Recommended Fix Order

1. Confirm/set `NEXT_PUBLIC_APP_URL` and `UPSTASH_REDIS_REST_URL`/`TOKEN` correctly in Vercel Production environment (nothing else matters if these are wrong).
2. Delete `prisma.zip` and the unused `public/*.svg` scaffold files.
3. Add site-wide HTTP security headers in `next.config.ts`.
4. Create `src/app/robots.ts` and `src/app/sitemap.ts`.
5. Add `metadataBase` + default OG/Twitter config in root layout, plus a real OG image.
6. Add `noindex` metadata to all auth pages and admin pages.
7. Add root-level `not-found.tsx` / `error.tsx`.
8. Add JobPosting JSON-LD to `/jobs/[slug]`.
9. Replace raw `<img>` tags with `next/image` on marketing pages.
10. Add a hardcoded canonical-domain fallback for job-page canonical URLs; add www→apex redirect.
11. Clean up dead env vars in `.env.local`; update stale `CLAUDE.md` sections.
12. Run `npm run build` and `npm run lint` to confirm a clean production build.
13. Deploy to a Vercel preview, verify auth flows, job application flow (including CV upload), and admin access end-to-end.
14. Connect the custom domain, confirm SPF/DKIM/DMARC on Resend's dashboard for `hugerecruitment.co.uk`.
15. Submit the new sitemap to Google Search Console once live.

---

## 22. Final Go/No-Go Decision

**GO WITH CONDITIONS.**

The application's core functionality — auth, session handling, database integrity, job applications, admin access control, and API-layer security — is solidly and carefully built, with several non-obvious defensive patterns already in place (TOCTOU-safe transactions, CV magic-byte verification, CSV formula-injection escaping, anti-enumeration responses). Nothing found here is a functional blocker.

The conditions for launch are the SEO/hardening gaps above (Section 4 in particular: sitemap, robots.txt, HTTP security headers, and confirming the production env vars are actually set correctly in Vercel) — these are all straightforward, well-scoped fixes with no architectural risk, but they materially affect whether the site can be found by candidates/employers and whether it meets baseline security-header hygiene for a public site collecting personal data. Recommend completing Sections 4–5 of the checklist above before the public launch announcement, and treating the rest of the High/Medium items as a fast-follow within the first weeks post-launch.
