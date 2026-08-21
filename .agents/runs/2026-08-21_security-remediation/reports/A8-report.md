# A8 Report — Server-side RBAC guards in role layouts (audit C1/C3)

**Date:** 2026-08-21
**Branch:** `fix/security-remediation`
**Scope:** Exactly four layout files. No page.tsx touched. No commits made.

## Problem

The admin, student, teacher, and CR route areas were guarded only by `proxy.ts` (middleware). Per Next 16 docs, proxy alone is insufficient — server components in these areas could render without an authenticated, role-checked session.

## Fix

Added a server-side guard at the top of each layout (server component), following the exact pattern from `src/app/(admin)/admin/accounts/page.tsx:17` (`const user = await requireAuth([...roles])`, imported from `@/lib/auth`). Each layout was converted to `async`, and `export const dynamic = "force-dynamic"` was added to match the reference pattern and prevent static prerendering of guarded chrome.

| File | Roles allowed |
|---|---|
| `src/app/(admin)/admin/layout.tsx` | `["ADMIN"]` |
| `src/app/(student)/layout.tsx` | `["STUDENT", "CR", "TEACHER", "ADMIN"]` (teachers view student pages per nav) |
| `src/app/(teacher)/teacher/layout.tsx` | `["TEACHER", "ADMIN"]` |
| `src/app/(cr)/cr/layout.tsx` | `["CR", "ADMIN"]` |

Each guard is placed above the return; layouts that previously rendered client-side chrome only now perform the auth check server-side before rendering.

## Evidence

- Reference pattern confirmed: `src/app/(admin)/admin/accounts/page.tsx:17` → `const currentUser = await requireAuth(["ADMIN"]);`
- `requireAuth(allowedRoles?: string[]): Promise<SessionUser>` confirmed at `src/lib/auth/session.ts:289`.
- Gate: `npx tsc --noEmit` → **exit code 0**.
- Files modified (only):
  - `src/app/(admin)/admin/layout.tsx`
  - `src/app/(student)/layout.tsx`
  - `src/app/(teacher)/teacher/layout.tsx`
  - `src/app/(cr)/cr/layout.tsx`

## Status

DONE
