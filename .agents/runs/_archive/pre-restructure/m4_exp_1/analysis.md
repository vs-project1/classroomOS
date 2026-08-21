# Comprehensive Analysis: Classroom OS Test Environment & E2E Suite Inspection

**Agent ID**: `m4_exp_1` (Teamwork Preview Explorer)  
**Parent Task**: `c32c20c2-f422-4900-aefc-bfa5570ed110`  
**Date**: 2026-08-19  
**Status**: VERIFIED & READY FOR TEST EXECUTION  

---

## 1. Executive Summary

A comprehensive inspection of the **Classroom OS** end-to-end testing environment, configuration, fixtures, seed infrastructure, and all **7 Playwright test spec files** in `tests/e2e/` was conducted.

### Core Metrics & Health
- **TypeScript Compilation (`npx tsc --noEmit`)**: **0 Errors (Exit Code: 0)**
- **Playwright Test Discovery (`npx playwright test --list`)**: **65 Tests Discovered across 7 Files (Exit Code: 0)**
- **Database Seeding (`npm run db:seed`)**: **Completed Cleanly in 55.07s (Exit Code: 0)**
- **Deterministic E2E Seeder (`scripts/seed-e2e.ts`)**: **Configured via `globalSetup` in `playwright.config.ts`**
- **Test Matrix Coverage**: 4 Tiers (Canonical Paths, Edge & Boundaries, Adverse Scenarios, Security/Tenant Isolation)

---

## 2. Test Execution Environment & Configuration Inspection

### 2.1 `playwright.config.ts` Architecture
- **Worker Concurrency**: Set to `workers: 1` and `fullyParallel: false`. This strictly aligns with Classroom OS Architecture Rule §2/§6, avoiding SQLite `better-sqlite3` table/file lock contention during test execution.
- **Timezone Standardization**: Configured with `timezoneId: "Asia/Kathmandu"` (NPT, UTC+05:45) and `locale: "en-US"`, preventing UTC boundary errors on date pickers, class timelines, and session greetings.
- **Timeouts**:
  - Global test timeout: `45,000ms` (45s)
  - Assertion expect timeout: `10,000ms` (10s)
  - Action timeout: `15,000ms` (15s)
  - Navigation timeout: `30,000ms` (30s)
- **Web Server Orchestration**:
  - Command: `npm run dev -- -p 3001`
  - Target URL: `http://localhost:3001` (overridable via `process.env.PLAYWRIGHT_TEST_BASE_URL`)
  - Server reuse enabled (`reuseExistingServer: true`), startup timeout `120,000ms`.
  - Environment variables explicitly passed: `NODE_ENV: "test"`, `DATABASE_URL: "file:local.db"`, `APP_ROLE: "ADMIN"`.
- **Global Setup**: `tests/fixtures/global-setup.ts` automatically runs Drizzle migrations (`drizzle/`) and executes `seedE2E()` before running any specs, creating a clean snapshot backup (`local.test-seed.db`).

---

## 3. Auth Fixtures & Mocking Infrastructure

### 3.1 Auth Fixture (`tests/fixtures/auth.fixture.ts`)
- **Deterministic Token Injection**: Leverages `createSessionToken` from `src/lib/auth/token` to sign SHA-256 HMAC session cookies directly into the Playwright `BrowserContext`, eliminating repetitive, slow UI login form roundtrips.
- **Pre-configured Personas**:
  1. `adminPage`: Authenticated as `admin@classroom.edu.np` (`usr_admin_001`, `ADMIN` role).
  2. `studentPage`: Authenticated as `student@classroom.edu.np` (`usr_student_001`, `STUDENT` role, enrolled in BCA 4th sem).
  3. `newStudentPage`: Authenticated with `mustChangePassword: true` (`usr_newstudent_001`, quarantined to `/change-password`).
  4. `unauthorizedPage`: Authenticated as `unauthorized@classroom.edu.np` (`usr_unauthorized_001`, CSIT 2nd sem student accessing restricted BCA subjects).
  5. `guestPage`: Unauthenticated context for testing login validation, invalid credentials, and public flows.

### 3.2 Offline UploadThing & Storage Mock (`tests/fixtures/upload-mock.ts`)
- Mocks Next.js API route `**/api/uploadthing**` (GET schema discovery and POST upload initiation).
- Intercepts synthetic upload responses and provides `attachSyntheticFile` helper generating valid `%PDF-1.4` binary buffers directly into DOM `input[type='file']` elements, completely eliminating external cloud network flakiness.

### 3.3 Page Object Model (POM) Structure (`tests/fixtures/pom/`)
All 9 POM classes are clean, maintainable, and adhere to accessible locator best practices:
- `base.page.ts`: Common toast notifications, headers, navigation helpers.
- `login.page.ts`: Form inputs, submit button, error messages.
- `change-password.page.ts`: Old/new password inputs, validation feedback.
- `admin-accounts.page.ts`: User roster tables, account creation modal, temporary password dialog.
- `dashboard.page.ts`: Time-based greeting, attendance gauge, upcoming timetable, notices.
- `today.page.ts`: 7-day strip selector, timeline cards, temporal status tags.
- `attendance.page.ts`: TU 80% gauge, What-If slider, subject breakdown table, dispute modal.
- `homework.page.ts`: 5 tabs (Active/Due Soon/Overdue/Submitted/Graded), submission modal, draft buttons.
- `subjects.page.ts`: Enrolled subject grid, 4-tab details (Syllabus, Sessions, Assignments, Resources).

---

## 4. Comprehensive Test Suite & Spec Inventory (65 Tests)

