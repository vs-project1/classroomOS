# BRIEFING — 2026-08-18T02:20:00Z

## Mission
Implement and verify all Milestone 3 features: Attendance Domain Engine & Hub, Student Dashboard & Today Timeline, Subjects Workspace & Multi-tenant Authorization, and Homework Submission Workspace with UploadThing.

## 🔒 My Identity
- Archetype: teamwork_preview_worker
- Roles: implementer, qa, specialist
- Working directory: D:\CLASSROOM OS\.agents\m3_worker_1
- Original parent: 81194be9-fd5f-431c-b294-ad7fc2da9ec6
- Milestone: Milestone 3 (Student Core Workspace)

## 🔒 Key Constraints
- Strict TU 80% attendance domain formulas with missable buffer and recovery requirements.
- NPT (Asia/Kathmandu) timezone standardization across UI dates and greetings.
- Strict multi-tenant data isolation on `/subjects/[id]` and `/homework/submissions/[id]`.
- React 19 Server Actions (`useActionState`) and Zod validation for all data mutations.
- No dummy/facade implementations or hardcoded test values.

## Current Parent
- Conversation ID: 81194be9-fd5f-431c-b294-ad7fc2da9ec6
- Updated: 2026-08-18T02:20:00Z

## Task Summary
- **What to build**: Complete Milestone 3 Student Core Experience across attendance, dashboard, schedule, subjects, and assignments.
- **Success criteria**: 100% passing tests in `attendance-barometer.spec.ts`, `dashboard-schedule.spec.ts`, `subject-isolation.spec.ts`, `homework-submissions.spec.ts`, and `auth-lifecycle.spec.ts`.
- **Interface contracts**: PROJECT.md & .agents/orchestrator_4/m3_plan.md.

## Key Decisions Made
- Implemented pure attendance mathematical engine in `src/lib/attendance.ts` with exact integer buffer calculations $\lfloor 1.25A - T \rfloor$ and recovery requirements $\max(0, 4T - 5A)$.
- Created Base UI modal dialogs with compact spacing and max-height scrolling to ensure smooth Playwright automation.
- Built interactive client components (`WhatIfCalculator`, `DayStripSelector`, `HomeworkClientWorkspace`, `SubjectTabsWorkspace`) with responsive UI, feedback states, and optimistic draft saving.

## Artifact Index
- `src/lib/attendance.ts` — Pure TU 80% attendance engine.
- `src/app/(student)/attendance/*` — Attendance hub, What-If simulator, dispute modal dialog, and server actions.
- `src/app/(student)/page.tsx` — Student dashboard with NPT greeting, timetable, gauge, and notices.
- `src/app/(student)/today/*` — 7-day schedule timeline with `DayStripSelector` and class status tags.
- `src/app/(student)/subjects/*` — Enrolled subjects catalog and 4-tab authorized workspace.
- `src/app/(student)/homework/*` — 5-tab homework workspace, submission dialog, draft actions, and graded card.
- `src/app/api/uploadthing/core.ts` — UploadThing file router for assignments and materials.
- `scripts/seed-e2e.ts` — Deterministic test dataset seeder.
