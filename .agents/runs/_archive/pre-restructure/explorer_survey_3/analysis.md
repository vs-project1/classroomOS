# Comprehensive Survey & Analysis: Views, UI/UX, and Test Infrastructure

> **Date**: 2026-08-18  
> **Investigation Scope**: 9 Student Views, 8 Admin Views, Interactive Elements/Typography/Responsiveness, and Test Infrastructure (`playwright.config.ts`, `tests/`, `package.json`, TypeScript type-check).  
> **Investigator**: Explorer Survey 3

---

## Executive Summary

Classroom OS possesses a well-structured, modular Next.js 16 (App Router) + React 19 architecture backed by Drizzle ORM / LibSQL (Turso SQLite). 

- **TypeScript Compilation**: `npx tsc --noEmit` completes with **0 errors**.
- **Student Views (9/9)**: Fully implemented with domain-specific features (NPT timezone synchronization, TU 80% attendance barometer, What-If simulator, 4-tab subject workspace, 5-tab assignment workflow with drafts and mock file uploads, notice board, and event calendar).
- **Admin Views (8/8)**: Fully implemented with private console layout, RBAC security gates, KPI dashboard, temporary password provisioning, user quarantine enforcement, and academic catalog management.
- **UI & Typography Audit**: Identified **~35 instances of `text-[10px]`** and **~25 instances of `text-[11px]`** that should be upgraded to standard `text-xs` / `text-sm font-semibold` per Requirement R2. Contrast tokens in `globals.css` are strong (`#334155` / `#0F172A` in light mode), but localized badge classes and secondary labels need contrast alignment.
- **Test Infrastructure**: Robust Playwright E2E suite covering 40+ assertion points across 5 test specs with Page Object Models, persona session injection fixtures, and UploadThing mocking. Minor config enhancement identified for dynamic port binding.

---

## 1. Detailed Inspection of Student Views (9 Views)

| # | Route | File Path | Key Features & Implementation Status | UI/UX & Typography Findings |
|---|---|---|---|---|
| 1 | **Dashboard (`/`)** | `src/app/(student)/page.tsx` | Time-based NPT greeting ("Good morning/afternoon/evening"), hero gradient banner, live class with animated "NOW" badge, active assignments summary, TU 80% attendance gauge widget, pinned notices board. | Contains `text-[10px]` (NOW badge line 195, notice time line 342, coming soon line 364) and `text-[11px]` (lines 185, 257, 311, 363). Cards have hover transitions but lack explicit `cursor-pointer` on clickable timetable/assignment rows. |
| 2 | **Today's Schedule (`/today`)** | `src/app/(student)/today/page.tsx`<br>`day-strip-selector.tsx` | 7-day horizontal date strip selector, NPT temporal categorization (`UPCOMING`, `ONGOING`, `COMPLETED`), CR/Admin "Log Session" action trigger, "View Log" for completed sessions. | Contains `text-[10px]` (lines 240, 246, 251, 273) and `text-[11px]` (lines 233, 39 in day strip). Badges should be upgraded to `text-xs font-bold`. |
| 3 | **Weekly Routine (`/routine`)** | `src/app/(student)/routine/page.tsx` | Full 7-day academic timetable grid, "Active Today" green pulse badge, room numbers, teacher names, CR/Admin "Add Slot" and edit/delete hover controls. | Contains `text-[10px]` (line 91). Day headers and time chips have good contrast (`text-primary bg-primary/10`). Hover action icons (`opacity-0 group-hover:opacity-100`) need touch-friendly fallback. |
| 4 | **Enrolled Subjects (`/subjects`)** | `src/app/(student)/subjects/page.tsx` | Enrolled subjects grid, subject code badges, syllabus unit counters, active homework badges, learning resource counts, faculty names. | Contains `text-[11px]` (line 108: unit count). Cards have `group`, `hover:shadow-md`, `hover:border-primary/50`, and smooth arrow transitions. |
| 5 | **Subject Detail (`/subjects/[id]`)** | `src/app/(student)/subjects/[id]/page.tsx` | Strict 403 multi-tenant enrollment authorization, 4 tabs (Syllabus progress, Class sessions & lecture logs, Assignments & deadlines, Learning materials & slides). | Contains `text-[10px]` (lines 376, 441) and `text-[11px]` (lines 390, 454). Tab triggers are legible with `text-sm font-bold`. Lecture notes use distinct pastel backgrounds. |
| 6 | **Attendance Hub (`/attendance`)** | `src/app/(student)/attendance/page.tsx`<br>`what-if-calculator.tsx`<br>`correction-dialog.tsx` | Overall TU 80% barometer with SVG gauge, safety buffer (+X missable or X needed to recover), interactive What-If range sliders with live percentage delta, subject matrix table with colored progress bars, "Report Incorrect Attendance" dispute modal. | Contains `text-[10px]` (line 262) and `text-[11px]` (lines 215 in page, 105 in calculator, 129 in dialog). Table headers use small uppercase text. Dialog trigger uses `render={<Button .../>}` (verify Base UI prop standards). |
| 7 | **Homework & Tasks (`/homework`)** | `src/app/(student)/homework/page.tsx`<br>`homework-client-workspace.tsx`<br>`submissions/[id]/page.tsx` | 5 filter tabs (Active, Due Soon, Overdue, Submitted, Graded), submission dialog with written solution textarea + file dropzone, Save Draft transition, Turn In action, Graded tab with score/grade/remarks, `/homework/submissions/[id]` with strict student ownership isolation. | Contains `text-[11px]` (lines 209, 281, 501, 513). Graded feedback card (`data-testid="grade-feedback-card"`) has clear visual hierarchy. |
| 8 | **Notice Board (`/notices`)** | `src/app/(student)/notices/page.tsx`<br>`notice-actions.tsx` | Active vs Archived tabs based on `expiresAt` and NPT time, pinned notice primary accent border, creation modal for authorized roles. | Contains `text-[10px]` (lines 46, 51, 75). Subtitle font sizes could be increased to `text-sm font-medium`. |
| 9 | **Events & Calendar (`/events`)** | `src/app/(student)/events/page.tsx`<br>`event-actions.tsx` | Upcoming vs Past tabs, event type tags, location indicators, NPT date/time formatting, creation modal for authorized roles. | Contains `text-[10px]` (line 63). Cards have clean borders and subtle shadow hover transitions. |

