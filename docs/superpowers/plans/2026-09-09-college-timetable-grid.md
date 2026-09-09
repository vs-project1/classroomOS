# Traditional College Timetable Grid Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task inline in this session. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Transform the cluttered Routine Management UI into a traditional college noticeboard timetable matrix (Option A: Days as Rows, Periods as Columns) featuring automatic adjacent double-period merging, recess/break dividers, clean single-line metadata, and cross-role synchronization across Admin, Student, CR, and Teacher.

**Architecture:** 
- A pure domain utility `matrix-utils.ts` extracts sorted period intervals, detects breaks $\ge 15$ minutes, and merges consecutive periods of identical subjects/rooms/teachers.
- A new `CollegeTimetableGrid` component renders the classic university schedule table with horizontal period columns, double-period spanning (`col-span-2`), and status badges.
- `RoutineView` integrates the noticeboard matrix as the default desktop view, offering a smooth toggle to Day Agenda view.
- Admin, Student, and Teacher routine pages are unified around this updated `RoutineView`.

**Tech Stack:** Next.js 16 (App Router), React 19, Tailwind CSS v4, Lucide Icons, TypeScript, Drizzle ORM.

## Global Constraints
- Timezone strictly `Asia/Kathmandu` (NPT).
- No schema alterations to `weekly_routine`.
- WCAG contrast compliance: high-contrast badges and clear text hierarchy.
- Zero TypeScript errors (`npx tsc --noEmit`).
- Rule of Zero Dead Code: purge all obsolete components and unused imports.

---

### Task 1: Create Timetable Matrix Domain Utilities

**Files:**
- Create: `src/components/timetable/matrix-utils.ts`
- Test: `scripts/test-matrix-utils.ts`

**Interfaces:**
```typescript
export type PeriodColumn = {
  id: string; // e.g. "p1", "break_1"
  label: string; // "Period 1" or "BREAK"
  startTime: string; // "06:25"
  endTime: string; // "07:15"
  isBreak?: boolean;
  durationMins: number;
};

export type TimetableCell = {
  slotId: string;
  subjectName: string;
  subjectCode?: string | null;
  startTime: string;
  endTime: string;
  room?: string | null;
  teacherName?: string | null;
  isLab?: boolean;
  notes?: string | null;
  status?: "upcoming" | "ongoing" | "completed";
  colSpan: number;
  isDoublePeriod?: boolean;
};

export type DayRowData = {
  dayName: string;
  dayIndex: number;
  isToday: boolean;
  cells: (TimetableCell | { isBreak: boolean; durationMins: number } | null)[];
};
```

- [ ] **Step 1: Write `src/components/timetable/matrix-utils.ts`**
Implement:
  - `computePeriodColumns(allSlots: RoutineSlotData[])`: Extracts unique periods sorted by `startTime`, inserts breaks for time gaps $\ge 15$m.
  - `buildDayMatrixRows(dayGroups: DayGroup[], periods: PeriodColumn[])`: Maps each day's slots into period columns, merging adjacent periods that have the same subject, teacher, and room.
- [ ] **Step 2: Write test script `scripts/test-matrix-utils.ts`**
Verify that 2 back-to-back Discrete Structure slots (06:25–07:15 and 07:15–08:05) correctly merge into a single cell with `colSpan: 2` and `isDoublePeriod: true`, and that break 09:45–10:10 is detected.
- [ ] **Step 3: Run test script**
Run `npx tsx scripts/test-matrix-utils.ts` and verify it passes.
- [ ] **Step 4: Commit**
`git add src/components/timetable/matrix-utils.ts scripts/test-matrix-utils.ts && git commit -m "feat(routine): add timetable matrix domain utilities"`

---

### Task 2: Create `CollegeTimetableGrid` Component

**Files:**
- Create: `src/components/timetable/college-timetable-grid.tsx`

**Interfaces:**
```typescript
export type CollegeTimetableGridProps = {
  dayGroups: DayGroup[];
  allSlots: RoutineSlotData[];
  renderActions?: (slot: RoutineSlotData) => React.ReactNode;
};
```

