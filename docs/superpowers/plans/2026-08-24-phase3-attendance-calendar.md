# Phase 3: Attendance Calendar View — Implementation Plan

> Council-synthesized (5 free models). Verify with `npx tsc --noEmit` per task.

**Goal:** Month-grid attendance calendar color-coded by status, chronic-absentee flag, sibling of the existing what-if calculator.

## Resolved Decisions
- **Custom Tailwind grid — NO library.** Calendars libs are date *pickers*; we render statuses. ~60 lines of date math + `grid grid-cols-7 aspect-square`.
- **Query: one round-trip.** LEFT JOIN `classSessions` → `attendance` filtered by studentId + month range; group into `Record<'YYYY-MM-DD', {status, subject}[]>` in JS. Unmarked scheduled days surface for free via LEFT JOIN.
- **Navigation: URL searchParams** `?month=2026-08` via prev/next `<Link>` — shareable, back-button correct, SSR-friendly. Zod-parse, default current month.
- **Chronic absentee: ≥10% absences term-to-date** (US ESSA standard), computed server-side in query layer over sessions since session/term start. Constant `CHRONIC_ABSENCE_RATE = 0.10`.
- **Colors:** present=`emerald`, absent=`rose`, late=`amber`, excused=`sky` (excused ≠ failure — don't use red). Today: `ring-2 ring-indigo-500` + bold numeral. Out-of-month cells muted non-interactive. Legend fixed at bottom.
- **Route:** `/attendance/calendar` sibling of what-if page.

## Tasks

### Task 1: Query helpers
`src/features/attendance/calendar-queries.ts`: `getMonthAttendance(studentId, monthStart, monthEnd)` (LEFT JOIN, grouped map) + `getChronicAbsence(studentId, termStart)` returning `{rate, isChronic}`.

### Task 2: Date utils
Month grid math (start offset, weeks array, ISO keys) in `src/lib/date-utils.ts` or co-located; unit tests for edge months.

### Task 3: Grid components
`src/components/attendance/month-grid.tsx` (presentational) + `month-nav.tsx` (prev/next/today Links) + legend.

### Task 4: Page
`src/app/(student)/attendance/calendar/page.tsx` — server component, searchParams parsing, student self-view (+ ADMIN/TEACHER can pass ?studentId= with guard).

### Task 5: Nav + verify
Add "Calendar" to attendance nav (alongside Logs / What-If). tsc, lint, e2e smoke: month renders, navigation works, chronic badge appears for ≥10% absent student.
