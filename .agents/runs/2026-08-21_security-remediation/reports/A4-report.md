# A4 Report — Routine Actions Authentication (Audit C1)

**Date:** 2026-08-21
**Branch:** fix/security-remediation
**Owner scope:** `src/features/routine/actions/routine-actions.ts` (only file edited)

## STATUS: COMPLETE

## Problem (Audit C1)
`saveRoutine` and `deleteRoutine` server actions performed DB writes on `weeklyRoutine`
without any authentication or authorization check. Any unauthenticated caller could
create/update/delete routine slots.

## Fix Applied
Added `await requireAuth([...])` as the first statement of both actions, following the
pattern from `src/features/users/actions/accounts.ts:113`.

### Changes (`src/features/routine/actions/routine-actions.ts`, +9 lines)
1. **Import added (line 11):**
   ```ts
   import { requireAuth } from "@/lib/auth/session";
   ```
2. **`saveRoutine` (line 41):** guard as first statement; try/catch returns form-state
   error (mirrors accounts.ts:113-116, appropriate for a useActionState-style action):
   ```ts
   try {
     await requireAuth(["TEACHER", "ADMIN"]);
   } catch {
     return { success: false, message: "Unauthorized. Teacher or Admin role required." };
   }
   ```
3. **`deleteRoutine` (line 114):** bare guard as first statement (mirrors
   accounts.ts:313 `resetPasswordAction`, appropriate for a non-state action); lets
   `requireAuth`'s redirect propagate naturally:
   ```ts
   await requireAuth(["TEACHER", "ADMIN"]);
   ```

## Role List Deviation — Verified Against RBAC (intentional)
Task suggested `["STUDENT","CR","ADMIN"]` but instructed to verify against
`src/lib/auth/rbac.ts` grants and align. Verification result:

| Role    | `canManageRoutine` (rbac.ts) | Evidence      |
|---------|------------------------------|---------------|
| ADMIN   | true                         | rbac.ts:23    |
| TEACHER | true                         | rbac.ts:36    |
| CR      | false                        | rbac.ts:49    |
| STUDENT| false                        | rbac.ts:62    |

The suggested list contradicts the RBAC matrix (STUDENT and CR are explicitly denied).
The UI also gates all routine manage controls behind `permissions.canManageRoutine`
(`src/app/(student)/routine/page.tsx:47,64,121`). Aligned role list is therefore
`["TEACHER", "ADMIN"]`, matching existing codebase convention for this grant set
(e.g., `requireAuth(["TEACHER", "ADMIN"])` in teacher pages and
`src/features/resources/actions/resources.ts:20`).

`requireAuth` semantics verified at `src/lib/auth/session.ts:289`: redirects to `/login`
if unauthenticated/inactive, to `/change-password` if password change pending, and to
the role's home if role not in allowlist — deny by default.

## Evidence / Verification
- Gate: `npx tsc --noEmit` → **exit code 0** (TSC_EXIT=0 captured in shell output).
- Post-edit read confirms guards present at lines 41-46 and 114-115.
- `git status`: only `src/features/routine/actions/routine-actions.ts` modified by this
  agent (+9 lines per `git diff --stat`); other dirty files belong to parallel agents
  on the shared branch. No commits made. No dev servers started.

## Residual Notes (out of scope, not changed)
- `saveRoutine`/`deleteRoutine` remain global (not per-user scoped) — any TEACHER/ADMIN
  can edit any slot; consistent with current RBAC model and page behavior.
- The try/catch in `saveRoutine` swallows Next.js redirect errors from `requireAuth`,
  surfacing "Unauthorized" as form state instead of redirecting — identical to the
  sanctioned pattern in accounts.ts:113-116.
