# BRIEFING — 2026-08-15T18:25:05+05:45

## Mission
Investigate and design technical specifications for R2 (Student Views & TU 80% Barometer), R3/R4 (DB Schema Extensions & Seeding), and E2E Testing for Classroom OS.

## 🔒 My Identity
- Archetype: explorer
- Roles: survey, academic domain, UI views, database schema, seeding, testing
- Working directory: D:\CLASSROOM OS\.agents\explorer_survey_academic_ui_db_1
- Original parent: ef424905-d0a2-4bcb-abc7-a97e3456ce22
- Milestone: survey & specification phase

## 🔒 Key Constraints
- Read-only investigation — do NOT modify application source code (only write to own `.agents` folder).
- Standardize all timezones on Asia/Kathmandu (NPT).
- Radical simplicity (YAGNI), strict SQLite database-level integrity (CHECK constraints, foreign keys with ON DELETE CASCADE, composite unique constraints).
- React 19 Server Actions via `useActionState` and Zod validation.
- Clear distinction: Homework (daily notes/recap) vs Assignments (compulsory tasks with deadlines/submissions).
- Graphify-aware investigation.

## Current Parent
- Conversation ID: ef424905-d0a2-4bcb-abc7-a97e3456ce22
- Updated: 2026-08-15T18:25:05+05:45

## Investigation State
- **Explored paths**:
  - `src/db/schema.ts`, `src/db/client.ts`
  - `src/lib/auth.ts`, `src/lib/time.ts`, `src/lib/utils.ts`
  - `src/app/(student)/page.tsx`, `src/app/(student)/today/page.tsx`, `src/app/(student)/attendance/page.tsx`, `src/app/(student)/homework/page.tsx`
  - `src/app/(admin)/admin/subjects/[id]/page.tsx`
  - `src/app/api/uploadthing/core.ts`, `src/app/api/uploadthing/route.ts`
  - `scripts/verify-db.ts`, `package.json`
- **Key findings**:
  - Complete mathematical model established for TU 80% attendance requirement: $M_{\text{max}} = \max(0, \lfloor 1.25 A - T \rfloor)$ for safe buffer, $C_{\text{min}} = \max(0, 4 T - 5 A)$ for recovery target, with SAFE ($\ge 80\%$), CAUTION ($75-80\%$), DANGER ($< 75\%$) categories.
  - Primary student views blueprints defined for Dashboard (`/`), Today (`/today`), Subjects (`/subjects` & `/subjects/[id]`), Attendance (`/attendance`), Homework/Assignments (`/homework`).
  - 10 database schema extension tables specified with full SQLite CHECK constraints, composite unique constraints, and cascading foreign keys.
  - Complete seeding blueprint (`src/db/seed.ts`) detailed for multi-role mock data across 5 subjects, 45 sessions, diverse attendance zones, and multi-state assignments.
  - Playwright E2E testing strategy specified with 5 core test suites.
- **Unexplored areas**: None.

## Key Decisions Made
- Defined pure, deterministic attendance calculation logic decoupled from database queries for reliable unit testing and "What-If" simulation.
- Enforced strict authorization guard on `/subjects/[id]` to guarantee data isolation based on `enrollments` table.
- Formulated the exact distinction between informal daily session homework (`lectureLogs.homework`) and formal graded assignments (`homework` & `assignmentSubmissions`).

## Artifact Index
- D:\CLASSROOM OS\.agents\explorer_survey_academic_ui_db_1\DISPATCH.md — incoming dispatch instructions
- D:\CLASSROOM OS\.agents\explorer_survey_academic_ui_db_1\progress.md — liveness heartbeat
- D:\CLASSROOM OS\.agents\explorer_survey_academic_ui_db_1\BRIEFING.md — persistent working memory
- D:\CLASSROOM OS\.agents\explorer_survey_academic_ui_db_1\handoff.md — comprehensive 5-component survey and technical design handoff report
