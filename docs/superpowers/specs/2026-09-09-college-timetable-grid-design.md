# Technical Design Specification: Traditional College Timetable Grid

**Date:** 2026-09-09  
**Status:** Approved by User  
**Target Areas:** `src/components/timetable/**`, `src/app/(admin)/admin/routine/**`, `src/app/(student)/routine/**`, `src/app/(teacher)/teacher/routine/**`

---

## 1. Problem Statement & Scope

### Current Pain Points:
1. **Extreme Badge Bloat & Cognitive Fatigue:** Every single 50-minute slot displays 10 separate elements (Subject title, Code badge, Status badge `DONE`, Duration badge, Time range, Room pin, Teacher circle avatar, Teacher name, Semester tag, Edit/Delete buttons).
2. **Deceptive & Misaligned Timeline Rail:** Each day card in `/admin/routine` devotes 70px to a static 7 AM–4 PM vertical gutter with dots. Because slots are stacked normally, a 6:25 AM class sits next to 7 AM, and a 7:15 AM class sits next to 11 AM, creating giant misaligned whitespace gaps repeated across every column.
3. **Double Period Duplication:** Back-to-back periods of the same subject (e.g., Periods 1 & 2 of Discrete Structure) appear as two separate identical tall cards right next to each other.
4. **"All Semesters" Interleaved Chaos:** Viewing all semesters interleaves Semester I, II, III, etc. into a single column, confusing administrators and mixing unrelated student cohorts.
5. **Architectural Divergence:** `/admin/routine` uses a custom, bloated 3-column `<TimelineRiver>` grid, while student and teacher routes use `<RoutineView>`.

### Scope Boundaries:
- **In Scope:**
  - Build `CollegeTimetableGrid` implementing Option A (Traditional College Noticeboard: Days as Rows, Periods as Columns).
  - Automatically detect and merge adjacent double periods for the same subject, teacher, and room across period columns (`col-span-2`).
  - Calculate period columns dynamically from data and insert a dedicated Recess/Break column (e.g. 09:45–10:10 AM).
  - Unify all three routine routes (`/admin/routine`, `/routine`, `/teacher/routine`) to share `<RoutineView>`.
  - Provide a view mode switcher: **Noticeboard Grid** (default on desktop) vs **Day Agenda** (focused day cards).
  - Default Admin semester filter to an active cohort (e.g., Semester I or last active) instead of the scrambled "All Semesters" view.
- **Non-Goals:**
  - No database schema alterations (`weekly_routine` table schema remains unchanged).
  - No alteration of Telegram broadcast logic or `daily_attendance` roll calls.

---

## 2. Database Schema & DAL Query Signatures

### Schema Impact:
* **Zero schema modifications required.** `weekly_routine` already has all required columns:
  - `id`: `text` (PK)
  - `subjectId`: `text` (FK to `subjects.id`)
  - `dayOfWeek`: `integer` (0 = Sunday to 6 = Saturday)
  - `startTime`: `text` (e.g., "06:25")
  - `endTime`: `text` (e.g., "07:15")
  - `room`: `text` (e.g., "Room 201", "Lab 1")
  - `teacherName`: `text`
  - `notes`: `text`

### Data Access Layer (DAL):
Existing queries in `src/features/routine/queries/` remain canonical:
- `getStudentWeeklyRoutine(allowedSubjectIds: string[])`
- `getTeacherWeeklyRoutine(teacherId: string)`
- `db.query.weeklyRoutine.findMany(...)` for Admin.

---

## 3. Pure Domain Transformations: Period Extraction & Adjacent Merging

