# Implementation Plan: Milestone 2 — Auth, Security, RBAC & Admin Accounts

## Overview
This plan integrates findings from `m2_explorer_1`, `m2_explorer_2`, and `m2_explorer_3` to deliver a zero-trust, session-based authentication, RBAC, password quarantine, and admin user provisioning system.

---

## 1. File Workload & Ownership

### Domain Auth Service (`src/lib/auth/`)
1. `src/lib/auth/password.ts`:
   - `hashPassword(plainText: string): Promise<string>` using Node.js `scrypt` with 16-byte random salt, 64-byte key length, formatted as `${salt}:${derivedKeyHex}`.
   - `verifyPassword(plainText: string, storedHash: string): Promise<boolean>` using `crypto.timingSafeEqual`.
   - `generateMemorablePassword()` for temporary credentials (e.g. `Kathmandu#2026`).
2. `src/lib/auth/token.ts`:
   - Stateless HMAC-SHA256 signed session tokens (`${userId}.${role}.${mustChangePassword ? 1 : 0}.${expiresAt}.${signature}`).
   - Edge-compatible verification using Web Crypto API (`crypto.subtle`) for Next.js middleware, and Node `node:crypto` for Server Actions/Components.
3. `src/lib/auth/session.ts`:
   - `createSession(userId: string, role?: string, mustChangePassword?: boolean)`: sets `auth_session` HTTP-only cookie with 30-day TTL (`httpOnly: true`, `secure: process.env.NODE_ENV === 'production'`, `sameSite: 'lax'`, `path: '/'`).
   - `getCurrentUser(): Promise<SessionUser | null>`: extracts and verifies session cookie, looks up `users` record (and linked `studentProfiles` or `teachers` profile), with fixture fallback for testing (`APP_ROLE`, `DEMO_STUDENT_ID`).
   - `requireAuth(allowedRoles?: string[]): Promise<SessionUser>`: server-side assertion returning user or redirecting / throwing 403.
   - `invalidateSession(): Promise<void>`: deletes `auth_session` cookie.
4. `src/lib/auth/rbac.ts`:
   - Role permissions matrix (`ADMIN`, `TEACHER`, `CR`, `STUDENT`).
5. `src/lib/auth/index.ts` & `src/lib/auth.ts`:
   - Unified re-exports matching interface contracts.

### Route Protection Middleware (`src/middleware.ts`)
- Edge-compatible middleware intercepting all routes except public assets (`/_next/`, `/favicon.ico`, `/public/`, `/api/uploadthing`).
- Unauthenticated requests to protected routes -> redirect to `/login?callbackUrl=...`.
- Authenticated requests with `mustChangePassword === true` targeting any route other than `/change-password` -> redirect to `/change-password`.
- Authenticated requests targeting `/admin/*` without `role === 'ADMIN'` -> redirect to `/` (or 403).
- Authenticated requests visiting `/login` -> redirect to `/` (or `/change-password` if mustChangePassword).

### Authentication Views & Server Actions
1. `src/app/(auth)/login/page.tsx` & `src/app/actions/auth.ts`:
   - Login page with accessible form inputs (`name="email"`, `name="password"`, submit button, error alert).
   - `loginAction`: Zod validation, fetch user by email, check `isActive`, verify password, create session cookie, return standardized result or redirect.
2. `src/app/(auth)/change-password/page.tsx`:
   - Forced quarantine view with current password (optional/temp), new password (min 8 chars, must differ from current), confirm password.
   - `changePasswordAction`: Zod validation, verify current user from session, verify password divergence, update `users.passwordHash` and `users.mustChangePassword = 0`, re-issue updated session cookie, redirect to `/`.
3. `src/app/(auth)/layout.tsx`:
   - Clean centered auth layout for institutional branding.

### Admin Accounts Console (`src/app/(admin)/admin/accounts/`)
1. `src/app/(admin)/admin/accounts/page.tsx`:
   - Server component fetching all users and KPI metrics.
   - Renders Header with "Create Account" dialog trigger, 5 KPI cards (Total, Students, Teachers, CRs, Deactivated).
   - Client component `AccountsConsole`: search input (`placeholder="Search accounts..."`), role filter select (`name="roleFilter"`), status filter, interactive table with role badges, academic metadata (roll number, faculty, semester), status toggle switches, and action dropdowns (Edit, Reset Password, Deactivate/Activate).
2. Create Account Dialog (`src/components/admin/create-account-dialog.tsx`):
   - Dynamic form based on selected role (`STUDENT`, `TEACHER`, `CR`).
   - Fields: Name, Email, Role, Department (teachers), Roll Number, Faculty, Semester, Section (students).
   - Generated temporary password pre-fill or auto-generated upon creation.
   - Post-creation credentials dialog (`role="dialog"`, `data-testid="temp-password-value"`) with 1-click clipboard copy button.
3. Server Actions (`src/app/actions/accounts.ts`):
   - `createAccountAction`: Zod schema validation, scrypt hashing, atomic multi-table insert (`users` + `student_profiles` & `students` or `teachers`), `mustChangePassword = 1`, SQLite UNIQUE error catching (`"A user with this email already exists."`, `"Roll number already assigned."`).
   - `updateAccountAction`: edit user & profile metadata.
   - `toggleAccountStatusAction`: activate/deactivate user (prevent deactivating own admin account).
   - `resetPasswordAction`: generate new temp password, set `mustChangePassword = 1`, update password hash in DB.

---

## 2. Verification Protocol
1. **Typecheck**: `npx tsc --noEmit` (0 errors).
2. **E2E Playwright Auth Lifecycle Suite**: `npx playwright test tests/e2e/auth-lifecycle.spec.ts` (All 13 test cases pass).
3. **Database Constraints Verification**: Ensure no violations of schema rules or migrations.
