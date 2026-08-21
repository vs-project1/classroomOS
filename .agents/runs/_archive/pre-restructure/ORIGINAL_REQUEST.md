# Original User Request

## 2026-08-15T12:36:35Z

# Teamwork Project Prompt — Draft

> Status: Launched
> Goal: Craft prompt → get user approval → delegate to teamwork_preview
> Requested team: Full team

Build a polished, practical V1 Student Academic Operating System with a strict, private, admin-controlled authentication model for Classroom OS, transforming it from disconnected CRUD pages into a secure daily academic workspace.

Working directory: D:\CLASSROOM OS
Integrity mode: development

## Requirements

### R1. Authentication & Security Architecture
- Implement secure, private, session-based authentication (Next.js server-side HTTP-only cookies).
- **No public signup.** Admins manually create Student, Teacher, and CR accounts, which generate temporary passwords.
- Implement a `mustChangePassword` flow forcing new users to set a secure password on first login.
- Strictly enforce role-based access (`ADMIN`, `TEACHER`, `CR`, `STUDENT`) in server components, actions, and API routes.
- Decouple Auth identity from Academic profile (e.g. `users` table linked to `student_profiles`).

### R2. Core Domain & Data Isolation
- Enforce strict server-side authorization: Students can only access their own profile, submissions, and enrolled subjects/sections. Never trust client-provided IDs.
- Create `/admin/accounts` for the Admin to list, create, edit, deactivate, and reset passwords for Students, Teachers, and CRs.
- Extract the TU 80% attendance barometer calculation into a shared domain service, ensuring deterministic projection calculation (the "What-If" calculator).

### R3. Primary Student Views
- **Dashboard (`/`)**: Time-based greeting, current live class (with "NOW" badge), next classes, attendance overview, assignment overview, and pinned notices.
- **Today (`/today`)**: 7-day selector, timeline of classes categorized strictly by server time (UPCOMING, ONGOING, COMPLETED).
- **Subjects (`/subjects` & `/subjects/[id]`)**: Grid of enrolled subjects. Detail page includes tabs for Syllabus progress, Sessions, Assignments, and Resources.
- **Attendance (`/attendance`)**: Overall barometer (SAFE/CAUTION/DANGER), subject breakdown, history, and "Report Incorrect Attendance" flow.
- **Homework (`/homework`)**: Tabs for Active, Due Soon, Overdue, Submitted, Graded. Integrate UploadThing for assignment submission flow with drafts/retries.

### R4. Database & Infrastructure
- Extend Turso/libSQL schema (`src/db/schema.ts`) with new tables: `users`, `student_profiles`, `enrollments`, `assignment_submissions`, `exams`, `exam_results`, `resources`, `study_tasks`, `notifications`, and `attendance_correction_requests`.
- Integrate `UploadThing` for file storage. Application authorization must check file ownership/enrollment before granting access to uploaded resources.

## Acceptance Criteria

### Verification & Testing
- [ ] **E2E Playwright Tests:** Write Playwright end-to-end tests covering the core workflows: Admin creating a student account, Student logging in and changing password, and Student submitting an assignment.
- [ ] **Database Seeding:** Create a robust database seed script (`src/db/seed.ts`) that populates mock Users, Subjects, Sessions, and Assignments to easily verify the UI without manual entry.
- [ ] Ensure `npx tsc --noEmit` runs with 0 errors after schema and route changes.
- [ ] Database migration scripts execute successfully without referential integrity errors.
- [ ] A student cannot access a `/subjects/[id]` route for a subject they are not enrolled in, nor can they view another student's assignment submission by guessing IDs.

## 2026-08-16T11:12:17Z

# Teamwork Project Prompt — Resume Execution

> Status: Resuming
> Goal: Complete the project execution that was interrupted by a server restart.

The previous orchestration run died due to resource exhaustion. The background team made significant progress on Milestone 1 (Database & Seeding) and the E2E Testing Track. 
Your task is to:
1. Read `PROJECT.md` to understand the architecture and milestones.
2. Check `git status` and the codebase (`src/db/schema.ts`, `tests/`) to see exactly where the previous workers left off.
3. Continue the execution of Milestone 1, Milestone 2, Milestone 3, and Milestone 4.
4. Provide progress updates as you go.

## 2026-08-17T20:41:41Z

# Teamwork Project Prompt — Resume Execution

> Status: Resuming after server restart
> Goal: Complete V1 Student OS project execution from Milestone 2.

The server restarted, stopping all background agents. 
State summary:
- Milestone 1 (Database Schema Extension & Seeding) is COMPLETE & CERTIFIED.
- E2E Testing Track is READY (`TEST_READY.md`).
- Milestone 2 (Auth, Security, RBAC & Admin Accounts) was IN_PROGRESS (`sub_orch_m2`, `m2_worker_1` completed core files in `src/lib/auth/*`, `/login`, `/change-password`, `/admin/accounts`, and was entering verification).
- Milestone 3 (Academic Domain & Primary Student Views) is PLANNED.
- Milestone 4 (Final E2E Pass & Hardening) is PLANNED.