### Period Slot Normalization:
A pure domain utility function `buildTimetableMatrix(slots)` will:
1. **Extract Canonical Periods:** Determine the sorted unique period intervals across the weekly schedule (e.g., `P1: 06:25–07:15`, `P2: 07:15–08:05`, `P3: 08:05–08:55`, `P4: 08:55–09:45`, `P5: 10:10–11:00`, `P6: 11:00–11:50`).
2. **Break Detection:** Identify gaps between period blocks $\ge 15$ minutes (e.g., between 09:45 and 10:10) and assign a dedicated `isBreak` column.
3. **Double Period Spanning:** For each day of the week, iterate through slots chronologically:
   - If `currentSlot.subjectId === nextSlot.subjectId && currentSlot.endTime === nextSlot.startTime && currentSlot.room === nextSlot.room`, merge them into a single `MergedTimetableCell` with `colSpan = 2`, `durationMins = startM to endM`, and `isDoublePeriod = true`.
4. **Empty Slot Filler:** If a period has no class for that day, render a subtle empty cell or free period placeholder.

---

## 4. UI/UX Layout & Responsive Design

### Noticeboard Table Specification (Desktop $\ge$ 1024px):
- **Container:** Wrapped in a clean, elevated `bg-card` card with `border-border/60` and subtle shadow.
- **Header Row:**
  - Sticky/frozen top row showing: `Day / Period` | `P1 (06:25–07:15)` | `P2 (07:15–08:05)` | `P3 (08:05–08:55)` | `P4 (08:55–09:45)` | `☕ BREAK (25m)` | `P5 (10:10–11:00)` | `P6 (11:00–11:50)`.
- **Day Rows (Sun–Fri):**
  - Left column: Day name with bold typography.
  - **Today Row:** Highlighted with `bg-primary/5 ring-1 ring-inset ring-primary/20` and an emerald or primary "TODAY" pill.
- **Class Cell Design:**
  - Subject name in **bold text** (`text-sm font-bold text-foreground`).
  - Single-line compact metadata: `Room 201 • Er. Nikunja Sir` (`text-xs text-muted-foreground`).
  - Subtle semantic border/background accents:
    - Standard Lecture: `bg-card border-border/60 hover:border-border`
    - Lab / Practical: `bg-indigo-500/10 border-indigo-500/20 text-indigo-600 dark:text-indigo-400`
    - Double Period: `bg-blue-500/10 border-blue-500/20` with a subtle `2 Periods` badge.
  - For Admin: subtle hover actions (Edit pencil / Delete trash) anchored in the top-right corner of the cell.

### Mobile & Tablet Adaptation (< 1024px):
- **Tablet / Large Mobile:** Smooth horizontal scrolling with sticky frozen Day header on the left.
- **Small Mobile (< 640px):** Automatic fallback or toggle to **Day Agenda View**, where the student/teacher selects a day pill (Sun, Mon, Tue...) and views a clean, vertical stack of that day's merged periods.

---

## 5. Role Synchronization & Security (AGENTS.md Rules 1 & 3)

| Role | Route | Access & View Characteristics |
| :--- | :--- | :--- |
| **Admin** | `/admin/routine` | Full weekly matrix across cohorts. Semester tabs default to `Semester I`. Can click any slot to edit/delete, or click `+ Add Class Slot`. Broadcasts changes to Telegram. |
| **Student** | `/routine` | Automatically scoped to student's enrolled cohort (Semester II BCA). Clean weekly noticeboard with Today highlighted. |
| **CR** | `/routine` | Identical cohort noticeboard as Student; quick link to `/cr/take-attendance`. |
| **Teacher** | `/teacher/routine` | Filtered weekly matrix showing only classes assigned to `user.teacherId`. Shows multi-semester teaching load cleanly. |

---

## 6. Implementation & Verification Plan

### Tasks:
1. Create `src/components/timetable/college-timetable-grid.tsx` with dynamic period parsing, break insertion, and adjacent period merging.
2. Update `src/components/timetable/routine-view.tsx` to support the new Noticeboard view mode and mobile switching.
3. Refactor `src/app/(admin)/admin/routine/page.tsx` to use the unified `<RoutineView>` with default active semester tab.
4. Clean up any dead code or orphaned timeline river references from the routine feature slice.
5. Run strict TypeScript check (`npx tsc --noEmit`) to verify 0 regressions.
6. Verify all three role pages in browser.
