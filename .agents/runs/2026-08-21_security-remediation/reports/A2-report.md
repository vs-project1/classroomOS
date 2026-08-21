# A2 Report — Audit C1: Unauthenticated notice server actions

- **Date:** 2026-08-21
- **Branch:** fix/security-remediation
- **Owner scope:** `src/features/notices/actions/notice-actions.ts` (only file edited)

## Problem

`createNotice` (:18), `deleteNotice` (:58), and `togglePinNotice` (:68) performed DB writes with no authentication check. Any caller could create, delete, or pin notices.

## Fix

Added `await requireAuth(["ADMIN"])` as the first statement of each of the three actions, mirroring the pattern at `src/features/users/actions/accounts.ts:113`. Added import `import { requireAuth } from "@/lib/auth/session";` (same source as accounts.ts:8). On failure `requireAuth` redirects (see `src/lib/auth/session.ts:289-312`), so no try/catch wrapper is needed in these actions.

## Changes

1. Import added after the drizzle import.
2. `createNotice`: first statement is now `await requireAuth(["ADMIN"]);`
3. `deleteNotice`: first statement is now `await requireAuth(["ADMIN"]);`
4. `togglePinNotice`: first statement is now `await requireAuth(["ADMIN"]);`

## Evidence

- `npx tsc --noEmit` → exit code **0** (gate passed).
- Diff limited to `src/features/notices/actions/notice-actions.ts`; no other files touched; no commits made; no dev servers started.

## Verification commands

```
npx tsc --noEmit   # EXIT=0
```