Your task:
1. Read `PROJECT.md` and `.agents/orchestrator_2/progress.md` to pick up context.
2. Resume `sub_orch_m2` / Milestone 2 verification and handoff to Milestone 3.
3. Complete Milestones 3 & 4.
4. Report progress updates as usual.

## 2026-08-18T01:22:10Z

# Teamwork Project Prompt — Resume Execution

> Status: Resuming after server restart
> Goal: Complete V1 Student OS project execution from Milestone 2 verification to Milestones 3 & 4.

The server restarted, stopping all background agents. 
State summary:
- Milestone 1 (Database Schema Extension & Seeding) is COMPLETE & CERTIFIED.
- E2E Testing Track is READY (`TEST_READY.md`).
- Milestone 2 (Auth, Security, RBAC & Admin Accounts) implementation is COMPLETED by `m2_worker_1`. Gate verification (Reviewers, Challengers, Auditor) is IN_PROGRESS.
- Milestone 3 (Academic Domain & Primary Student Views) is PLANNED.
- Milestone 4 (Final E2E Pass & Hardening) is PLANNED.

Your task:
1. Read `PROJECT.md`, `.agents/orchestrator_3/progress.md`, and `.agents/sub_orch_m2/progress.md` to pick up context.
2. Complete Milestone 2 gate verification and certify M2.
3. Advance to Milestone 3 (Student Operating System views, Attendance domain, UploadThing homework submissions, Subjects, Today, etc.).
4. Advance to Milestone 4 for final E2E test pass and adversarial hardening.
5. Provide progress updates as usual.

## 2026-08-18T14:28:04Z

# Teamwork Project Prompt — UI/UX & Responsive Navigation Refinement

> Status: Launched
> Goal: Comprehensive UI/UX refinement across Classroom OS

Working directory: D:\CLASSROOM OS
Integrity mode: development

## Requirements

### R1. Responsive Navigation Architecture
- **Desktop (>= 768px)**: Keep the rigid, high-contrast vertical sidebar (`w-64 bg-sidebar`) sticky on the left.
- **Mobile (< 768px)**: Replace non-standard layout elements with a clean, horizontal **Mobile Navigation Bar** (link pills for core student sections) + a mobile hamburger drawer (`Sheet`) for full menu access. Ensure content never overlaps or gets obstructed.

### R2. High-Contrast Typography & Visual Polish
- Enforce strict contrast ratios (minimum 4.5:1 for body, 3:1 for headings) across both Light and Dark themes.
- Replace any remaining tiny fonts (`text-[10px]`, `text-[11px]`, `text-xs`) on subheads, session notes, topics, teacher names, and status badges with legible typography (`text-sm` / `text-base` font-medium/semibold).
- Eliminate washed-out text styles. Upgrade muted slate colors (`#64748B`) to rich contrast slate (`#334155` / `#1E293B`).

### R3. Comprehensive Page UX Audit & Alignment
- Audit and refine all 9 student views (`/`, `/today`, `/routine`, `/subjects`, `/subjects/[id]`, `/attendance`, `/homework`, `/notices`, `/events`).
- Audit and refine all admin views (`/admin`, `/admin/accounts`, `/admin/homework`, `/admin/notices`, `/admin/events`, `/admin/teachers`, `/admin/students`, `/admin/subjects`).
- Ensure all interactive elements have `cursor-pointer`, active hover states, consistent border radii, and 0 layout shifts.

## Acceptance Criteria

### Verification & Testing
- [ ] `npx tsc --noEmit` completes with 0 compilation errors.
- [ ] All pages pass responsive layout checks at 375px (Mobile), 768px (Tablet), 1024px (Laptop), and 1440px (Desktop).
- [ ] 0 low-contrast text violations across light and dark modes.
- [ ] 100% pass rate on Playwright E2E test suite (`npx playwright test`).

## 2026-08-19T02:12:13Z

# Teamwork Project Prompt — Resume & Complete Milestone 4

> Status: Resuming Milestone 4
> Goal: Complete M4 Responsive & E2E verification for Classroom OS

Working directory: D:\CLASSROOM OS
Integrity mode: development

## Tasks
1. Execute the full Playwright E2E test suite across all 7 test specs (`tests/e2e/*.spec.ts`).
2. Verify multi-viewport responsive navigation at 375px (Mobile), 768px (Tablet), 1024px (Laptop), 1440px (Desktop).
3. Validate contrast compliance and 0 console errors.
4. Provide a final completion report for Milestone 4 certification.

