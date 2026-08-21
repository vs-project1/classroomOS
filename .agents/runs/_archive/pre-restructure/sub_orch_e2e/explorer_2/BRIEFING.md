# BRIEFING — 2026-08-15T18:30:00Z

## Mission
Design the authoritative 4-tier opaque-box test strategy, test matrix, Category-Partition/BVA specifications, cross-feature interaction suites, and draft `TEST_INFRA.md` for the Classroom OS E2E test track across all 5 spec suites (`auth-lifecycle`, `dashboard-schedule`, `attendance-barometer`, `homework-submissions`, `subject-isolation`).

## 🔒 My Identity
- Archetype: Specification Miner / Test Architect
- Roles: Specification Mining, Black-Box / Opaque-Box Test Matrix Design, BVA & Category-Partition Modeling
- Working directory: D:\CLASSROOM OS\.agents\sub_orch_e2e\explorer_2
- Original parent: 864c2760-d60f-4002-a425-93c9e359c93d
- Milestone: M_E2E_1

## 🔒 Key Constraints
- Opaque-box test design: test exclusively against rendered DOM, public/protected routes, HTTP cookies, and status codes.
- Do NOT implement application code (read-only spec miner).
- Comprehensive 4-tier testing hierarchy:
  - Tier 1: Feature Coverage (>=5 test cases per feature covering happy paths and representative inputs)
  - Tier 2: Boundary & Corner Cases (>=5 test cases per feature covering edge cases, limit conditions, invalid states, empty inputs)
  - Tier 3: Cross-Feature Combinations (pairwise interactions: session -> homework, attendance -> barometer, quarantine password change -> dashboard unlock, etc.)
  - Tier 4: Real-World Application Scenarios (end-to-end multi-step user journeys: Student morning routine, At-risk recovery, Assignment submission/grading)
- Output structured handoff report in `D:\CLASSROOM OS\.agents\sub_orch_e2e\explorer_2\handoff.md`.

## Current Parent
- Conversation ID: 864c2760-d60f-4002-a425-93c9e359c93d
- Updated: 2026-08-15T18:30:00Z

## Loaded Skills
- None loaded.

## Task Summary
- **What to build**: Full 4-Tier Test Matrix, Category-Partition Analysis, Boundary Value Analysis (BVA), Pairwise Combination Matrix, Real-World E2E Scenarios, 5 Target Spec Files detailed designs (`auth-lifecycle.spec.ts`, `dashboard-schedule.spec.ts`, `attendance-barometer.spec.ts`, `homework-submissions.spec.ts`, `subject-isolation.spec.ts`), and `TEST_INFRA.md` draft structure.
- **Success criteria**: Exhaustive coverage of F1-F19 features, >=5 Tier 1 cases per feature, >=5 Tier 2 cases per feature, pairwise interactions, 5 real-world user journeys, complete spec blueprints.
- **Interface contracts**: `PROJECT.md`, `SCOPE.md`, `src/lib/attendance.ts`, `src/lib/auth/`, `src/app/api/uploadthing/`
- **Code layout**: `tests/e2e/`, `tests/fixtures/`, `TEST_INFRA.md`

## Key Decisions Made
- Mapped all 19 features (F1 to F19) into full Tier 1 (>95 cases) and Tier 2 (>95 cases) test tables.
- Defined 10 cross-feature pairwise combination tests (Tier 3) modeling cascading DB and UI triggers.
- Formulated 5 complete real-world user journeys (Tier 4): Onboarding/Quarantine, Morning Routine, At-Risk Recovery, Assignment Submission/Feedback, Multi-Tenant Security.
- Detailed Category-Partition and BVA matrices for the 5 target spec files.
- Provided full architectural draft for `TEST_INFRA.md`.

## Artifact Index
- `DISPATCH.md` — User assignment and dispatch instructions
- `BRIEFING.md` — Persistent working memory and situational awareness
- `progress.md` — Liveness heartbeat and step tracking
- `handoff.md` — Full test methodology, test matrices, and `TEST_INFRA.md` draft report
