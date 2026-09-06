# Admin Dashboard Semester Schedule Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Provide semester-based filtering (`All`, `Sem I` to `Sem VIII`) with count badges, semester pills on cards, and URL synchronization in the "Today's Schedule" card on the Admin Dashboard (`/admin`).

**Architecture:** A thin Next.js Server Component (`/admin/page.tsx`) queries the day's routine entries with subject and teacher relations, passing them to an interactive client component (`AdminTodaySchedule`). The client component computes per-semester class counts, renders horizontal pill tabs with badges, applies instant in-memory filtering, and shallowly synchronizes `?semester=...` in the browser URL.

**Tech Stack:** Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS, Lucide React, Drizzle ORM.

## Global Constraints
- Strictly follow `AGENTS.md` rules: thin server components, DAL query cleanliness, role synchronization.
- Never regress role dashboards (Student, CR, Teacher).
- Zero-regression typecheck verification (`npx tsc --noEmit` must pass with 0 errors).

---

### Task 1: Create `AdminTodaySchedule` Client Component

**Files:**
- Create: `src/features/routine/components/admin-today-schedule.tsx`

**Interfaces:**
- Produces: `AdminTodaySchedule` React component
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

- [ ] **Step 1: Write `AdminTodaySchedule` component**
Create `src/features/routine/components/admin-today-schedule.tsx` implementing:
- `SEMESTERS = ["All", "I", "II", "III", "IV", "V", "VI", "VII", "VIII"]`
- `matchSemester(subSem, targetSem)` helper
- Per-semester class count aggregation
- Horizontal scrollable pill tabs with count badges
- Filtered class list rendering with semester badge, ongoing / next up / completed / upcoming status pills, room, teacher, and time range
- Empty state when no classes match the chosen semester
- Shallow URL sync on tab click via `window.history.replaceState`

- [ ] **Step 2: Typecheck verification**
Run: `npx tsc --noEmit`
Expected: 0 errors

---

### Task 2: Integrate `AdminTodaySchedule` in Admin Dashboard Page

**Files:**
- Modify: `src/app/(admin)/admin/page.tsx`

**Interfaces:**
- Consumes: `AdminTodaySchedule` from `@/features/routine/components/admin-today-schedule`

- [ ] **Step 1: Update `src/app/(admin)/admin/page.tsx`**
- Import `AdminTodaySchedule`
- Update `Dashboard` component signature to accept `searchParams: Promise<{ [key: string]: string | string[] | undefined }>`
- Resolve `selectedSemester` from `searchParams`
- Replace the static/unfiltered routine render block with `<AdminTodaySchedule classes={todaysClasses} currentTime={nptTime} initialSemester={selectedSemester} />`

- [ ] **Step 2: Run typecheck**
Run: `npx tsc --noEmit`
Expected: 0 errors

---

### Task 3: Multi-Role Invariant Verification & Subagent Audits

**Files:**
- Check: Teacher routes, Student routes, CR routes

- [ ] **Step 1: Verify TypeScript & Build**
Run: `npx tsc --noEmit`
Expected: 0 errors

- [ ] **Step 2: Dispatch Subagent Verification**
Invoke `TeacherVerifier`, `CRVerifier`, and `StudentVerifier` to verify that Teacher, CR, and Student workflows remain 100% operational and desync-free.

- [ ] **Step 3: Document Learnings**
Update `LEARNINGS.md` with architectural invariant notes.
