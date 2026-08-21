# Domain Brief: Attendance

## Purpose
Attendance rows are written ONLY inside the createSession transaction (see sessions.md). This domain covers
the student attendance hub, correction/dispute requests, and the TU 80% barometer projection.

## Key files
- `src/features/attendance/actions/dispute.ts` — submitAttendanceCorrectionAction (:25)
- `src/features/attendance/calculations/attendance-projection.ts` — barometer math (:66-85)
- `src/features/attendance/components/correction-dialog.tsx`, `what-if-calculator.tsx`
- `src/app/(student)/attendance/page.tsx` — hub; handles null identity ("No Student Context Found")

## Invariants
1. Disputes gated `await requireAuth(["STUDENT","CR"])` as first statement OUTSIDE try (dispute.ts:29) —
   post-B13; unauthenticated/deactivated/wrong-role callers redirect before any logic.
2. Ownership enforced: lookup scoped to BOTH `eq(attendance.id, attendanceId)` AND
   `eq(attendance.studentId, studentId)` (dispute.ts:81-86); mismatch → generic "Attendance record not
   found" (:88-90). The old unscoped findFirst fallback that allowed cross-student disputes (review C4)
   is removed.
3. Identity default-deny: unresolved student profile returns {success:false} (dispute.ts:59-61); the
   first-student fallback was deleted by B13.
4. No raw err.message reaches clients (dispute.ts:110-115) — B13 info-leak hardening.

## Known sharp edges (UNFIXED unless noted)
- Projection rounds percentage BEFORE the ≥threshold eligibility test (attendance-projection.ts:66 vs :81):
  79.5% rounds to 80 and is treated as eligible — review IMPORTANT.
- No rate limiting on dispute submissions (B13 residual #2).
- NPT timezone helpers are dead code (review IMPORTANT); attendance dates inherit the UTC/local hazards
  documented in assignments.md and sessions.md.
- Attendance correctness depends on createSession's school-wide roster contract (sessions.md edge #1):
  rows exist for every student in school, not per subject enrollment.
- No automated test covers the cross-student rejection path (B13 residual #1) — behavior verified by code
  inspection + tsc only.

## Changelog
- 2026-08-21: B13 closed C4 cross-student dispute filing + client error leak. Sources: report B13;
  docs/reviews/2026-08-21-full-codebase-review.md.
