# A3 Report — Event actions authentication (audit C1)

**Date:** 2026-08-21
**Branch:** fix/security-remediation
**Agent:** A3 (scoped: `src/features/events/actions/event-actions.ts` only)

## STATUS: DONE

## Problem (audit C1)
`createEvent` (:29) and `deleteEvent` (:80) had no server-side auth check — any caller (including anonymous) could create or delete events via direct action invocation. Page-level guards alone are not authorization.

## Files changed
`src/features/events/actions/event-actions.ts`
- Added `import { requireAuth } from "@/lib/auth/session"`.
- `createEvent`: first statement is now the accounts.ts:113 pattern — `try { await requireAuth(["ADMIN", "TEACHER"]) } catch { return { success: false, message: "Unauthorized. Admin or Teacher role required." } }`.
- `deleteEvent`: first statement is now `await requireAuth(["ADMIN"]);` (unguarded, so unauthorized/anonymous callers are redirected, matching the toggleAccountStatusAction pattern).

## Role sets chosen + rbac justification
- **createEvent → `["ADMIN", "TEACHER"]`**
  The dispatch assumed CR-createable and instructed to verify against `src/lib/auth/rbac.ts`. Verified: `ROLE_PERMISSIONS.CR.canCreateEvents = false` (rbac.ts:54), while ADMIN (rbac.ts:28) and TEACHER (rbac.ts:41) are true. Per instruction ("align roles if it differs"), CR was **excluded**. This also closes the exposed `/student/events/new` form route: students could previously reach a working create form; the server action now denies STUDENT regardless of UI.
- **deleteEvent → `["ADMIN"]` (strictest defensible)**
  rbac has no event-delete permission flag, and the `events` table has no ownership column (`createdBy` absent — schema.ts), so creator-only deletion is not implementable without a schema change (out of scope). Deletion is destructive and global; creation permission (TEACHER) does not imply delete rights. ADMIN-only is the strictest set that keeps the existing admin UI (`/admin/events`) functional.

## Call-site coverage
Both local re-export shims — `src/app/(admin)/admin/events/actions.ts` and `src/app/(student)/events/actions.ts` — are `export * from "@/features/events/actions/event-actions"`, so all delete buttons (admin + student routes) and both create forms inherit these guards. No other callers exist (grep verified).

## Verification evidence
- Gate: `npx tsc --noEmit` → **exit 0**.
- No git commit made (per rules); changes left unstaged on `fix/security-remediation`.

## Residual risk / follow-ups
- `deleteEvent` swallows DB errors silently (pre-existing catch with console.error only) — cosmetic, not security.
- If product intent is CR-createable events, fix the rbac matrix AND this guard together in one change; today's code and rbac now agree on ADMIN+TEACHER.
- Events lack an ownership column; if teacher-scoped deletion is ever required, add `created_by` + creator-or-admin check.
