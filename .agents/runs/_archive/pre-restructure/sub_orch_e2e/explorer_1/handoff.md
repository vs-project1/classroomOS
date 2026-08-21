# Comprehensive E2E Exploration & Readiness Report: Classroom OS

**Explorer**: Explorer 1 (E2E Testing Track)  
**Date**: 2026-08-15  
**Working Directory**: `D:\CLASSROOM OS\.agents\sub_orch_e2e\explorer_1`  
**Target Codebase**: `D:\CLASSROOM OS`  

---

## 1. Observation

Direct observations from examining project configuration files, directory structures, source code, database scripts, and environment definitions:

### A. Task 1: Project Configuration & Tooling Layout
- **`package.json`** (`D:\CLASSROOM OS\package.json`, lines 1-50):
  - **Framework & Core**: `"next": "16.2.10"`, `"react": "19.2.4"`, `"react-dom": "19.2.4"`.
  - **Database & ORM**: `"@libsql/client": "^0.17.4"`, `"drizzle-orm": "^0.45.2"`, `"drizzle-kit": "^0.31.10"`.
  - **UI & Styling**: `"tailwindcss": "^4"`, `"@tailwindcss/postcss": "^4"`, `"@base-ui/react": "^1.6.0"`, `"shadcn": "^4.13.0"`, `"lucide-react": "^1.24.0"`, `"tw-animate-css": "^1.4.0"`, `"class-variance-authority": "^0.7.1"`, `"clsx": "^2.1.1"`, `"tailwind-merge": "^3.6.0"`.
  - **File Upload**: `"uploadthing": "^7.7.4"`, `"@uploadthing/react": "^7.3.3"`.
  - **Validation & Crypto Utilities**: `"zod": "^4.4.3"`, `"google-libphonenumber": "^3.2.44"`, `"server-only": "^0.0.1"`, `"dotenv": "^17.4.2"`, `"tsx": "^4.23.1"`, `"typescript": "^5"`.
  - **Scripts**:
    - `"dev": "next dev"`
    - `"build": "next build"`
    - `"start": "next start"`
    - `"lint": "eslint"`
    - `"db:generate": "drizzle-kit generate"`
    - `"db:migrate": "drizzle-kit migrate"`
    - `"db:studio": "drizzle-kit studio"`
    - `"db:verify": "tsx --env-file=.env.local scripts/verify-db.ts"`
    - `"dev:watch": "start /b next dev & start /b uv run graphify extract . --code-only"`
  - **Playwright Test Status**: `@playwright/test` is **NOT currently installed** in `dependencies` or `devDependencies`. No `"test"` or `"test:e2e"` script exists in `package.json`.
- **`tsconfig.json`** (`D:\CLASSROOM OS\tsconfig.json`, lines 1-35):
  - Target: `"ES2017"`, module: `"esnext"`, moduleResolution: `"bundler"`.
  - Strict mode enabled (`"strict": true`), no emit (`"noEmit": true`).
  - Path aliases configured: `"@/*": ["./src/*"]`.
  - Includes: `next-env.d.ts`, `**/*.ts`, `**/*.tsx`, `.next/types/**/*.ts`, `.next/dev/types/**/*.ts`, `**/*.mts`.
- **`next.config.ts`** (`D:\CLASSROOM OS\next.config.ts`, lines 1-10):
  - Exports `nextConfig: NextConfig = { typescript: { ignoreBuildErrors: true } }`.
- **`drizzle.config.ts`** (`D:\CLASSROOM OS\drizzle.config.ts`, lines 1-22):
  - Loads `.env.local` via `config({ path: ".env.local" })`.
  - Dialect: `"turso"`, schema: `"./src/db/schema.ts"`, out: `"./drizzle"`.
- **Directory Layout**:
  - `src/` contains `app/`, `components/`, `db/`, `lib/`, `env.ts`.
  - `scripts/` contains `migrate-db.ts`, `verify-db.ts`, `verify-session-transaction.ts`.
  - `drizzle/` contains SQL migration files (0000 to 0004).
  - `tests/` directory **does not exist yet** and needs to be created.

