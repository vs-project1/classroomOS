# Admin Dashboard: Semester-Filtered Schedule Design Spec

## Overview
This specification details the design for adding semester-based class schedule filtering to the Admin Dashboard (`/admin`) in Classroom OS. Currently, the dashboard renders today's classes in an unfiltered single list. This enhancement introduces interactive horizontal semester tabs (`All`, `Sem I` through `Sem VIII`) with live class counts, semester badges on class cards, and URL synchronization.

---

## User Requirements & Clarifications
1. **Semester Tabs:** Horizontal pill tabs (`All`, `Sem I` to `Sem VIII`) positioned within the Today's Schedule card header.
2. **Count Badges:** Each tab displays the count of classes scheduled for that semester today (e.g. `All (6)`, `Sem II (6)`, `Sem IV (0)`).
3. **Semester Badges on Cards:** Each class card displays an explicit semester pill (e.g. `Sem II`) so administrators can immediately identify the target semester when viewing `All`.
4. **Instant Client-Side Filtering + URL Sync:** Tab clicks switch views instantly (0ms latency) while synchronizing the URL search parameter (`?semester=II`) shallowly for bookmarking and persistence.

---

## Architecture & Component Breakdown

### 1. Data Source (`src/app/(admin)/admin/page.tsx`)
- Server Component continues to fetch all weekly routine entries for `dayOfWeek` using Drizzle ORM:
  ```ts
  db.query.weeklyRoutine.findMany({
    where: eq(weeklyRoutine.dayOfWeek, dayOfWeek),
    orderBy: [asc(weeklyRoutine.startTime)],
    with: {
      subject: {
        with: { teacher: true }
      }
    }
  })
  ```
- Extracts `searchParams.semester` and passes data into `<AdminTodaySchedule />`:
  - `classes`: Array of weekly routine records with relations.
  - `currentTime`: Current Nepal Standard Time (e.g. `"14:25"`).
  - `initialSemester`: Active semester from URL or `"All"`.

### 2. Client Component (`src/features/routine/components/admin-today-schedule.tsx`)
- `"use client"` component.
- **Props:**
  ```ts
  export interface AdminTodayScheduleProps {
    classes: Array<{
      id: string;
      startTime: string;
      endTime: string;
      room: string | null;
      subject: {
        id: string;
        name: string;
        code: string;
        semester: string | null;
        teacher?: {
          name: string;
        } | null;
      };
    }>;
    currentTime: string;
    initialSemester?: string;
  }
  ```
- **State Management:**
  - `selectedSemester`: Initialized with `initialSemester || "All"`.
  - On tab click: updates local state immediately and calls `window.history.replaceState` or `router.replace` without full page refresh.
- **Semester Normalization:**
  - Standard helper `matchSemester(subSem, targetSem)` to match semester identifiers across formats (`"II"`, `"2"`, `"2nd"`, etc.).
- **Counting:**
  - Computes counts per semester:
    ```ts
    const counts: Record<string, number> = { All: classes.length };
    for (const sem of SEMESTERS.filter(s => s !== "All")) {
      counts[sem] = classes.filter(c => matchSemester(c.subject?.semester, sem)).length;
    }
    ```
- **UI Elements:**
  - Scrollable horizontal tab bar styled with Tailwind.
  - Active tab: Primary background with bold text.
  - Inactive tabs: Subtle border/muted background; tabs with >0 classes feature a visible badge counter.
  - Filtered class list rendering status indicators (Ongoing, Next Up, Completed, Upcoming).
  - Semester indicator badge on each class card.
  - Empty state when the chosen semester has 0 classes scheduled for today.

---

## Edge Cases & Error Handling
1. **No classes for selected semester:** Display empty state with clear copy: *"No classes scheduled for Semester [X] today"* and a link to `/admin/routine`.
2. **Invalid semester in URL parameter:** Gracefully fallback to `"All"`.
3. **No routine data at all for today (e.g. weekend/holidays):** Show general empty state: *"No classes scheduled for today."*

---

## Multi-Role Invariants & Zero Regression
- **Admin Dashboard Scope:** The changes are contained to `src/app/(admin)/admin/page.tsx` and the new component in `src/features/routine/components/`.
- **Role Synchronization:** Teacher, Student, and CR dashboard routes are unaffected.
- **Verification Protocol:**
  - Execute `npx tsc --noEmit` to ensure 0 TypeScript errors.
  - Run subagents (`TeacherVerifier`, `CRVerifier`, `StudentVerifier`) to confirm role integrity.
