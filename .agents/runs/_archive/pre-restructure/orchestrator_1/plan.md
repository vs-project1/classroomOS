# Master Orchestration Plan — Classroom OS V1

## Track 1: Implementation Track (Sequential Milestones)

### Milestone 1: Database Schema Extension & Seeding Infrastructure
- **Objective**: Extend `src/db/schema.ts` with 10 required tables (`users`, `student_profiles`, `enrollments`, `assignment_submissions`, `exams`, `exam_results`, `resources`, `study_tasks`, `notifications`, `attendance_correction_requests`), update relations, update `scripts/verify-db.ts`, and create `src/db/seed.ts`.
- **Sub-orchestrator**: `sub_orch_m1` in `.agents/sub_orch_m1/`
- **Gate Criteria**:
  1. `npx tsc --noEmit` passes with 0 errors.
  2. `npm run db:verify` passes all constraint checks.
  3. `npx tsx src/db/seed.ts` successfully seeds database without referential errors.
  4. 2 Reviewers APPROVE, 2 Challengers pass, Forensic Auditor gives CLEAN.

### Milestone 2: Authentication, Security, RBAC & Admin Accounts
- **Objective**: Implement institutional session-based auth (`auth_session` HTTP-only cookie, `node:crypto` scrypt hashing), `mustChangePassword` quarantine flow, middleware route protection, `/login`, `/change-password`, and `/admin/accounts` console.
- **Sub-orchestrator**: `sub_orch_m2` in `.agents/sub_orch_m2/`
- **Gate Criteria**:
  1. `npx tsc --noEmit` passes with 0 errors.
  2. Middleware & server action security tests pass.
  3. 2 Reviewers APPROVE, 2 Challengers pass, Forensic Auditor gives CLEAN.

### Milestone 3: Academic Domain Services & Primary Student Views
- **Objective**: Implement TU 80% domain calculator & What-If calculator (`src/lib/attendance.ts`), Dashboard `/`, Today `/today`, Subjects `/subjects` & `/subjects/[id]` (4 tabs with enrollment authorization), Attendance `/attendance` (barometer + correction requests), Homework `/homework` (5 tabs + UploadThing file submissions).
- **Sub-orchestrator**: `sub_orch_m3` in `.agents/sub_orch_m3/`
- **Gate Criteria**:
  1. `npx tsc --noEmit` passes with 0 errors.
  2. UI and domain calculation tests pass.
  3. 2 Reviewers APPROVE, 2 Challengers pass, Forensic Auditor gives CLEAN.

### Milestone 4: Final Milestone (Dual Phase Integration)
- **Phase 1**: Pass 100% of E2E Test Suite (Tiers 1-4).
- **Phase 2**: Adversarial Coverage Hardening (Tier 5 Challenger loop).
- **Sub-orchestrator**: `sub_orch_m4` in `.agents/sub_orch_m4/`

---

## Track 2: E2E Testing Track (Parallel Requirement-Driven)

### E2E Testing Orchestrator
- **Objective**: Setup Playwright test infrastructure, design and write Tiers 1-4 test suites based on `ORIGINAL_REQUEST.md`, publish `TEST_READY.md`.
- **Sub-orchestrator**: `sub_orch_e2e` in `.agents/sub_orch_e2e/`
- **Deliverables**: `TEST_INFRA.md`, Playwright config, 5 test spec files covering all user flows, `TEST_READY.md`.