| # | Spec File | Focus Area | Test Cases | Tier Coverage | Key Validations |
|---|---|---|:---:|:---:|---|
| 1 | `tests/e2e/auth-lifecycle.spec.ts` | Auth, Quarantine & Admin Accounts | 13 | Tiers 1, 2, 3, 4 | - Admin & Student valid logins<br>- Invalid password & non-existent user alerts<br>- Empty form client validation<br>- Quarantine redirection on `mustChangePassword`<br>- BVA password length (<8 chars) & mismatch<br>- Password rotation unlocking account<br>- Admin accounts list & student provisioning<br>- Student RBAC denial on `/admin/*`<br>- Deactivated account rejection |
| 2 | `tests/e2e/dashboard-schedule.spec.ts` | Dashboard & Today Schedule | 9 | Tiers 1, 2, 4 | - NPT time-based personalized greeting<br>- Attendance barometer summary gauge<br>- Upcoming timetable list & active assignments<br>- Pinned notices board with pin icons<br>- 7-day date strip selector navigation<br>- Day switching updating class cards<br>- UPCOMING, ONGOING, COMPLETED status tags<br>- Live/ongoing class visual highlight |
| 3 | `tests/e2e/attendance-barometer.spec.ts` | TU 80% Barometer & What-If Simulator | 6 | Tiers 1, 2, 3, 4 | - Overall attendance percentage & status chip (`SAFE`, `CAUTION`, `DANGER`)<br>- Safety buffer calculation (classes missable/needed)<br>- Subject breakdown table with counts & %<br>- What-If slider dynamic projection updates<br>- Zero & extreme value boundary handling<br>- Report Incorrect Attendance dispute modal submission |
| 4 | `tests/e2e/homework-submissions.spec.ts` | Assignments Workspace & Uploads | 6 | Tiers 1, 2, 3, 4 | - 5-tab workspace (Active, Due Soon, Overdue, Submitted, Graded)<br>- Pending assignments listing with due dates<br>- Temporal status badges<br>- Draft text answer saving<br>- UploadThing mock PDF submission flow<br>- Graded tab scores, grade badge, instructor remarks |
| 5 | `tests/e2e/subject-isolation.spec.ts` | Subjects & Strict Tenant Isolation | 6 | Tiers 1, 2, 4 | - Enrolled subjects grid at `/subjects`<br>- 4-tab details (Syllabus, Sessions, Assignments, Resources)<br>- Tab switching rendering sessions & resources<br>- Un-enrolled subject 404/403 isolation<br>- Non-existent subject 404 handling<br>- Direct URL access rejection for foreign student submissions |
| 6 | `tests/e2e/responsive-navigation.spec.ts` | Multi-Viewport Navigation & Layout | 10 | Tiers 1, 2, 4 | - Desktop (1440px, 1024px, 768px): Sticky sidebar (`w-64`), hidden mobile navbar, 0 horizontal overflow<br>- Mobile (375px, 414px): Hidden sidebar, sticky topbar + link pill bar<br>- Mobile Sheet hamburger drawer full navigation<br>- Admin desktop sidebar routing (`/admin/accounts`, `/admin/teachers`, etc.)<br>- Admin quick action links isolation<br>- Admin mobile hamburger drawer navigation |
| 7 | `tests/e2e/typography-contrast.spec.ts` | High-Contrast Typography & Themes | 15 | Tiers 1, 2 | - Sub-12px font audit on 7 student pages (Dashboard, Today, Routine, Attendance, Homework, Notices, Events)<br>- Sub-12px font audit on 5 admin pages (Dashboard, Accounts, Students, Teachers, Subjects)<br>- Light/Dark theme toggle & background token verification<br>- Status chip & badge legible contrast in dual themes<br>- Heading & muted-foreground contrast verification |
| **Total** | **7 Spec Files** | **Full System & UI/UX Verification** | **65 Tests** | **Tiers 1–4** | **100% Typechecked & Discovered** |

---

## 5. Verification Commands & Execution Readiness

### 5.1 Verification Checklist
- [x] `npx tsc --noEmit` -> Passed with 0 errors
- [x] `npx playwright test --list` -> Passed with 65 tests discovered
- [x] `npm run db:seed` -> Passed and populated realistic 4-zone attendance, users, routine, sessions, assignments, exams, and notices
- [x] `playwright.config.ts` webServer & globalSetup verified

### 5.2 Test Runner Command Matrix
```bash
# Run full E2E test suite
npx playwright test

# Run responsive layout and typography contrast verification
npx playwright test tests/e2e/responsive-navigation.spec.ts tests/e2e/typography-contrast.spec.ts

# Run auth lifecycle and RBAC security verification
npx playwright test tests/e2e/auth-lifecycle.spec.ts

# Run academic domain suites
npx playwright test tests/e2e/attendance-barometer.spec.ts tests/e2e/homework-submissions.spec.ts tests/e2e/subject-isolation.spec.ts tests/e2e/dashboard-schedule.spec.ts
```

---

## 6. Risk Assessment & Recommendations

1. **Port Allocation**: `playwright.config.ts` uses port `3001` (`npm run dev -- -p 3001`). If a local server is already running on `3000`, Playwright cleanly targets `3001` or respects `PLAYWRIGHT_TEST_BASE_URL`.
2. **Database State Isolation**: `tests/fixtures/global-setup.ts` automatically backs up `local.test-seed.db`. In individual test suites that perform write mutations (like account creation or password change), tests use unique dynamic timestamps (`Date.now()`) to prevent state collision.
3. **Execution Ready**: The testing track is in an ideal, fully certified state for test runner execution.