---

## 2. Detailed Inspection of Admin Views (8 Views)

| # | Route | File Path | Key Features & Implementation Status | UI/UX & Typography Findings |
|---|---|---|---|---|
| 1 | **Command Center (`/admin`)** | `src/app/(admin)/admin/page.tsx` | Operational KPIs (Classes Today, Active HW, Notices), Quick Actions strip (Log Session, Post Notice, Create Assignment, View Routine), Today's schedule card, Recent activity stream, Notice board preview, Upcoming event card, At-Risk Students placeholder. | Clean padding (`p-6 md:p-10`). Quick action cards use `hover:bg-accent`. Quick action links point to student URLs (`/homework`, `/notices`) rather than admin-specific subpaths. |
| 2 | **Accounts & Auth (`/admin/accounts`)** | `src/app/(admin)/admin/accounts/page.tsx`<br>`accounts-client-console.tsx`<br>`kpi-summary-cards.tsx` | Strictly requires `ADMIN` role. 5 KPI summary cards, live search filter (name, email, roll number, faculty), role & status dropdown filters, enriched identity roster table, quarantine badge (`Quarantined` vs `Verified`), activate/deactivate toggle, reset temporary password modal with copy credentials. | Contains `text-[10px]` (line 280: "You" badge) and `text-[11px]` (line 287, line 81 in KPI cards). Table has horizontal scrolling container (`overflow-x-auto`). |
| 3 | **Admin Assignments (`/admin/homework`)** | `src/app/(admin)/admin/homework/page.tsx`<br>`status-actions.tsx` | Active Queue, Completed, and Archived tabs; Assign New trigger; status transition dropdown. | Contains `text-[10px]` (lines 52, 76, 80). Header button links to `/homework/new`. |
| 4 | **Admin Notices (`/admin/notices`)** | `src/app/(admin)/admin/notices/page.tsx`<br>`notice-actions.tsx` | Active Broadcasts vs Archived Bulletins tabs, pin/unpin toggles, delete action, Publish Alert trigger. | Contains `text-[10px]` (lines 47, 52, 76). Header button links to `/notices/new`. |
| 5 | **Admin Events (`/admin/events`)** | `src/app/(admin)/admin/events/page.tsx`<br>`event-actions.tsx` | Upcoming vs Past tabs, Schedule Event trigger, delete action, time and location chips. | Contains `text-[10px]` (lines 63, 100). Time string rendering (`event.startTime || "?"`) should use `formatTime12h()` for consistency with student views. |
| 6 | **Admin Teachers (`/admin/teachers`)** | `src/app/(admin)/admin/teachers/page.tsx`<br>`teacher-form.tsx`<br>`edit-teacher-dialog.tsx` | Faculty roster cards, initial avatars, email/phone links, assigned departments & semester pills, Add/Edit/Delete teacher modals. | Contains `text-[10px]` (lines 86, 95). Excellent card layout with hover action toolbar. |
| 7 | **Admin Students (`/admin/students`)** | `src/app/(admin)/admin/students/page.tsx`<br>`student-form.tsx`<br>`edit-student-dialog.tsx` | Scholar registry table, roll numbers, faculty & semester badges, contact info, enrollment timestamp, Export Roster button, Add/Edit student dialogs. | Contains `text-[10px]` (lines 54, 60, 97, 100). Table header font size is small (`text-[10px]`); should be updated to `text-xs font-semibold`. |
| 8 | **Admin Subjects (`/admin/subjects` & `[id]`)** | `src/app/(admin)/admin/subjects/page.tsx`<br>`[id]/page.tsx`<br>`[id]/components.tsx` | Course catalog grid with Lab Included badges, Add Subject modal. Subject detail page (`/admin/subjects/[id]`) contains hierarchical unit/chapter/material builder with file-type icons (PDF, Video, Link, File). | Contains `text-[10px]` (lines 80, 94 in page). Syllabus builder has good hierarchy and clean dialog integration. |

