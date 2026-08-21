# A7 Report — users actions auth + error-shape remediation

**Date:** 2026-08-21
**Branch:** fix/security-remediation
**Agent scope:** src/features/users/actions/teacher-actions.ts, src/features/users/actions/student-actions.ts

## STATUS: COMPLETE

## Files changed (only owned files)

1. `src/features/users/actions/teacher-actions.ts`
2. `src/features/users/actions/student-actions.ts`

`accounts.ts` NOT touched (verified via `git status --porcelain` — no entry for any accounts.ts).

## Fixes

### (a) Audit C1 — unauthenticated server actions

Added `await requireAuth(["ADMIN"])` as first statement of all four actions, following the
pattern at `accounts.ts:113` (try/catch returning `{ success: false, message: "Unauthorized. Admin role required." }`):

| File | Action | Guard location |
|---|---|---|
| teacher-actions.ts | `saveTeacher` | first statement (now :53) |
| teacher-actions.ts | `deleteTeacher` | first statement (now :121) |
| student-actions.ts | `createStudent` | first statement (now :52) |
| student-actions.ts | `updateStudent` | first statement (now :99) |

Import added to both files: `import { requireAuth } from "@/lib/auth/session";`
(same module used by accounts.ts:8 and notice-actions.ts:10).

### (b) Audit IMPORTANT — deleteTeacher swallowed errors

`deleteTeacher` previously returned `void` and silently caught errors. Now returns
`Promise<TeacherActionState>` — shape consistent with siblings:

- success → `{ success: true, message: "Teacher deleted successfully." }`
- generic failure → `{ success: false, message: "Something went wrong. Please try again." }` (console.error retained)
- unauthorized → `{ success: false, message: "Unauthorized. Admin role required." }`

Caller compatibility verified: sole caller `src/app/(admin)/admin/teachers/delete-button.tsx:14`
does `await deleteTeacher(id);` discarding the result; re-export
`src/app/(admin)/admin/teachers/actions.ts` is a plain `export *`, so no signature break.

### (c) Audit IMPORTANT — saveTeacher redirected to nonexistent "/teachers"

- `redirect("/teachers")` → `redirect("/admin/teachers")` (route exists:
  `src/app/(admin)/admin/teachers/page.tsx`; no `/teachers` route exists).
- Also updated the matching stale `revalidatePath("/teachers")` calls to
  `revalidatePath("/admin/teachers")` in `saveTeacher` and `deleteTeacher` — same root cause
  (nonexistent path), required for fix (c) to actually show fresh data on the new target.
  `/subjects` and `/routine` revalidates left as-is. Flagging for orchestrator awareness since
  the audit item named only the redirect.

## Verification / Evidence

- Gate: `npx tsc --noEmit` → exit code **0** (`TSC_EXIT=0` captured).
- `git diff -- <two files>` reviewed; changes limited to imports, four auth guards,
  deleteTeacher return shape, redirect/revalidate paths.
- Next.js docs check per AGENTS.md (`node_modules/next/dist/docs/01-app/.../redirect.md`):
  `redirect` API unchanged for this version; call remains outside try/catch as required
  ("redirect throws an error so it should be called outside the try block").
- No git commit performed. No dev servers started.

## Notes for orchestrator

- `saveTeacher` still types `prevState: any` (pre-existing); left untouched to keep diff minimal.
- `updateStudent` dynamically imports drizzle `eq` inside its try block (pre-existing style); untouched.
