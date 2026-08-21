# A6 Report — syllabus.ts auth + revalidation remediation

**Date:** 2026-08-21
**Branch:** fix/security-remediation
**Owner scope:** `src/features/subjects/actions/syllabus.ts` (only file edited)

## STATUS: COMPLETE

## Files changed
- `src/features/subjects/actions/syllabus.ts`

## Fix 1 — Audit C1: unauthenticated server actions

Added `await requireAuth(["TEACHER", "ADMIN"])` as the first statement of all three actions, following the pattern at `src/features/users/actions/accounts.ts:113` (try/catch returning an `ActionState` failure so form consumers get a graceful unauthorized message instead of an unhandled throw):

- `addCourseUnit` (syllabus.ts:23-27)
- `addCourseChapter` (syllabus.ts:73-77)
- `addCourseMaterial` (syllabus.ts:125-129)

Import added at syllabus.ts:6: `import { requireAuth } from "@/lib/auth/session";` (same module as accounts.ts).

## Fix 2 — Audit IMPORTANT: stale admin cache invalidation

Each action's existing `revalidatePath("/subjects", "layout")` was kept and supplemented with `revalidatePath("/admin/subjects/[id]", "page")` so edits made via student-facing pages also invalidate the admin subject detail page:

- `addCourseUnit`: syllabus.ts:56-57
- `addCourseChapter`: syllabus.ts:106-107
- `addCourseMaterial`: syllabus.ts:154-155

Verified against bundled Next.js docs (`node_modules/next/dist/docs/01-app/03-api-reference/04-functions/revalidatePath.md`): signature is `revalidatePath(path, type?: 'page' | 'layout')`; a dynamic-segment path with `'page'` type requires the type param, which is provided. Target route confirmed to exist at `src/app/(admin)/admin/subjects/[id]/page.tsx`.

## Gate evidence

```
npx tsc --noEmit
EXIT_CODE=0
```

## Constraints honored
- Edited only `src/features/subjects/actions/syllabus.ts`
- No git commit performed
- No dev servers started