---

## 3. Interactive Elements, Styling & Responsiveness Audit

### 3.1 Responsive Navigation Architecture
1. **Desktop (>= 768px)**:
   - Sticky left sidebar (`w-64 bg-sidebar shrink-0 h-screen sticky top-0`).
   - Deep indigo brand palette (`#1E1B4B` light mode, `#070B14` dark mode) with active indicator highlighting (`bg-primary text-white font-semibold shadow-sm shadow-primary/30`).
2. **Mobile (< 768px)**:
   - Top sticky header (`h-16 bg-background/80 backdrop-blur-md sticky top-0 z-10`) with hamburger `Sheet` drawer trigger.
   - `MobileNavbar`: Sticky horizontal scrollable pill navigation (`sticky top-16 z-20 overflow-x-auto no-scrollbar`) providing one-tap access to all 8 core student sections.
   - Note: `MobileBottomNav` exists in `src/components/student/mobile-bottom-nav.tsx` as an alternative 4-item bottom dock; `MobileNavbar` is currently active in `(student)/layout.tsx`.

### 3.2 Typography & Contrast
- **Theme Variables**:
  - `globals.css` sets `--muted-foreground: #334155` in light mode (exceeds WCAG 4.5:1 on `#F0F4FF` and `#FFFFFF`).
  - Dark mode `--muted-foreground: #94A3B8` provides 5.2:1 contrast against `#0B0F19` and `#111827`.
- **Tiny Font Audit**:
  - Total `text-[10px]` instances: **35** (in student views: 13, admin views: 18, components: 4).
  - Total `text-[11px]` instances: **25** (in student views: 13, admin views: 4, components: 8).
  - Recommendation: Replace all `text-[10px]` and `text-[11px]` on badges, labels, notes, and metadata with `text-xs font-semibold` or `text-sm font-medium`.

### 3.3 Interactive Affordances
- **Cursor Pointer**: Applied across buttons, tab triggers, dialog triggers, and day strip buttons.
- **Card Hover States**: Cards consistently use `hover:shadow-md hover:border-primary/50 transition-all duration-300` or `hover:bg-muted/20`.
- **Border Radii**: Standardized on `rounded-xl` (`0.75rem`) for cards and `rounded-2xl` for hero banners/dialogs.

---

## 4. Test Infrastructure Inspection

