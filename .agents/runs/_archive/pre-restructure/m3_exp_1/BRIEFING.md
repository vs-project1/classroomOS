# BRIEFING — 2026-08-18T02:01:54Z

## Mission
Investigate the Tribhuvan University 80% Attendance Domain calculation engine, What-If simulation calculator, and /attendance student workspace including barometer gauge, subject matrix, history logs, and correction dispute flow.

## 🔒 My Identity
- Archetype: teamwork_preview_explorer
- Roles: explorer, synthesizer
- Working directory: D:\CLASSROOM OS\.agents\m3_exp_1
- Original parent: 81194be9-fd5f-431c-b294-ad7fc2da9ec6
- Milestone: Milestone 3 (Academic Domain & Primary Student Views)

## 🔒 Key Constraints
- Read-only investigation — do NOT implement in src/ directly
- Investigate TU 80% Attendance Domain calculation rules (percentage, missable buffer 1.25A - T, recovery 4T - 5A, SAFE/CAUTION/DANGER zones, What-If projection calculator)
- Investigate /attendance page (barometer gauge, subject breakdown, history logs, correction dispute modal & server action)
- Ensure exact alignment with tests/e2e/attendance-barometer.spec.ts and tests/fixtures/pom/attendance.page.ts
- Write handoff report to D:\CLASSROOM OS\.agents\m3_exp_1\handoff.md
- Notify parent (81194be9-fd5f-431c-b294-ad7fc2da9ec6) via send_message when done

## Current Parent
- Conversation ID: 81194be9-fd5f-431c-b294-ad7fc2da9ec6
- Updated: not yet

## Investigation State
- **Explored paths**:
  - `src/db/schema.ts` (attendance, attendance_correction_requests, class_sessions, subjects, enrollments)
  - `tests/e2e/attendance-barometer.spec.ts` & `tests/fixtures/pom/attendance.page.ts`
  - `src/app/(student)/attendance/page.tsx`
  - `src/components/student/attendance-gauge.tsx`
  - `src/app/(student)/page.tsx`
  - `src/db/seed.ts` & `scripts/seed-e2e.ts`
  - `PROJECT.md` & `graphify-out/GRAPH_REPORT.md`
- **Key findings**:
  - `src/lib/attendance.ts` does not yet exist and needs to be created with pure domain logic conforming to the contract in `PROJECT.md`.
  - The mathematical formulas for TU 80%: percentage $P = \frac{A}{T} \times 100$, missable buffer $\lfloor 1.25A - T \rfloor$, recovery target $\max(0, 4T - 5A)$, and zones (`SAFE`: $\ge 80\%$, `CAUTION`: $75\% \le P < 80\%$, `DANGER`: $P < 75\%$).
  - Current `/attendance/page.tsx` is a basic prototype lacking: What-If interactive calculator, Attendance session history log, Dispute correction modal & server action, color-coded status chips matching E2E selectors.
  - Dispute modal requires `textarea[name='reason']`, `select[name='requestedStatus']` (`present` | `excused`), submit button, and server action mutating `attendance_correction_requests`.
- **Unexplored areas**: None. Full specification and code recommendations ready for synthesis.

## Key Decisions Made
- Define precise pure function signatures and edge case handling for `src/lib/attendance.ts` (e.g., $T=0$ zero division guard, integer rounding, delta calculation).
- Detail complete component decomposition for `/attendance` page and client interactive widgets.
- Provide comprehensive proposed implementations for `src/lib/attendance.ts`, `src/app/(student)/attendance/page.tsx`, `src/app/(student)/attendance/what-if-calculator.tsx`, `src/app/(student)/attendance/correction-dialog.tsx`, and `src/app/(student)/attendance/actions.ts`.

## Artifact Index
- `.agents/m3_exp_1/BRIEFING.md` — Working memory and status
- `.agents/m3_exp_1/progress.md` — Liveness heartbeat
- `.agents/m3_exp_1/handoff.md` — Final technical exploration report
