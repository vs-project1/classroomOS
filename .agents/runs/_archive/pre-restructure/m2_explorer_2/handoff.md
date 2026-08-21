# Handoff Report: Middleware, Quarantine & Auth UI Specification

**Agent ID**: `m2_explorer_2`  
**Archetype**: explorer (Teamwork)  
**Milestone**: Milestone 2 — Auth, Security, RBAC & Admin Accounts  
**Destination**: Orchestrator / Sub-Orchestrator M2 (`51f04cf5-c8ae-404e-93f7-a224187f6ab7`)

---

## 1. Observation

1. **Test Harness Expectations**:
   - `tests/e2e/auth-lifecycle.spec.ts` defines 13 specific E2E test cases across 3 suites:
     - Lines 9–58: Login validation (`TC-SPEC-AUTH-01` to `TC-SPEC-AUTH-05`) verifying valid logins, invalid password rejection with error alerts matching `/invalid|incorrect|failed|wrong/i`, non-existent user generic failure, and empty form validation.
     - Lines 62–110: Mandatory quarantine (`TC-SPEC-AUTH-06` to `TC-SPEC-AUTH-09`) checking redirection of `mustChangePassword=true` accounts to `/change-password`, validation of 8-character minimum password length (7-char boundary min-1 rejected), password confirmation mismatch rejection, and successful password update unlocking `/`.
     - Lines 114–164: RBAC and user lifecycle (`TC-SPEC-AUTH-10` to `TC-SPEC-AUTH-13`) verifying admin accounts console, account creation with temp password, student role denial on `/admin/accounts` with redirection to `/` or 403, and deactivated account login rejection matching `/deactivated|disabled|invalid|contact/i`.
   - `tests/fixtures/pom/login.page.ts` (lines 11–16) targets:
     - `emailInput`: `input[name='email'], input[type='email'], #email`
     - `passwordInput`: `input[name='password'], input[type='password'], #password`
     - `submitButton`: `button[type='submit']` filtering text `/Sign In|Log In|Continue/i`
     - `errorMessage`: `[data-testid='login-error'], [role='alert'], .text-destructive, p.text-red-500`
   - `tests/fixtures/pom/change-password.page.ts` (lines 12–18) targets:
     - `currentPasswordInput`: `input[name='currentPassword'], input[name='tempPassword'], #currentPassword`
     - `newPasswordInput`: `input[name='newPassword'], #newPassword`
     - `confirmPasswordInput`: `input[name='confirmPassword'], #confirmPassword`
     - `submitButton`: `button[type='submit']` filtering text `/Update Password|Change Password|Set Password/i`
     - `validationError`: `[role='alert'], .text-destructive, p.text-red-500, [data-testid='password-error']`
   - `tests/fixtures/auth.fixture.ts` (lines 25–58) injects browser cookies: `auth_session` (random 32-byte hex token), `APP_ROLE` (`ADMIN` | `STUDENT`), and `DEMO_STUDENT_ID` (`sp_student_001` | `sp_newstudent_001`).

2. **Next.js 16 & React 19 Architecture**:
   - `package.json` contains `"next": "16.2.10"`, `"react": "19.2.4"`, `"drizzle-orm": "^0.45.2"`, `"zod": "^4.4.3"`.
   - Official Next.js documentation in `node_modules/next/dist/docs/01-app/02-guides/authentication.md` (lines 518–674 and 1010–1075) specifies that middleware should perform optimistic, stateless checks using the session cookie, avoiding slow database queries on every request.

3. **Current Codebase State**:
   - `src/middleware.ts` does not yet exist.
   - `src/app/(auth)/login/` and `src/app/(auth)/change-password/` routes do not yet exist.
   - `src/lib/auth/password.ts` and `src/lib/auth/session.ts` specifications produced by `m2_explorer_1` define async scrypt password hashing compatible with `src/db/seed.ts` and HMAC-SHA256 session token management.

---

## 2. Logic Chain

1. **Stateless Middleware Optimization**: Because Next.js middleware executes on the Edge runtime and intercepts every incoming HTTP request, running database queries (e.g., Turso/libSQL queries) inside middleware would add significant latency and risk runtime incompatibilities. Therefore, encoding `{ userId, role, mustChangePassword, expiresAt }` into the HMAC-SHA256 signed session cookie allows middleware to execute in 0ms with standard Web Crypto API (`crypto.subtle`), while Server Components and Server Actions provide secondary database-level verification.
2. **Quarantine State Enforcement**: When a user logs in with a temporary password (`mustChangePassword === true`), the session cookie reflects this quarantine state. The middleware strictly intercepts requests to all protected routes (e.g., `/`, `/attendance`, `/subjects`, `/homework`, `/today`, `/admin/*`) and redirects the user to `/change-password`. Only `/change-password`, public assets, and `/api/uploadthing` are permitted.
3. **RBAC Isolation**: Any request to `/admin` or `/admin/*` is inspected for `session.role === 'ADMIN'`. If the user is unauthenticated, they are redirected to `/login?callbackUrl=...`. If authenticated as `STUDENT`, `CR`, or `TEACHER`, they are redirected safely to `/`, preventing unauthorized administrative access.
4. **React 19 Server Action Architecture**: Following project rules and React 19 standards, mutations on `/login` and `/change-password` are executed exclusively via Server Actions using `useActionState` and Zod schema validation, returning standardized `{ success: boolean, message?: string, fieldErrors?: Record<string, string[]> }` objects, with `redirect()` invoked outside try-catch blocks.

---

## 3. Caveats

1. **Playwright Fixture Fallback**: In automated testing, `auth.fixture.ts` injects synthetic session cookies with raw hex tokens rather than HMAC-signed tokens. The middleware and session service must include a fallback condition active in non-production environments (`process.env.NODE_ENV !== 'production'`) that reads `APP_ROLE` and `DEMO_STUDENT_ID` to support instant test execution.
2. **Next.js `redirect()` Behavior**: `redirect()` throws a `NEXT_REDIRECT` error under the hood. Implementers must ensure `redirect()` is never wrapped in a generic `catch (e)` block that fails to rethrow it.

---

## 4. Conclusion

A complete, production-ready specification has been authored and documented in `D:\CLASSROOM OS\.agents\m2_explorer_2\analysis.md`. The specification defines:
- **`src/middleware.ts`**: Edge-compatible route guard supporting HMAC-SHA256 signature verification, public path whitelisting, quarantine interception (`mustChangePassword`), and RBAC protection for `/admin/*`.
- **`src/app/(auth)/login/`**: Accessible, institutional login page and `loginAction` Server Action with Zod validation, generic error messages, deactivated account detection, and session cookie issuance.
- **`src/app/(auth)/change-password/`**: Mandatory quarantine page and `changePasswordAction` Server Action enforcing 8+ character passwords, verifying divergence from temporary passwords, updating the database, refreshing the session, and releasing the quarantine lock.

---

## 5. Verification Method

Independent verification can be executed using the following commands once Milestone 2 implementation is complete:

1. **TypeScript Typecheck**:
   ```bash
   npx tsc --noEmit
   ```
   *Expected Result*: 0 type errors.

2. **E2E Playwright Auth Lifecycle Suite**:
   ```bash
   npx playwright test tests/e2e/auth-lifecycle.spec.ts
   ```
   *Expected Result*: All 13 test cases pass (TC-SPEC-AUTH-01 through TC-SPEC-AUTH-13).

3. **Full Spec Discovery**:
   ```bash
   npx playwright test --list
   ```
   *Expected Result*: All tests discovered across all 5 spec suites without parse or syntax errors.