### 4.1 Playwright Setup (`playwright.config.ts`)
- **Version**: `@playwright/test` v1.62.1
- **Target**: `tests/e2e/**/*.spec.ts`
- **Execution Model**: `workers: 1`, `fullyParallel: false` to ensure SQLite single-writer transactional stability.
- **Timezone**: Strict `Asia/Kathmandu` injection into browser context.
- **Global Setup (`tests/fixtures/global-setup.ts`)**:
  - Drops existing SQLite files (`local.db`, `-wal`, `-shm`).
  - Applies Drizzle migrations from `drizzle/`.
  - Executes comprehensive `seedE2E()` seeding users, student profiles, subjects, routine slots, sessions, attendance records, homework, submissions, notices, and events.
  - Generates snapshot backup `local.test-seed.db`.

### 4.2 Test Suite Coverage Matrix

| Test Suite File | Specs / Test Cases | Key Verification Areas |
|---|---|---|
| `tests/e2e/auth-lifecycle.spec.ts` | 13 test cases (TC-SPEC-AUTH-01 to 13) | Admin & Student login, invalid credentials rejection, generic 404 security, mandatory password change quarantine flow (`mustChangePassword`), password strength (8+ chars) & confirmation matching, account unquarantining, admin user provisioning (`/admin/accounts`), temporary password generation, student 403 access denial to admin routes, deactivated account rejection. |
| `tests/e2e/attendance-barometer.spec.ts` | 6 test cases (TC-SPEC-ATT-01 to 06) | Overall percentage & status chip rendering, safety buffer calculation, subject breakdown matrix, What-If slider real-time simulation, boundary stability (0 and large inputs), correction dispute modal submission. |
| `tests/e2e/dashboard-schedule.spec.ts` | 9 test cases (TC-SPEC-DASH-01 to 09) | Personalized NPT greeting, circular attendance gauge widget, Today's Timetable card, active assignments summary, pinned notices board, 7-day strip selector, day switching, UPCOMING/ONGOING/COMPLETED status badges, live class highlight. |
| `tests/e2e/homework-submissions.spec.ts` | 6 test cases (TC-SPEC-HW-01 to 06) | 5 workspace tabs (Active, Due Soon, Overdue, Submitted, Graded), active card due date listing, temporal badges, submission modal draft saving, UploadThing PDF mock file upload, graded tab score & instructor remarks. |
| `tests/e2e/subject-isolation.spec.ts` | 6 test cases (TC-SPEC-SUBJ-01 to 06) | Enrolled subjects grid, 4-tab detail view, tab switching (Syllabus, Sessions, Assignments, Resources), un-enrolled subject 403/404 isolation, invalid UUID 404 handling, cross-student submission URL 403 protection. |

### 4.3 Test Infrastructure Finding & Recommendation
- **WebServer Port Binding**: `playwright.config.ts` has `webServer.url: "http://localhost:3000"`. If a Next.js dev server is already running on a different port (e.g. `3001`), the test launcher fails to recognize it.
- **Recommendation**: Update `playwright.config.ts` to:
  ```typescript
  const baseURL = process.env.PLAYWRIGHT_TEST_BASE_URL || "http://localhost:3000";
  // in config:
  use: { baseURL, ... },
  webServer: {
    command: "npm run dev",
    url: baseURL,
    reuseExistingServer: !process.env.CI,
    ...
  }
  ```

---

## 5. Summary of Recommended Refinements

1. **Typography Refinement**: Replace all `text-[10px]` and `text-[11px]` font utility classes with `text-xs font-semibold` or `text-sm font-medium` across both student and admin views.
2. **Contrast Polish**: Ensure secondary labels (e.g., notice timestamps, table subheaders) use `text-slate-700 dark:text-slate-300` rather than high-opacity muted slates (`text-muted-foreground/60`).
3. **Time Formatting Alignment**: Update `/admin/events/page.tsx` line 87 to use `formatTime12h()` instead of raw time strings.
4. **Touch Device Hover Fallback**: Add visible action triggers for table/card actions on mobile screens where `group-hover:opacity-100` cannot trigger on hover.
5. **Playwright Config Robustness**: Support `PLAYWRIGHT_TEST_BASE_URL` in `webServer.url` for seamless local testing against already-running dev servers.