- [ ] **Step 1: Implement `CollegeTimetableGrid`**
Build the full-width responsive noticeboard table:
  - Header: Period numbers + time labels (`06:25 – 07:15`) + styled Recess/Break column header.
  - Rows: Sunday through Friday.
  - Today Row: highlighted with `bg-primary/5 ring-1 ring-inset ring-primary/20` and `TODAY` pill.
  - Cells:
    - Merged Double Periods: `col-span-2` with `2 Periods` tag.
    - Lab sessions: Indigo accent with `Lab` badge.
    - Standard lectures: Minimalist card with bold subject name, `Room 201 • Er. Nikunja Sir` single-line metadata.
    - Break columns: Vertical stylized break pill with coffee cup icon.
    - Empty periods: Subtle dash / "Free" indicator.
    - Admin actions: Hover menu or top-right edit/delete buttons.
- [ ] **Step 2: Verify component compiles with `npx tsc --noEmit`**
- [ ] **Step 3: Commit**
`git add src/components/timetable/college-timetable-grid.tsx && git commit -m "feat(routine): create CollegeTimetableGrid noticeboard component"`

---

### Task 3: Enhance `RoutineView` with Noticeboard Matrix Mode

**Files:**
- Modify: `src/components/timetable/routine-view.tsx`

- [ ] **Step 1: Update `RoutineView` view modes**
Support three view modes:
  1. `"matrix"`: The new `CollegeTimetableGrid` noticeboard layout (Default on desktop $\ge 1024px$).
  2. `"day"`: Focused `DayTimeline` for the selected day.
  3. `"grid"`: The 7-column card grid `WeeklyGrid`.
Update the controls header with clean tab buttons: `[ Timetable Noticeboard ]`, `[ Day View ]`, `[ Weekly Cards ]`.
- [ ] **Step 2: Add responsive auto-adaptation**
On small screens, provide horizontal scrolling with clean touch scrollbar and quick day jump pills.
- [ ] **Step 3: Run `npx tsc --noEmit` to verify 0 errors**
- [ ] **Step 4: Commit**
`git add src/components/timetable/routine-view.tsx && git commit -m "feat(routine): integrate college timetable matrix into RoutineView"`

---

### Task 4: Modernize Admin Routine Page

**Files:**
- Modify: `src/app/(admin)/admin/routine/page.tsx`

- [ ] **Step 1: Replace legacy `<TimelineRiver>` with `<RoutineView>`**
Replace the static 7 AM–4 PM river grid with the unified `<RoutineView>`, passing `canManageRoutine={permissions.canManageRoutine}` and `renderActions`.
- [ ] **Step 2: Default semester filter to active semester**
Update the initial semester parameter so that instead of defaulting to `"All"` (which dumps all semesters into one column), it defaults to `"I"` (or first available semester with classes), while still allowing the admin to click `"All Semesters"`.
When `"All Semesters"` is selected, render a cohort-separated matrix or clean grouped sections so cohorts don't clash.
- [ ] **Step 3: Run `npx tsc --noEmit`**
- [ ] **Step 4: Commit**
`git add src/app/(admin)/admin/routine/page.tsx && git commit -m "refactor(admin): modernize routine page with unified timetable matrix"`

---

### Task 5: Verify Student and Teacher Routine Pages

**Files:**
- Modify: `src/app/(student)/routine/page.tsx`
- Modify: `src/app/(teacher)/teacher/routine/page.tsx`

- [ ] **Step 1: Audit Student Routine page**
Ensure `RoutineView` renders cleanly for students in Semester II BCA, showing the 30-period schedule with double periods merged and recess clearly identified.
- [ ] **Step 2: Audit Teacher Routine page**
Ensure `RoutineView` renders the teacher's schedule across semesters cleanly.
- [ ] **Step 3: Run `npx tsc --noEmit`**
- [ ] **Step 4: Commit**
`git add src/app/(student)/routine/page.tsx src/app/(teacher)/teacher/routine/page.tsx && git commit -m "feat(routine): sync student and teacher views with college timetable matrix"`

---

### Task 6: Audit, Dead Code Elimination, & Browser Verification

**Files:**
- Audit all timetable components: `src/components/timetable/**`
- Check if `TimelineRiver` is still used in `src/app/(student)/today/page.tsx` or if it needs clean scoping.
- Run `npx tsc --noEmit`.
- Verify with Playwright browser screenshot.
- Update `LEARNINGS.md` and `PROJECTS.md`.
- Delete test script `scripts/test-matrix-utils.ts` if obsolete or keep in `scripts/maintenance/`.

- [ ] **Step 1: Run dead code check and type check**
- [ ] **Step 2: Take Playwright screenshots of `/admin/routine`, `/routine`, and `/teacher/routine`**
- [ ] **Step 3: Update `LEARNINGS.md` and `PROJECTS.md`**
- [ ] **Step 4: Final commit**
