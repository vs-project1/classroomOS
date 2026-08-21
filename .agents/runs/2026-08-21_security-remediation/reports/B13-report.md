# B13 Report — Audit C4: Cross-student dispute filing in `submitAttendanceCorrectionAction`

**File:** `src/features/attendance/actions/dispute.ts` (only file touched)
**Branch:** `fix/security-remediation`
**Date:** 2026-08-21

## STATUS: DONE

## Problem (audit C4)

`submitAttendanceCorrectionAction` correctly scoped its lookup to the caller's `studentId` (:90-95), but line :98 then accepted ANY attendance id:

```ts
const validAttendanceId = targetAttendance?.id || (await db.query.attendance.findFirst({ where: eq(attendance.id, attendanceId) }))?.id;
```

The unscoped `findFirst` fallback meant a student could submit a correction request against another student's attendance record. Additionally, identity resolution contained a "first student in DB" fallback, so any authenticated user without a student profile was silently mapped to an arbitrary student.

## Fix

1. **Auth gate:** first line is now `await requireAuth(["STUDENT", "CR"])` (post-T1.1 pattern from `src/lib/auth/session.ts:289`, same as `src/features/assignments/actions/assignments.ts:41`). Replaces the manual `getCurrentUser()` + null check; unauthenticated/deactivated/wrong-role callers are redirected before any logic runs.
2. **Identity must resolve or reject:** removed the "Fallback to demo / first student" block entirely. Legitimate resolution paths kept (studentProfileId → rollNumber → students.id; email → students.id; user.id → students.id); unresolved identity returns `{ success:false, message:"Student academic profile not found." }`.
3. **Ownership enforcement (C4):** removed the unscoped `findFirst` fallback and `validAttendanceId` entirely. Now:

```ts
if (!targetAttendance || targetAttendance.studentId !== studentId) {
  return { success: false, message: "Attendance record not found" };
}
```

Insert now uses `attendanceId: targetAttendance.id` / `studentId: targetAttendance.studentId` (guaranteed owned), eliminating the old `targetAttendance ? ... : studentId` conditional.
4. **Info-leak hardening (role contract priority #6):** catch block no longer returns raw `err.message` to clients; generic message returned, error logged server-side only.

## Before / After

### Before

```ts
const user = await getCurrentUser();
if (!user) {
  return { success: false, message: "Unauthorized. Please log in." };
}
...
// Fallback to demo / first student if running tests
if (!studentId) {
  const firstStudent = await db.query.students.findFirst();
  if (firstStudent) studentId = firstStudent.id;
}
...
// If specific attendance id not found for student, verify if attendanceId exists at all or match by id
const validAttendanceId = targetAttendance?.id || (await db.query.attendance.findFirst({ where: eq(attendance.id, attendanceId) }))?.id;

if (!validAttendanceId) {
  return { success: false, message: "Selected attendance session record not found." };
}
...
attendanceId: validAttendanceId,
studentId: targetAttendance ? targetAttendance.studentId : studentId,
...
message: err instanceof Error ? err.message : "Failed to record dispute request.",
```

### After

```ts
const user = await requireAuth(["STUDENT", "CR"]);
...
if (!studentId) {
  return { success: false, message: "Student academic profile not found." };
}
...
// Verify attendance record
const targetAttendance = await db.query.attendance.findFirst({
  where: and(
    eq(attendance.id, attendanceId),
    eq(attendance.studentId, studentId)
  ),
});

if (!targetAttendance || targetAttendance.studentId !== studentId) {
  return { success: false, message: "Attendance record not found" };
}
...
attendanceId: targetAttendance.id,
studentId: targetAttendance.studentId,
...
message: "Failed to record dispute request.",
```

## Verification evidence

- `npx tsc --noEmit` → exit code **0** (`EXIT=0`).
- No other files modified; no commits made; no dev servers started.
- `requireAuth` import sourced from `@/lib/auth/session` (canonical export used by notice/routine/users/subjects actions).
- `redirect()` thrown by `requireAuth` occurs outside the try/catch, so NEXT_REDIRECT digests propagate untouched (role contract priority #6).

## Edge cases still uncovered

- No unit/integration test added for the cross-student rejection path (no test harness exists for this action in-repo); behavior verified by code inspection + typecheck only.
- Rate limiting on dispute submissions remains out of scope.
- `resolveCurrentStudent()` in `src/lib/auth/index.ts:42` still contains a non-production `DEMO_STUDENT_ID` cookie/env override — unused by this action, flagged for the security-guard's T-track.
