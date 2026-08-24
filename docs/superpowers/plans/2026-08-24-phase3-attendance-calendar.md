# Phase 3: Attendance Calendar + Insights Hub — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:subagent-driven-development or executing-plans.

**Goal:** Monthly color-coded attendance calendar for students, subject-wise breakdown, chronic-absentee flagging, admin defaulter list — all paired with the existing what-if calculator in an "Attendance Insights" hub.

**Architecture:** No schema changes. One aggregate LEFT JOIN query per month (never per-day queries); day-status precedence resolved in pure `attendanceRules.ts` shared by server + client so the % formula matches the existing what-if calculator exactly.

**Spec:** Council blueprint (hy3). Key rules: day precedence absent > late > present > excused > unmarked > no-class; `% = (present+late)/(total-excused)`; chronic = trailing-window or semester pct < 75; unmarked ≠ absent (never penalize).

## Global Constraints
- Timezone: convert epoch → local `YYYY-MM-DD` via ONE central `dateKey()` (institution TZ), never viewer-local.
- Future sessions always "unmarked"; excluded from defaulter scans (`cs.date <= now`).
- Calendar grid always 42 cells (6×7) for stable layout; legend uses text labels (a11y, not color alone).

### Task 1: Rules module (TDD)
**Files:** Create `src/features/attendance/lib/attendanceRules.ts` (+ test)
- `resolveDayStatus(statuses[])`, `computeAttendancePct(stats)` (MUST match what-if calc — verify first), `isChronic(pct, 75)`, `dateKey(epoch)`
- [ ] Tests green; commit `feat(attendance): shared attendance rules`

### Task 2: Query layer
**Files:** Create/extend `src/features/attendance/lib/queries.ts`
- `getStudentMonthAttendance(studentId, year, month)` — single query: classSessions JOIN enrollments LEFT JOIN attendance for month range
- `getStudentSemesterStats`, `getSubjectBreakdown`, `getDefaulters(faculty?, semester?, section?)` — grouped aggregate with SUM CASE
- Add index on classSessions(date, subjectId) if missing (migration 0012 if needed)
- [ ] Commit `feat(attendance): calendar + defaulter queries`

### Task 3: Calendar components
**Files:** `components/{calendar-grid.tsx,calendar-day.tsx,calendar-legend.tsx,month-navigator.tsx,day-tooltip.tsx,subject-breakdown.tsx}`
- Colors: emerald present / rose absent / amber late / sky excused / zinc-100 no-class / zinc-300 unmarked
- MonthNavigator pushes `?year=&month=` (shareable, SSR-correct); tooltips list per-session subject+status
- [ ] Commit `feat(attendance): calendar grid components`

### Task 4: Pages + hub + defaulters
**Files:** `/attendance/calendar/page.tsx` (student), `/attendance/insights/page.tsx` (hub pairing calendar with existing WhatIfCalculator, seeded with current %), `/admin/attendance/defaulters/page.tsx` (DefaulterList table, sortable, chronic badge, filters)
- [ ] Playwright: month nav, tooltip content, defaulter filter, non-admin 403
- [ ] Commit `feat(attendance): insights hub + admin defaulters`
