# Routine UI Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task inline in this session. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Overhaul the Routine UI from a repetitive, horizontal-scrolling 7-column layout into an intuitive, high-density Routine interface featuring Day Focus Tabs, a Day Timeline View, and a 7-Column Weekly Grid Matrix.

**Architecture:** We will build modular components (`RoutineCard`, `DayTimeline`, `WeeklyGrid`, `RoutineView`) under `src/components/timetable/` and consume them across Student, CR, Teacher, and Admin portals.

**Tech Stack:** Next.js (App Router), React, TailwindCSS, Lucide Icons, Drizzle ORM, Nepal Time (NPT).

## Global Constraints
- **All date/time logic must use NPT (Asia/Kathmandu).**
- Strict adherence to `office-web-ui-system` (Restrained visual weight, high density).
- `npx tsc --noEmit` must pass with 0 errors before completion.

---

### Task 1: Create `RoutineCard` Component

**Files:**
- Create: `src/components/timetable/routine-card.tsx`

**Interfaces:**
```typescript
export type RoutineSlotData = {
  id: string;
  subjectName: string;
  subjectCode?: string;
  startTime: string;
  endTime: string;
  room?: string | null;
  teacherName?: string | null;
  status?: "upcoming" | "ongoing" | "completed";
  notes?: string | null;
  isLab?: boolean;
};
```

- [ ] **Step 1: Write `RoutineCard` component**
Create `src/components/timetable/routine-card.tsx` rendering a high-density card with time pill, subject title, code tag, room badge, teacher name, lab border accent, live status badge (`NOW`, `Done`, `Upcoming`), and optional action slots.

---

### Task 2: Create `DayTimeline` Component

**Files:**
- Create: `src/components/timetable/day-timeline.tsx`

- [ ] **Step 1: Write `DayTimeline` component**
Create a single-column chronological layout for the selected day. Uses a single clean vertical time track on the left and stacked `RoutineCard`s on the right. Handles empty states gracefully.

---

### Task 3: Create `WeeklyGrid` Component

**Files:**
- Create: `src/components/timetable/weekly-grid.tsx`

- [ ] **Step 1: Write `WeeklyGrid` component**
Create a high-density 7-column grid (Sun–Sat) for desktop viewing. Renders class cards neatly inside each day column without repetitive hour rulers in every cell.

---

### Task 4: Create Interactive `RoutineView` Container

**Files:**
- Create: `src/components/timetable/routine-view.tsx`

- [ ] **Step 1: Write `RoutineView` client component**
Build the client container managing `selectedDayIndex` and `viewMode` (`'day'` | `'grid'`).
Renders top control bar with Day Tabs (`Sun`..`Sat`), View Switcher (`Day View` / `Weekly Grid`), and permissions-gated `Add Slot` button.

---

### Task 5: Integrate `RoutineView` Across Portals

**Files:**
- Modify: `src/app/(student)/routine/page.tsx`
- Modify: `src/app/(teacher)/teacher/routine/page.tsx`

- [ ] **Step 1: Update Student Routine Page**
Update `src/app/(student)/routine/page.tsx` to query routine data and render `RoutineView`.

- [ ] **Step 2: Update Teacher Routine Page**
Update `src/app/(teacher)/teacher/routine/page.tsx` to render `RoutineView` with teacher scope.

---

### Task 6: Zero-Regression Verification & Role Audit

- [ ] **Step 1: Run TypeScript Typecheck**
Run `npx tsc --noEmit` and confirm 0 errors.

- [ ] **Step 2: Invoke Verifier Subagents**
Invoke `StudentVerifier`, `CRVerifier`, and `TeacherVerifier` subagents to audit all portals.
