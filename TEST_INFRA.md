# Classroom OS - Comprehensive Test Infrastructure & Strategy (TEST_INFRA.md)

This document specifies the end-to-end testing architecture, multi-tiered test methodology, execution requirements, and continuous quality verification matrix for **Classroom OS** across all core subsystems, student experiences, admin console, responsive viewports, and visual contrast standards.

---

## 1. Test Architecture & Methodology

Classroom OS uses a strict **4-Tier Testing Methodology** ensuring radical simplicity, database-level integrity, opaque-box functional verification, responsive accessibility, and security boundary isolation.

```
┌──────────────────────────────────────────────────────────────────────────┐
│                        Classroom OS Test Matrix                          │
├────────────────────────────┬─────────────────────────────────────────────┤
│ Tier 1: Canonical Paths    │ Happy-path user workflows, UI rendering,    │
│                            │ standard page flows and state updates       │
├────────────────────────────┼─────────────────────────────────────────────┤
│ Tier 2: Edge & Boundaries  │ Min/max thresholds, zero states, multi-day   │
│                            │ spans, weekend handling, empty collections  │
├────────────────────────────┼─────────────────────────────────────────────┤
│ Tier 3: Adverse Scenarios  │ Corrupt cookies, expired sessions, invalid  │
│                            │ passwords, file type/size boundary rejects  │
├────────────────────────────┼─────────────────────────────────────────────┤
│ Tier 4: Security & Tenant  │ Role isolation (Admin vs Student), multi-   │
│         Isolation          │ student privacy boundaries, quarantine lock │
└────────────────────────────┴─────────────────────────────────────────────┘
```

### Core Testing Invariants & Constraints

1. **Opaque-Box Verification**: Tests interact strictly through the DOM (`data-testid`, accessible ARIA roles, input labels, text selectors) and standard HTTP/browser events.
2. **Serial Execution for SQLite Safety**: To avoid database locking contention on SQLite (`better-sqlite3`), all test runners are configured with `workers: 1` (`fullyParallel: false`).
3. **Deterministic NPT Timezone Alignment**: Form date pickers and schedule calculations operate under Nepal Time (`Asia/Kathmandu`, UTC+05:45). Default dates use `Intl.DateTimeFormat('en-CA', ...)` to prevent UTC boundary mismatches.
4. **Deterministic Auth Injection via Fixtures**: Tests leverage Playwright custom fixtures (`tests/fixtures/auth.fixture.ts`) to inject valid SHA-256 session tokens directly into browser context cookies, enabling instantaneous persona testing without slow, repetitive login form submissions.
5. **Offline UploadThing Mocking**: File uploads and assignment submissions intercept `api/uploadthing` network requests with realistic JSON payloads, eliminating external network dependencies during automated runs.
6. **Responsive Layout Verification**: Responsive navigation tests validate responsive layouts across wide desktop (`1440px`), laptop (`1024px`), tablet landscape (`768px`), medium mobile (`414px`), and small mobile (`375px`) viewports.

---

## 2. Feature Inventory & Coverage Mapping

| Feature ID | Feature Description | Assigned Spec File | Executable Tests | Tier Coverage |
| :--- | :--- | :--- | :---: | :---: |
| **F1, F2, F3** | Extended DB Schema, Foreign Keys & Seed Data | `db-verification` & fixtures | 12 | Tier 1, 2, 3 |
| **F4, F5, F6, F7** | Session Auth, Quarantine, Admin Console & RBAC | `auth-lifecycle.spec.ts` | 10 | Tier 1, 2, 3, 4 |
| **F9, F10** | TU 80% Barometer Domain & "What-If" Calculator | `attendance-barometer.spec.ts` | 6 | Tier 1, 2, 3 |
| **F11, F12** | Student Dashboard Timeline & Routine Navigation | `dashboard-schedule.spec.ts` | 9 | Tier 1, 2 |
| **F13, F14** | Student Subjects Workspace & Multi-Tenant Isolation | `subject-isolation.spec.ts` | 6 | Tier 1, 2, 4 |
| **F15, F16, F17** | Attendance Hub, Homework Submissions & Mock Storage | `homework-submissions.spec.ts` | 6 | Tier 1, 2, 3 |
| **F18** | Responsive Layout & Sticky Navigation Architecture | `responsive-navigation.spec.ts` | 9 | Tier 1, 2, 4 |
| **F19** | High-Contrast Typography & Dual-Theme Polish | `typography-contrast.spec.ts` | 15 | Tier 1, 2 |
| **Total** | **All System Capabilities (Phases 1–3 + UI/UX Track)** | **7 Spec Files** | **65 Tests** | **Tiers 1–4** |

---

## 3. Playwright Test Suite Directory

All E2E test specs are housed in `tests/e2e/`:

```
tests/
├── fixtures/
│   └── auth.fixture.ts               # Test personas (admin, student, newStudent, unauthorized)
└── e2e/
    ├── auth-lifecycle.spec.ts        # 10 tests: Login, logout, quarantine password change, RBAC
    ├── dashboard-schedule.spec.ts    # 9 tests: Student dashboard, today timeline, weekly routine
    ├── attendance-barometer.spec.ts  # 6 tests: 80% barometer, color bands, what-if simulator
    ├── homework-submissions.spec.ts  # 6 tests: Homework tabs, offline UploadThing mock, notes
    ├── subject-isolation.spec.ts     # 6 tests: Enrolled subject cards, 4-tab details, 404 security
    ├── responsive-navigation.spec.ts # 9 tests: Desktop sticky sidebar, mobile pill bar & Sheet drawer
    └── typography-contrast.spec.ts   # 15 tests: Minimum font size (>=11.5px), theme toggle & contrast
```

---

## 4. Test Execution & Quality Gates

### Prerequisites
- Node.js >= 18
- Local database seeded via `npm run db:seed` or `npm run build`

### Runner Commands

```bash
# 1. Typecheck entire project (app code + test suites)
npx tsc --noEmit

# 2. List all discovered Playwright tests
npx playwright test --list

# 3. Run all E2E test suites (with automatic webServer spin-up)
npx playwright test

# 4. Run individual test suites
npx playwright test tests/e2e/responsive-navigation.spec.ts
npx playwright test tests/e2e/typography-contrast.spec.ts
npx playwright test tests/e2e/auth-lifecycle.spec.ts
npx playwright test tests/e2e/attendance-barometer.spec.ts
npx playwright test tests/e2e/homework-submissions.spec.ts
npx playwright test tests/e2e/subject-isolation.spec.ts
npx playwright test tests/e2e/dashboard-schedule.spec.ts

# 5. Run with headed browser for visual inspection
npx playwright test --headed
```
