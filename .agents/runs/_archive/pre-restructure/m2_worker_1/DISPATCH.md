## 2026-08-16T11:31:43Z
You are m2_worker_1, the Implementation Worker for Milestone 2 (Auth, Security, RBAC & Admin Accounts) of Classroom OS.
Your working directory is: D:\CLASSROOM OS\.agents\m2_worker_1

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

Context Files to Read:
- D:\CLASSROOM OS\.agents\ORIGINAL_REQUEST.md
- D:\CLASSROOM OS\PROJECT.md
- D:\CLASSROOM OS\TEST_INFRA.md
- D:\CLASSROOM OS\.agents\sub_orch_m2\plan.md
- D:\CLASSROOM OS\.agents\m2_explorer_1\analysis.md
- D:\CLASSROOM OS\.agents\m2_explorer_2\analysis.md
- D:\CLASSROOM OS\.agents\m2_explorer_3\analysis.md
- D:\CLASSROOM OS\src/db/schema.ts
- D:\CLASSROOM OS\src/db/seed.ts
- D:\CLASSROOM OS\tests/fixtures/auth.fixture.ts
- D:\CLASSROOM OS\tests/fixtures/pom/
- D:\CLASSROOM OS\tests/e2e/auth-lifecycle.spec.ts

Your Exclusive Write Ownership:
- `src/lib/auth/password.ts`
- `src/lib/auth/token.ts`
- `src/lib/auth/session.ts`
- `src/lib/auth/rbac.ts`
- `src/lib/auth/index.ts`
- `src/lib/auth.ts`
- `src/middleware.ts`
- `src/app/actions/auth.ts`
- `src/app/actions/accounts.ts`
- `src/app/(auth)/login/page.tsx`
- `src/app/(auth)/change-password/page.tsx`
- `src/app/(auth)/layout.tsx`
- `src/app/(admin)/admin/accounts/page.tsx`
- `src/components/admin/create-account-dialog.tsx` (and related components in `src/components/admin/accounts/` or `src/components/admin/`)

Tasks:
1. Implement the Domain Auth Service (`src/lib/auth/`):
   - `password.ts`: async scrypt hash & timingSafeEqual verification (matching `src/db/seed.ts` format `${salt}:${derivedKeyHex}`).
   - `token.ts`: stateless HMAC-SHA256 session token generation and Edge/WebCrypto verification.
   - `session.ts`: `createSession`, `getCurrentUser`, `requireAuth`, `invalidateSession` with 30-day TTL `auth_session` HTTP-only cookie, async `await cookies()`, and non-production fixture fallback (`APP_ROLE`, `DEMO_STUDENT_ID`).
   - `rbac.ts` & `index.ts`: Unified re-exports, re-exported by `src/lib/auth.ts`.
2. Implement Edge-Compatible Route Protection Middleware (`src/middleware.ts`):
   - Whitelist public assets (`/_next/`, `/favicon.ico`, `/public/`, `/api/uploadthing`).
   - Unauthenticated on protected routes -> redirect to `/login`.
   - Authenticated with `mustChangePassword === true` on any route except `/change-password` -> redirect to `/change-password`.
   - Authenticated on `/admin/*` without `ADMIN` role -> redirect to `/`.
   - Authenticated on `/login` -> redirect to `/` (or `/change-password` if mustChangePassword).
3. Implement Auth Views & Server Actions:
   - `src/app/(auth)/login/page.tsx` & `src/app/actions/auth.ts`: Accessible login form with email, password, error alert, and `loginAction` using React 19 `useActionState` and Zod.
   - `src/app/(auth)/change-password/page.tsx`: Mandatory quarantine change-password page enforcing >=8 chars and divergence from temp password, with `changePasswordAction` updating DB and clearing quarantine.
   - `src/app/(auth)/layout.tsx`: Centered auth layout.
4. Implement Admin Accounts Console & Server Actions:
   - `src/app/(admin)/admin/accounts/page.tsx`: KPI cards (Total, Students, Teachers, CRs, Deactivated), search input, role & status filter controls, accounts table with badges, academic metadata, and status switches.
   - `src/components/admin/create-account-dialog.tsx`: Role selector (`STUDENT`, `TEACHER`, `CR`), fields for academic profile, temp password generation, and credentials dialog with `data-testid="temp-password-value"` and copy button.
   - `src/app/actions/accounts.ts`: `createAccountAction`, `updateAccountAction`, `toggleAccountStatusAction`, `resetPasswordAction`. Handle SQLite unique constraints gracefully.
5. Verification:
   - Run `npx tsc --noEmit` and confirm 0 type errors.
   - Run `npx playwright test tests/e2e/auth-lifecycle.spec.ts` (or run relevant tests) and ensure everything compiles and passes cleanly.
6. Write your handoff report to `D:\CLASSROOM OS\.agents\m2_worker_1\handoff.md` and send a message when complete.
