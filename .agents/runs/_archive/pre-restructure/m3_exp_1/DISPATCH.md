# Milestone 3 Explorer 1 Dispatch: Attendance Domain & Barometer Hub

## Identity & Role
You are `m3_exp_1`, a `teamwork_preview_explorer`.
Working Directory: `D:\CLASSROOM OS\.agents\m3_exp_1`

## Inputs
- Authoritative User Request: `D:\CLASSROOM OS\.agents\ORIGINAL_REQUEST.md`
- Project Index: `D:\CLASSROOM OS\PROJECT.md`
- Test Spec: `tests/e2e/attendance-barometer.spec.ts`
- Current Schema: `src/db/schema.ts`

## Mission & Investigation Scope
Investigate requirements and technical strategy for the TU 80% Attendance Domain Service and `/attendance` page:
1. **Domain Service (`src/lib/attendance.ts`)**:
   - Exact mathematical formulas for Tribhuvan University 80% attendance rule:
     - Percentage: $P = \frac{\text{attended}}{\text{total}} \times 100$.
     - Missable buffer: $\lfloor 1.25 \times \text{attended} - \text{total} \rfloor$ (if $P \ge 80\%$, else 0).
     - Recovery target: $\max(0, 4 \times \text{total} - 5 \times \text{attended})$ (if $P < 80\%$, else 0).
     - Category: `SAFE` ($\ge 80\%$), `CAUTION` ($75\% \le P < 80\%$), `DANGER` ($P < 75\%$).
   - "What-If" projection calculator: simulate adding future attended and missed classes.
2. **Attendance UI (`src/app/(student)/attendance/page.tsx`)**:
   - Overall semester attendance barometer gauge card with color-coded category chips (`SAFE`, `CAUTION`, `DANGER`).
   - Subject-wise attendance breakdown table/cards (showing subject code, name, attended/total, percentage, missable/recoverable count).
   - Attendance session history log.
   - Interactive "What-If Projection Calculator" card with sliders/inputs for hypothetical attended/missed classes.
   - "Report Attendance Dispute / Correction" dialog & server action inserting into `attendance_correction_requests`.
3. Review `tests/e2e/attendance-barometer.spec.ts` to ensure all data-testid locators and user flows match.

Write your findings and technical recommendations to `D:\CLASSROOM OS\.agents\m3_exp_1\handoff.md`.
Notify parent (`81194be9-fd5f-431c-b294-ad7fc2da9ec6`) via send_message when done.

## 2026-08-18T02:01:54Z
You are m3_exp_1, a teamwork_preview_explorer.
Working Directory: D:\CLASSROOM OS\.agents\m3_exp_1
Read D:\CLASSROOM OS\.agents\ORIGINAL_REQUEST.md, D:\CLASSROOM OS\PROJECT.md, D:\CLASSROOM OS\src\db\schema.ts, tests/e2e/attendance-barometer.spec.ts, and D:\CLASSROOM OS\.agents\m3_exp_1\DISPATCH.md.
Investigate the TU 80% Attendance Domain calculation rules (percentage, missable buffer 1.25A - T, recovery 4T - 5A, SAFE/CAUTION/DANGER zones, What-If projection calculator) and the /attendance page (barometer gauge, subject breakdown, history logs, correction dispute modal & server action).
Write your complete technical exploration report to D:\CLASSROOM OS\.agents\m3_exp_1\handoff.md.
Notify parent (81194be9-fd5f-431c-b294-ad7fc2da9ec6) via send_message when done.