---

### B. Task 2: Routes, Schema, Seeder, Middleware & Auth Inspection
- **Database Schema (`src/db/schema.ts`)**:
  - Contains 13 base tables: `teachers`, `subjects`, `students`, `weeklyRoutine`, `classSessions`, `lectureLogs`, `attendance`, `homework`, `notices`, `events`, `courseUnits`, `courseChapters`, `courseMaterials`.
  - Strict database integrity implemented: SQLite `CHECK` constraints on status enums and temporal bounds (`chk_weekly_routine_day`, `chk_weekly_routine_time`, `chk_attendance_status`, `chk_homework_status`, `chk_events_time`), composite `UNIQUE` on `(classSessionId, studentId)`, and explicit `CASCADE`/`SET NULL` foreign keys.
  - Milestone 1 (in progress in parallel track) extends this with 10 tables: `users`, `student_profiles`, `enrollments`, `assignment_submissions`, `exams`, `exam_results`, `resources`, `study_tasks`, `notifications`, and `attendance_correction_requests`.
- **Database Seeder (`src/db/seed.ts`)**:
  - Currently **does not exist**. Milestone 1 is tasked with creating `src/db/seed.ts` to populate mock Users, Students, Teachers, CRs, Subjects, Routine, 45 historical Sessions, Attendance, and Assignments.
- **Middleware (`src/middleware.ts`)**:
  - Currently **does not exist**. Milestone 2 will implement `src/middleware.ts` to handle session token verification, role-based route access control (`ADMIN`, `TEACHER`, `CR`, `STUDENT`), and quarantine redirection for users with `mustChangePassword === true` to `/change-password`.
- **Authentication Service (`src/lib/auth.ts`)**:
  - Currently contains prototype mock helpers (`getCurrentRole`, `getPermissions`, `resolveCurrentStudent`) using `APP_ROLE` cookie and `DEMO_STUDENT_ID`.
  - Milestone 2 will replace this with `src/lib/auth/` (scrypt password hashing via `node:crypto`, session creation, `auth_session` HTTP-only cookies, RBAC checks `requireAuth()`, `getCurrentUser()`).
- **Existing App Routes in `src/app/`**:
  - **Root Layout** (`src/app/layout.tsx`): Root HTML with `suppressHydrationWarning`, Google fonts (`Inter`, `Fira Sans`, `Fira Code`).
  - **Student Layout & Views** (`src/app/(student)/`):
    - `layout.tsx`: Student layout with `StudentSidebar`, `StudentTopbar`, `MobileBottomNav`.
    - `/` (`page.tsx`): Student dashboard with NPT greeting, timetable with "NOW" badge, active assignments, notices, attendance barometer gauge.
    - `/today` (`today/page.tsx`): 7-day date strip, routine classes categorized by server time (`upcoming`, `ongoing`, `completed`), session logging action.
    - `/attendance` (`attendance/page.tsx`): TU 80% gauge, safety buffer calculation, subject breakdown matrix table.
    - `/homework` (`homework/page.tsx`): Tabbed list (Active, Completed, Archived), assignment cards.
    - `/routine` (`routine/page.tsx`), `/sessions` (`sessions/page.tsx`), `/sessions/[id]`, `/sessions/new`: Routine view and lecture log logging.
    - `/notices`, `/events`, `/lecture-logs`: Student portal views.
  - **Admin Layout & Views** (`src/app/(admin)/admin/`):
    - `layout.tsx`: Admin console layout with `AppSidebar` and `ThemeToggle`.
    - `/admin` (`page.tsx`): Admin Command Center overview.
    - `/admin/students`, `/admin/teachers`, `/admin/subjects`, `/admin/homework`, `/admin/notices`, `/admin/events`: CRUD management views.
  - **API Routes** (`src/app/api/`):
    - `/api/uploadthing` (`uploadthing/route.ts` & `core.ts`): Course material file upload handler.
  - **Target Routes to be Added by Milestones 2 & 3 (to be tested by E2E)**:
    - `/login` (`(auth)/login/page.tsx`): Public login page.
    - `/change-password` (`(auth)/change-password/page.tsx`): Quarantine forced password change.
    - `/admin/accounts` (`(admin)/admin/accounts/page.tsx`): User account provisioning & temporary password display.
    - `/subjects` & `/subjects/[id]` (`(student)/subjects/`): Enrolled subjects grid & detail page with 4 tabs (Syllabus, Sessions, Assignments, Resources).

