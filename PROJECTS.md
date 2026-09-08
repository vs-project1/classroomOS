# Classroom OS — Projects Lifecycle & Engineering Roadmap Framework

This file is the single source of truth for project planning, architectural milestones, and feature execution in Classroom OS. Every agent and engineer working on initiatives in this codebase MUST adhere to the 5-stage lifecycle and rules defined below.

---

## 🏛️ System Architecture Baseline

- **Framework**: Next.js 15+ App Router, React 19, Tailwind CSS v4, Radix/Base-UI via shadcn.
- **Database Layer**: Drizzle ORM + LibSQL / SQLite (`local.db`, Turso remote production).
- **Core User Roles**:
  - `STUDENT`: Timetable, daily attendance barometer, missed journal catch-up, handwritten homework tracker, notices, routine.
  - `CR` (Class Representative): Morning roll call / daily attendance ledger, lecture session logging, cohort timetable.
  - `TEACHER`: Assigned subject syllabus tracking, lecture logs, handwritten homework assignment, semester attendance rosters, dispute resolution.
  - `ADMIN`: User accounts management (Student/Teacher/CR/Admin), subjects & faculty assignment, weekly routine timetable matrix, system configuration, telegram cohort broadcasts.
- **Regional & Operational Invariants**:
  - **Timezone**: Strictly `Asia/Kathmandu` (NPT). Calendar day boundaries normalized to UTC midnight Nepal start-of-day.
  - **Calendar**: Bikram Sambat (BS) date formatting alongside Gregorian dates (`formatNepaliDate`).
  - **Physical Notebook Homework**: Nepali college reality eliminates digital PDF uploads and online grading rubrics; homework is tracked in physical student notebooks (`Mark as Done in Notebook` / `Completed in Notebook`).
  - **Single Canonical Daily Attendance**: Daily attendance (`daily_sessions` & `daily_attendance`) is the sole source of truth for college records and 80% TU exam eligibility. Lecture sessions (`class_sessions` & `lecture_logs`) are decoupled academic progress logs.

---

## 🧭 The 5-Stage Project Lifecycle

```
[ Stage 1: RFC & Discovery ] ➔ [ Stage 2: Technical Design Spec ] ➔ [ Stage 3: Implementation Plan ] ➔ [ Stage 4: Owned Path Dispatch ] ➔ [ Stage 5: Verification & Learnings Closeout ]
```

### Stage 1: Inception & Discovery (RFC / Problem Statement)
- **Goal:** Clarify the user problem, architectural impact, and cross-role implications before writing code.
- **Cross-Role Impact Matrix:** Explicitly evaluate how the proposed change impacts all 4 roles:
  * What changes for **Student**?
  * What changes for **Teacher**?
  * What changes for **CR**?
  * What changes for **Admin**?

### Stage 2: Technical Design & Specification
- **Location:** `docs/superpowers/specs/YYYY-MM-DD-<feature-slug>-design.md` (or `docs/specs/`).
- **Required Sections:**
  1. Problem statement, scope boundaries, and explicit non-goals.
  2. Database Schema changes (`src/db/schema.ts`, foreign keys, migrations, idempotency).
  3. Data Access Layer (DAL) query signatures (`src/features/<feature>/queries.ts`) and Server Action contracts.
  4. UI/UX layout, mobile/tablet/desktop responsive breakpoints, contrast compliance.
  5. Security & RBAC: Authorization gates (`requireAuth`, capability checks).
  6. Migration strategy, seed data synchronization, and rollback safety.

### Stage 3: Bite-Sized Implementation Plan
- **Location:** `docs/superpowers/plans/YYYY-MM-DD-<feature-slug>.md` (or `docs/plans/`).
- **Required Format:**
  - Checkbox tasks (`- [ ]`) broken into bite-sized, testable steps.
  - Explicit file paths, exact target line numbers, and expected interfaces.
  - Verification command for each task (e.g. `npx tsc --noEmit`, targeted Playwright spec).
  - Explicit assignment of owned paths to prevent multi-agent collisions.

### Stage 4: Execution & Multi-Agent Dispatch
- **Agent Run Directory:** `.agents/runs/<date>_<task>/<role>_<n>/`
- **Artifacts:**
  - `BRIEFING.md`: Worker role, strictly owned paths, constraints, and done-criteria.
  - `DISPATCH.md`: Exact prompt dispatched to the agent.
  - `progress.md`: Incremental running log of modifications and findings.
  - `handoff.md`: Final completion summary, test evidence, and handoff notes.
