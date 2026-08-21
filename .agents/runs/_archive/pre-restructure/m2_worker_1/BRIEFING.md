# BRIEFING — 2026-08-16T12:00:00Z

## Mission
Implement Milestone 2: Auth, Security, RBAC & Admin Accounts for Classroom OS.

## 🔒 My Identity
- Archetype: implementer
- Roles: implementer, qa, specialist
- Working directory: D:\CLASSROOM OS\.agents\m2_worker_1
- Original parent: 51f04cf5-c8ae-404e-93f7-a224187f6ab7
- Milestone: Milestone 2 (Auth, Security, RBAC & Admin Accounts)

## 🔒 Key Constraints
- Pure genuine implementation, no cheating, no mock bypasses.
- Async `scrypt` matching `seed.ts` format `${salt}:${derivedKeyHex}`.
- WebCrypto HMAC-SHA256 stateless session tokens for Edge runtime in `src/middleware.ts`.
- Non-production fixture fallback for backward compatibility (`APP_ROLE`, `DEMO_STUDENT_ID`) when no cookie is set.
- Next.js 16 / React 19 rules: `await cookies()`, `useActionState`, Zod validation, no Base UI button in link.
- Strict database constraints enforcement (SQLite UNIQUE handling).

## Current Parent
- Conversation ID: 51f04cf5-c8ae-404e-93f7-a224187f6ab7
- Updated: 2026-08-16T12:00:00Z

## Task Summary
- **What to build**: Domain Auth (`src/lib/auth/*`, `src/lib/auth.ts`), Edge Middleware (`src/middleware.ts`, `src/proxy.ts`), Auth views & Server Actions (`/login`, `/change-password`, `(auth)/layout.tsx`, `src/app/actions/auth.ts`), Admin Accounts Console & Server Actions (`/admin/accounts`, `src/components/admin/create-account-dialog.tsx`, `src/app/actions/accounts.ts`).
- **Success criteria**: Full lifecycle working, `npx tsc --noEmit` passes with 0 errors, 13/13 Playwright E2E auth tests pass, 31/31 db verification tests pass.
- **Interface contracts**: `PROJECT.md`, `TEST_INFRA.md`, `tests/fixtures/auth.fixture.ts`, `tests/e2e/auth-lifecycle.spec.ts`.

## Key Decisions Made
- Exported both `proxy` and `middleware` functions from `src/middleware.ts` and `src/proxy.ts` to adhere to Next.js 16 Network Proxy conventions.
- Standardized `normalizeSemester` as an internal helper in `src/app/actions/accounts.ts` so all exported symbols in `"use server"` are async Server Actions.
- Formatted `CreateAccountDialog` with a compact, responsive 2-column grid to ensure submit buttons remain directly visible in all desktop viewports.

## Artifact Index
- `src/lib/auth/password.ts` — Scrypt hashing and timing-safe verification
- `src/lib/auth/token.ts` — Stateless HMAC-SHA256 session token generation and Edge WebCrypto verification
- `src/lib/auth/session.ts` — Session lifecycle with 30-day TTL cookie and profile hydration
- `src/lib/auth/rbac.ts` — Role definitions and permissions matrix
- `src/lib/auth/index.ts` — Unified auth barrel export
- `src/lib/auth.ts` — Backwards-compatible root export
- `src/middleware.ts` & `src/proxy.ts` — Edge route protection, RBAC, and quarantine guards
- `src/app/actions/auth.ts` — Server actions for login, quarantine password change, and logout
- `src/app/actions/accounts.ts` — Server actions for account provisioning, updating, status toggling, and password reset
- `src/app/(auth)/layout.tsx` — Centered authentication layout
- `src/app/(auth)/login/page.tsx` & `src/app/(auth)/login/login-form.tsx` — Login view and client form
- `src/app/(auth)/change-password/page.tsx` & `src/app/(auth)/change-password/change-password-form.tsx` — Quarantine password update view
- `src/app/(admin)/admin/accounts/page.tsx` — Admin Accounts dashboard
- `src/app/(admin)/admin/accounts/kpi-summary-cards.tsx` — 5 KPI metric cards
- `src/app/(admin)/admin/accounts/accounts-client-console.tsx` — Interactive roster table with search, filters, actions
- `src/components/admin/create-account-dialog.tsx` — Account creation and temporary credentials modal

## Change Tracker
- **Files modified**: `src/lib/auth/*`, `src/lib/auth.ts`, `src/middleware.ts`, `src/proxy.ts`, `src/app/actions/*`, `src/app/(auth)/*`, `src/app/(admin)/admin/accounts/*`, `src/components/admin/create-account-dialog.tsx`, `src/components/app-sidebar.tsx`, `scripts/seed-e2e.ts`
- **Build status**: PASS (`tsc --noEmit` 0 errors)
- **Pending issues**: None

## Quality Status
- **Build/test result**: 13/13 Playwright E2E tests PASS; 31/31 Database verification tests PASS
- **Lint status**: Clean
- **Tests added/modified**: `scripts/seed-e2e.ts` updated with `users` and `student_profiles` deterministic test dataset
