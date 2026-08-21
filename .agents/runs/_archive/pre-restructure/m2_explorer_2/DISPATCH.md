## 2026-08-16T11:28:02Z
You are m2_explorer_2 (Middleware, Quarantine & Auth UI Explorer) for Milestone 2 of Classroom OS.
Your working directory is: D:\CLASSROOM OS\.agents\m2_explorer_2

Read:
- D:\CLASSROOM OS\.agents\ORIGINAL_REQUEST.md
- D:\CLASSROOM OS\PROJECT.md
- D:\CLASSROOM OS\TEST_INFRA.md
- D:\CLASSROOM OS\tests/e2e/auth-lifecycle.spec.ts (if exists) or tests/fixtures/
- Existing Next.js routes and middleware

Analyze and produce a detailed specification for:
1. Route Protection & Middleware (`src/middleware.ts`):
   - How middleware reads and verifies the `auth_session` cookie.
   - Public paths whitelist: `/login`, `/_next/`, `/api/uploadthing`, `/favicon.ico`, etc.
   - Quarantine check: If `mustChangePassword === true`, redirect any request targeting protected routes to `/change-password`.
   - RBAC check: If path starts with `/admin/`, verify `role === 'ADMIN'`. Redirect unauthorized roles to `/`.
   - Unauthenticated redirect: If unauthenticated on protected routes, redirect to `/login?callbackUrl=...`.
   - Note on Edge/Node runtime compatibility for middleware cookie parsing/HMAC verification.
2. Login View & Server Action (`src/app/(auth)/login/page.tsx`):
   - UI layout (accessible, responsive, clean academic card styling).
   - Form handling with React 19 Server Action (`useActionState`), Zod schema, error alerts.
   - Redirect to callbackUrl or `/` (or `/change-password` if mustChangePassword).
3. Change Password View & Server Action (`src/app/(auth)/change-password/page.tsx`):
   - Mandatory quarantine page UI layout.
   - Server Action validating new password (min 8 chars, must differ from old/temp), updating user in DB, setting `mustChangePassword = 0`, refreshing session, redirecting to `/`.
4. Write your findings to `D:\CLASSROOM OS\.agents\m2_explorer_2\analysis.md` and `D:\CLASSROOM OS\.agents\m2_explorer_2\handoff.md`.
5. Send message to caller when done.