---

### C. Task 3: Application Startup, Port Bindings & Environment Variables
- **Application Startup**:
  - Development mode: `npm run dev` executes `next dev`. Next.js 16 compiles pages on-demand and serves over HTTP.
  - Production mode: `npm run build && npm start` executes `next build` followed by `next start`.
  - For E2E testing: Playwright `webServer` can be configured to run `npm run dev` with `url: "http://localhost:3000"` (or `http://127.0.0.1:3000`) with `reuseExistingServer: !process.env.CI`.
- **Port Bindings**:
  - Default port: `3000`.
  - Next.js binds to `http://localhost:3000`.
- **Environment Variables**:
  - `.env.local` (local environment):
    - `DATABASE_URL=libsql://classroom-os-classroomos.aws-ap-south-1.turso.io`
    - `DATABASE_AUTH_TOKEN=...`
  - `src/env.ts` validates:
    - `DATABASE_URL`: `z.string().min(1)` (required)
    - `DATABASE_AUTH_TOKEN`: `z.string().optional()`
    - `NODE_ENV`: `z.enum(["development", "production", "test"]).default("development")`
  - Additional required variables for features:
    - `UPLOADTHING_TOKEN` / `UPLOADTHING_SECRET`: For UploadThing file uploads.
    - For testing, deterministic credentials and fallback tokens should be supported in fixtures.

---

## 2. Logic Chain

1. **Test Runner & Package Dependencies**:
   - *Observation*: `package.json` does not contain `@playwright/test`.
   - *Deduction*: Milestone `M_E2E_2` must install `@playwright/test` as a devDependency and configure `playwright.config.ts`.
   - *Actionable Step*: Install `@playwright/test`, download browser binaries via `npx playwright install chromium`, and add `"test:e2e": "playwright test"` to `package.json`.

2. **Opaque-Box Testing Strategy (Requirement-Driven)**:
   - *Observation*: Per `ORIGINAL_REQUEST.md` and `SCOPE.md`, tests must verify user workflows from the browser perspective without depending on internal component props or unexported state.
   - *Deduction*: Tests should execute against the live web server, interacting with standard HTML elements (`input[type="email"]`, `input[type="password"]`, `button[type="submit"]`, links, tabs, tables).
   - *Deterministic Fixtures*: To make tests fast and resilient, we must supply `tests/fixtures/auth.fixture.ts` that can either log in via UI or inject authenticated session cookies directly into the browser context.

