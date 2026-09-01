# Routine UI Redesign & Simplification Design Spec

## 1. Goal & Context
The current Weekly Routine page (`/routine`) renders 7 side-by-side vertical timeline columns, each repeating a 7 AM – 4 PM hour ruler. This layout causes severe visual noise, horizontal scroll overflow, and makes it difficult to quickly scan class schedules.

This spec defines a simplified, high-density Routine UI adhering to `office-web-ui-system` and `impeccable` guidelines.

## 2. Architectural Solution

### 2.1 Page Archetype & Visual Weight
- **Archetype:** Workspace / Schedule View.
- **Visual Weight:** Restrained. High density, clean typography, soft status accents (`NOW` pulsing green, `Done` muted slate).

### 2.2 Component Hierarchy
1. **`RoutineView` (`src/components/timetable/routine-view.tsx`)**:
   - Primary client container managing `selectedDayIndex` (0–6, defaulting to Nepal Time today) and `viewMode` (`'day'` | `'grid'`).
   - Top Control Bar:
     - Day Selector Pills: `Sun`, `Mon`, `Tue`, `Wed`, `Thu`, `Fri`, `Sat` (with `Today` badge indicator).
     - Mode Toggle: Segmented control `[ Day View | Weekly Grid ]`.
     - Action Buttons: `Add Slot` (if user has `canManageRoutine` permission).
2. **`DayTimeline` (`src/components/timetable/day-timeline.tsx`)**:
   - Single-column chronological layout for the selected day.
   - Clean vertical time track on the left, high-density class cards on the right.
3. **`WeeklyGrid` (`src/components/timetable/weekly-grid.tsx`)**:
   - High-density 7-column academic matrix for desktop viewing.
   - Shows all days side-by-side without repeating hour rulers in every box.
4. **`RoutineCard` (`src/components/timetable/routine-card.tsx`)**:
   - Compact card displaying:
     - Time range (`07:00 AM – 08:30 AM`) & duration (`90m`)
     - Subject Name (`Database Management System`) & Code (`CACS251`)
     - Room Badge (`Room 301`) & Teacher Name (`Prof. Rajesh Shrestha`)
     - Lab accent (`border-l-4 border-indigo-500` for practicals)
     - Live status badge (`NOW` for current, `Done` for past, `Upcoming` for future)
     - Action controls (Edit/Delete icons for CR/Teacher/Admin)

## 3. Data Flow & NPT Calculation
- Fetch `weeklyRoutine` joined with `subjects` and `teachers`.
- Determine current day index and current time string in `Asia/Kathmandu` time zone.
- Pass items down to `RoutineView`.

## 4. Role Synchronization (Rule #1)
The new `RoutineView` component will be used across all roles:
- `/routine` (Student Portal)
- `/cr/routine` or shared `/routine` (Class Rep Portal)
- `/teacher/routine` (Teacher Portal)
- `/admin/routine` (Admin Portal)

## 5. Verification Plan
- `npx tsc --noEmit` must return 0 errors.
- Subagent verification (`StudentVerifier`, `CRVerifier`, `TeacherVerifier`) to confirm role sync.