- **Rule of Exclusive Ownership:** An agent may ONLY edit files inside its declared **Owned Paths**.

### Stage 5: Verification, Audit & Knowledge Closeout
- **Verification Gates:**
  1. Subagent Role Verification: Invoke `TeacherVerifier`, `CRVerifier`, and `StudentVerifier` to verify independent roles.
  2. Strict Zero-Regression Typecheck: Must exit with 0 errors (`npx tsc --noEmit`).
  3. Automated End-to-End Tests: Must pass 100% of affected Playwright test suites.
- **Hygiene & Knowledge Loop:**
  1. Mandatory Dead Code Elimination: Purge all obsolete components, functions, and types per Rule 6.
  2. Self-Improving Learnings Log: Append any bug, design oversight, or edge case to `LEARNINGS.md`.
  3. Milestone Board Update: Update the status in this `PROJECTS.md` file.

---

## 📊 Active Projects & Milestones Board

| Milestone | Project / Feature Name | Scope & Key Paths | Dependencies | Owner / Role | Status |
|---|---|---|---|---|---|
| **M1** | Attendance Simplification & Unification | `src/features/attendance/**`, `daily_attendance`, dispute flows, missed catch-up journal | None | Lead Agent | `COMPLETED` |
| **M2** | Routine Cohort Isolation & Period Merging | `src/features/routine/**`, `weeklyRoutine`, adjacent period blocks, semester tabs | M1 | Backend / DAL | `COMPLETED` |
| **M3** | Handwritten Notebook Homework Workflow | `src/features/homework/**`, notebook status toggles, teacher dispute queues | M1 | Fullstack | `COMPLETED` |
| **M4** | Central Telegram Bot & Routine Broadcasts | `src/lib/telegram/**`, `semester_telegram_configs`, daily briefings | M2 | Infra / Backend | `COMPLETED` |
| **M5** | Responsive UI/UX & Dual-Theme Contrast | `src/components/student/**`, `src/app/(admin)/**`, `StatusChip`, high contrast badges | M1, M2 | Frontend / UX | `COMPLETED` |
| **M6** | Multi-Role Cross-Verification & E2E Hardening | `tests/e2e/**`, role verifiers, security ownership, auth flows | M1-M5 | QA / Verifiers | `IN_PROGRESS` |

*Status options: `BACKLOG`, `PLANNED`, `IN_PROGRESS`, `VERIFYING`, `COMPLETED`, `ARCHIVED`*

---

## 🗄️ Completed Milestones & Changelog Archive

| Milestone | Project Name | Completed Date | Key Deliverables & Summary |
|---|---|---|---|
| **M1** | Attendance Simplification & Unification | 2026-09-08 | Decoupled lecture logs from roll call; established `daily_attendance` as canonical truth; unified student barometer & catch-up journal. |
| **M2** | Routine Cohort Isolation & Period Merging | 2026-09-06 | Isolated routine timetable queries at DB level per semester cohort; merged back-to-back periods into single blocks. |
| **M3** | Handwritten Notebook Homework Workflow | 2026-09-06 | Eliminated digital PDF uploads & grading rubrics; implemented physical notebook diary tracker (`Completed in Notebook`). |
| **M4** | Central Telegram Bot & Routine Publishing | 2026-09-06 | Single bot token with semester-to-chat mapping; change detection banner (`[ Publish Changes to Telegram ]`); Sunday 8 PM kickoff. |
| **M5** | Responsive UI/UX & Dual-Theme Contrast | 2026-09-01 | Rigid desktop sidebar + dual-tier sticky mobile topbar & hamburger drawer; WCAG 4.5:1 contrast hardening on status badges. |

---

## 💡 Backlog & Future Initiatives

- [ ] **Offline PWA Sync:** Cache routine, attendance, and syllabus locally using Service Workers for spotty campus Wi-Fi.
- [ ] **Automated Semester Rollover:** Batch promote students from Semester `N` to `N+1` while archiving previous attendance and routine logs.
- [ ] **Teacher Substitute Assignment:** Allow admins to assign temporary substitute teachers for specific routine periods with notification dispatch.