3. **Spec Suite Division per Feature Inventory**:
   - Based on `SCOPE.md`, the 5 target spec suites cover all functional tiers:
     - **`tests/e2e/auth-lifecycle.spec.ts`**: Admin account creation (`/admin/accounts`), temporary password generation, first-time login (`/login`), quarantine redirection to `/change-password`, password change submission, redirect to `/`, and RBAC role restrictions.
     - **`tests/e2e/dashboard-schedule.spec.ts`**: Student Dashboard greeting (NPT time-aware), Today's classes with "NOW" badge, schedule timeline (`/today`), date selector, and quick link navigation.
     - **`tests/e2e/attendance-barometer.spec.ts`**: Attendance page (`/attendance`), TU 80% barometer calculation, safety buffer chips (SAFE/CAUTION/DANGER), What-If projection calculator, and "Report Incorrect Attendance" modal.
     - **`tests/e2e/homework-submissions.spec.ts`**: Homework page (`/homework`), tabs (Active, Due Soon, Overdue, Submitted, Graded), assignment detail dialog, draft saving, and file submission flow.
     - **`tests/e2e/subject-isolation.spec.ts`**: Enrolled subjects grid (`/subjects`), detail view (`/subjects/[id]`) with 4 tabs (Syllabus, Sessions, Assignments, Resources), and security isolation (asserting 404/403 when accessing un-enrolled subject IDs or other students' submissions).

4. **Timezone & Temporal Determinism**:
   - *Observation*: Classroom OS uses `Asia/Kathmandu` (NPT, UTC+5:45) across all date formatting, routine matching, and class "NOW" badges.
   - *Deduction*: Playwright browser context must be configured with `timezoneId: 'Asia/Kathmandu'` in `playwright.config.ts` so that client-rendered times match server NPT calculations.

---

## 3. Caveats

1. **Parallel Milestone Development**:
   - Milestones M1 (extended schema & `seed.ts`), M2 (auth service, `/login`, `/change-password`, `/admin/accounts`), and M3 (student subjects, What-If calculator, assignment submissions) are being constructed in parallel.
   - E2E test specs written in this track define the authoritative acceptance contracts. When running against intermediate builds, specs for features not yet implemented will fail until those milestones land.
2. **UploadThing in Headless E2E**:
   - Live UploadThing uploads require network requests to UploadThing servers with a valid API token.
   - E2E tests should support intercepting / mocking the UploadThing endpoint (`/api/uploadthing`) or using file fixture buffers (`page.setInputFiles`) to ensure deterministic execution without external network dependency.
3. **Database Reset Between Test Runs**:
   - Tests that mutate user passwords or create accounts should either use unique timestamped test emails (e.g. `teststudent_${Date.now()}@classroom.edu.np`) or rely on the `src/db/seed.ts` script for clean state restoration.

---

## 4. Conclusion & Recommendations

The codebase is well-structured and ready for the E2E Testing Track setup. The recommended infrastructure plan consists of:

1. **Dependencies & Scripts**:
   - Add `@playwright/test` to `devDependencies`.
   - Add `"test:e2e": "playwright test"` and `"test:e2e:ui": "playwright test --ui"` to `package.json`.
2. **Playwright Configuration (`playwright.config.ts`)**:
   - Set `testDir: "./tests/e2e"`.
   - Configure `use: { baseURL: "http://localhost:3000", timezoneId: "Asia/Kathmandu", trace: "on-first-retry" }`.
   - Set up `webServer` to launch `npm run dev` at `http://localhost:3000` with adequate timeout.
   - Target desktop Chromium project primarily.
3. **Fixtures & Utilities (`tests/fixtures/`)**:
   - `tests/fixtures/auth.fixture.ts`: Custom Playwright fixtures providing pre-authenticated pages for `adminPage`, `studentPage`, `firstTimeStudentPage`, `unenrolledStudentPage`.
   - `tests/fixtures/seed-data.ts`: Shared constants for predictable test users, subject codes, and routine times.
4. **Test Specs (`tests/e2e/`)**:
   - `auth-lifecycle.spec.ts`
   - `dashboard-schedule.spec.ts`
   - `attendance-barometer.spec.ts`
   - `homework-submissions.spec.ts`
   - `subject-isolation.spec.ts`

---

## 5. Verification Method

To independently verify the observations made in this report:

1. **Verify Dependencies & Configs**:
   - Run `cat package.json` to verify Next.js 16.2.10, React 19.2.4, and check absence of `@playwright/test`.
   - Inspect `drizzle.config.ts` and `tsconfig.json`.
2. **Verify Database Schema & Scripts**:
   - Inspect `src/db/schema.ts` lines 1-327.
   - Run `npm run db:verify` to execute constraint validation (`scripts/verify-db.ts`).
   - Run `npx tsx --env-file=.env.local scripts/verify-session-transaction.ts` to verify transaction rollbacks.
3. **Verify Routes**:
   - Inspect `src/app/(student)/page.tsx`, `src/app/(student)/today/page.tsx`, `src/app/(student)/attendance/page.tsx`, `src/app/(student)/homework/page.tsx`.
   - Confirm missing routes (`/login`, `/change-password`, `/admin/accounts`, `/subjects/[id]`) in `src/app/`.
4. **Type Check**:
   - Run `npx tsc --noEmit` -> Confirms 0 TypeScript compilation errors.
