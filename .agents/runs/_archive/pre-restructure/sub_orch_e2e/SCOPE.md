# Scope: E2E Testing Track — Classroom OS

## Architecture
Opaque-box, requirement-driven test framework built with Playwright. Tests run against the Next.js local server with authenticated session fixtures, mock seeds, and deterministic database fixtures.

```
tests/
├── e2e/
│   ├── auth-lifecycle.spec.ts       # Tier 1-4: Admin account creation, temporary password login, forced password change quarantine
│   ├── dashboard-schedule.spec.ts   # Tier 1-4: NPT greeting, Live class "NOW" badge, schedule timeline, navigation
│   ├── attendance-barometer.spec.ts # Tier 1-4: TU 80% barometer, SAFE/CAUTION/DANGER chips, What-If simulation, dispute flow
│   ├── homework-submissions.spec.ts # Tier 1-4: Tabs (Active, Due Soon, Overdue, Submitted, Graded), draft saving, file submission
│   └── subject-isolation.spec.ts    # Tier 1-4: Enrolled subject grid, 4 tabs (Syllabus, Sessions, Assignments, Resources), 404/403 forbidden isolation
└── fixtures/
    ├── auth.fixture.ts              # Session creation & cookie injection helpers
    └── seed-data.ts                 # Deterministic mock academic data & users
```

## Feature Inventory Mapping
| # | Feature | Description | E2E Milestone | Target Spec File |
|---|---------|-------------|---------------|------------------|
| F4 | Session-Based Authentication | Secure HTTP-only cookies, 30-day TTL, scrypt hashing | M_E2E_3 | auth-lifecycle.spec.ts |
| F5 | Admin Account Provisioning | Admin creates Student/Teacher/CR with temp password | M_E2E_3 | auth-lifecycle.spec.ts |
| F6 | Mandatory Password Change | `mustChangePassword` quarantine flow on `/change-password` | M_E2E_3 | auth-lifecycle.spec.ts |
| F7 | RBAC Enforcement | Strict role guard across layouts & actions | M_E2E_3 | auth-lifecycle.spec.ts |
| F8 | Admin Accounts Console | `/admin/accounts` list, create, edit, deactivate | M_E2E_3 | auth-lifecycle.spec.ts |
| F9 | TU 80% Barometer Domain | Pure calculation: buffer, recovery, category chips | M_E2E_3 | attendance-barometer.spec.ts |
| F10 | "What-If" Projection Calculator | Reactive simulation modeling future sessions | M_E2E_3 | attendance-barometer.spec.ts |
| F11 | Student Dashboard (`/`) | Greeting, NOW badge, upcoming classes, gauge, notices | M_E2E_3 | dashboard-schedule.spec.ts |
| F12 | Student Today Timeline (`/today`) | 7-day strip, server-time status categorized | M_E2E_3 | dashboard-schedule.spec.ts |
| F13 | Student Subjects Workspace | `/subjects` & `/subjects/[id]` 4 tabs | M_E2E_3 | subject-isolation.spec.ts |
| F14 | Strict Subject Data Isolation | Server-side 404/403 for un-enrolled subjects/submissions | M_E2E_3 | subject-isolation.spec.ts |
| F15 | Attendance Hub & Correction | History log, "Report Incorrect Attendance" modal | M_E2E_3 | attendance-barometer.spec.ts |
| F16 | Homework & Assignment Workspace | Tabs, submission modal, draft saving, feedback | M_E2E_3 | homework-submissions.spec.ts |
| F17 | UploadThing Assignment Storage | File upload with validation and access control | M_E2E_3 | homework-submissions.spec.ts |
| F18 | E2E Testing Infrastructure | `playwright.config.ts`, `TEST_INFRA.md`, runners | M_E2E_1, M_E2E_2 | playwright.config.ts |
| F19 | Comprehensive E2E Test Suite | 5 spec files covering Tiers 1-4, `TEST_READY.md` | M_E2E_3, M_E2E_4 | tests/e2e/*.spec.ts |

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| M_E2E_1 | Test Infrastructure & Methodology (`TEST_INFRA.md`) | Define 4-tier testing methodology, Category-Partition, BVA, Pairwise Combinatorial, and Real-World Workload scenarios covering all features | None | IN_PROGRESS |
| M_E2E_2 | Playwright Framework & Fixtures Setup | Configure `playwright.config.ts`, package scripts, auth session fixtures, and seed data helpers | M_E2E_1 | PLANNED |
| M_E2E_3 | E2E Spec Implementation (Tiers 1-4) | Implement 5 comprehensive spec suites in `tests/e2e/` testing all required flows | M_E2E_2 | PLANNED |
| M_E2E_4 | Verification & Readiness Publication (`TEST_READY.md`) | Run test suite, verify 100% pass, and publish `TEST_READY.md` at project root | M_E2E_3 | PLANNED |

## Interface Contracts & Test Harness Standards
- **Opaque-Box Testing**: Tests interact solely via rendered DOM, navigation URLs, and HTTP cookies/responses. No reliance on internal component props or unexported DB state.
- **Deterministic Test Users**:
  - Admin: `admin@classroom.edu.np`
  - Active Student: `student@classroom.edu.np`
  - First-time Student: `newstudent@classroom.edu.np` (mustChangePassword: true)
  - Unenrolled Student: `unauthorized@classroom.edu.np`
- **Execution Target**: `http://localhost:3000` via Playwright `webServer` or local runner.
