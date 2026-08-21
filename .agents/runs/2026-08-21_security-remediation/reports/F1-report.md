# F1 Report — Server Action Auth-Guard Hoisting + NEXT_REDIRECT Rethrow

**Date:** 2026-08-21
**Branch:** fix/security-remediation
**Scope:** Mechanical fix, 6 files, 12 actions touched. No commit made.

## Reference pattern (copied from src/features/resources/actions/resources.ts)

1. `await requireAuth([...])` hoisted as FIRST statement, OUTSIDE any `try`.
2. Each catch block begins with:
   ```ts
   if (error && typeof error === "object" && "digest" in error && String(error.digest).startsWith("NEXT_REDIRECT")) throw error;
   ```

## Changes per file

### 1. src/features/assignments/actions/assignments.ts
- `saveSubmissionDraftAction` (~:80): added explicit `await requireAuth(["STUDENT", "CR"])` as first statement before the `try`; `resolveCurrentStudentId()` kept inside try. Digest rethrow added at top of catch (~:137).
- `submitAssignmentAction` (~:151): same hoist; digest rethrow added (~:226).

### 2. src/features/events/actions/event-actions.ts
- `createEvent` (:31-38): removed swallowing try/catch around `requireAuth(["ADMIN","TEACHER"])`; guard now hoisted as plain first statement. Digest rethrow added in db-insert catch.

### 3. src/features/routine/actions/routine-actions.ts
- `saveRoutine` (:42-46): removed swallowing try/catch around `requireAuth(["TEACHER","ADMIN"])`; guard hoisted. Digest rethrow added in db catch.
- `deleteRoutine` (:115-122): guard was already hoisted; added missing digest rethrow in catch.

### 4. src/features/subjects/actions/syllabus.ts (×3)
- `addCourseUnit`, `addCourseChapter`, `addCourseMaterial`: each swallowing try/catch around `requireAuth(["TEACHER","ADMIN"])` replaced with hoisted plain await; digest rethrow added to each db catch.

### 5. src/features/users/actions/teacher-actions.ts
- `saveTeacher` (:54-58): guard hoisted out of try/catch; digest rethrow added in main catch (before UNIQUE-constraint handling).
- `deleteTeacher` (:118-122): guard hoisted out of try/catch; digest rethrow added in catch.

### 6. src/features/users/actions/student-actions.ts
- `createStudent` (:53-57): guard hoisted out of try/catch; digest rethrow added in catch.
- `updateStudent` (:100-104): guard hoisted out of try/catch; digest rethrow added in catch.

## Behavior preservation

- Non-redirect errors keep each function's existing return shape (`{ success, message }` / `{ success, fieldErrors }`) and console.error logging — rethrow line precedes all other handling.
- Unauthenticated/unauthorized callers now propagate the NEXT_REDIRECT digest instead of receiving a JSON-style "Unauthorized" state that leaked role info and broke client-side redirect flows.
- Note: routine file lives at `src/features/routine/actions/routine-actions.ts` (singular), not `routines`.

## Gate

- `npx tsc --noEmit` → exit code 0 (pass).
- `git diff --stat` confirms edits confined to the six target files (other dirty files on branch pre-date this task and were untouched).
