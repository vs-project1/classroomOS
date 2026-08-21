# Domain Brief: Authentication & Authorization

## Purpose
Identity (email + scrypt), HMAC session tokens, RBAC (ADMIN/TEACHER/CR/STUDENT), and the `requireAuth`
gate that every server action/page must open with. Read this before touching any action file.

## Key files
- `src/lib/auth/session.ts` — `getCurrentUser` (:228), `requireAuth` (:306), `createSession` (:26),
  `revokeUserSessions` (:340), `invalidateSession` (:348)
- `src/lib/auth/token.ts` — HMAC-SHA256 sign/verify; prod fails closed without SESSION_SECRET (:8-13);
  `getSessionTokenId` SHA-256 digest (:27)
- `src/lib/auth/password.ts` — scrypt hash/verify timing-safe (:22,:47); temp password generator (:80)
- `src/lib/auth/index.ts` — `getCurrentRole` (:14), `resolveCurrentStudent` (:42)
- `src/lib/auth/rbac.ts` — ROLE_PERMISSIONS matrix (:17); dead `can()` (:98)
- `src/features/auth/actions/auth.ts` — loginAction (:28), changePasswordAction (:130), logoutAction (:218)
- `src/proxy.ts` — edge middleware: login redirect, quarantine, admin RBAC (:34-114)
- Role layouts with server-side guards (A8): `src/app/(admin)/admin/layout.tsx`,
  `src/app/(student)/layout.tsx`, `src/app/(teacher)/teacher/layout.tsx`, `src/app/(cr)/cr/layout.tsx`

## Invariants
1. **Every action starts with requireAuth OUTSIDE try/catch** — it throws NEXT_REDIRECT via redirect()
   (session.ts:306-334); a swallowing catch converts redirects into error states. Canonical: first
   statement of the action (dispute.ts:29; resources.ts:18-24 post-B15; A5 report rationale). If a catch
   must wrap fallible code, rethrow digests first:
   `if ((error as {digest?:string})?.digest?.startsWith("NEXT_REDIRECT")) throw error`
   (session-actions.ts:192-195).
2. **Identity resolution default-deny (post-T1.1)** — no first-student fallbacks anywhere:
   `resolveCurrentStudent()` returns null (index.ts:64); `resolveCurrentStudentId()` throws
   (assignments.ts:70). Fixture cookies APP_ROLE/DEMO_STUDENT_ID honored only when
   NODE_ENV !== "production" (index.ts:19,52; session.ts:78; proxy.ts:13,54).
3. **Anonymous getCurrentRole() = "STUDENT"** least privilege (index.ts:28). Role presence is NOT proof of
   authentication — use getCurrentUser()/requireAuth.
4. **Sessions-table revocation per S10** — every login inserts a `sessions` row keyed by token SHA-256
   (session.ts:56-60; schema.ts:496-507); getCurrentUser hard-denies missing/expired rows, deliberately no
   fixture fallback (session.ts:243-249). Password reset + deactivation evict (accounts.ts:299,342);
   logout deletes its own row (session.ts:352-356).

## Known sharp edges (UNFIXED unless noted)
- Temp passwords ≈6 bits entropy via Math.random (password.ts:80-85) — review C5.
- No login rate limiting (auth.ts:50-103) — review C5.
- change-password: currentPassword optional (auth.ts:110,:170-178) — review C7; AND old session row not
  evicted on change (S10 deferred #1; auth.ts:199-203) — PLANNED follow-up.
- Edge middleware validates HMAC+expiry only, no DB revocation check (proxy.ts:48-51; S10 deferred #2):
  revoked users reach edge-permitted shells but retrieve no authenticated data.
- One-time global logout at deploy: pre-S10 cookies have no rows (S10 report §Migration).
- Submission actions call resolveCurrentStudentId INSIDE try (assignments.ts:81,:149) → auth redirects are
  swallowed into {success:false}. Deny still works; UX degrades.
- Two conflicting dead can() modules: src/lib/authorization/can.ts:29 vs src/lib/auth/rbac.ts:98;
  neither is imported anywhere.

## Changelog
- 2026-08-21: T1.1 default-deny identity; S10 sessions table + revocation; A8 layout guards; A1–A7 action
  gates. Sources: `.agents/runs/2026-08-21_security-remediation/reports/{T1.1,S10,A1-A8}-report.md`;
  `docs/reviews/2026-08-21-full-codebase-review.md`.
