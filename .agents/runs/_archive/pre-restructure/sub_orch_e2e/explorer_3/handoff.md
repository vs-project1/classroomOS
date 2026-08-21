# E2E Testing Framework & Fixture Architecture Specification

**Author**: Explorer 3 (Playwright Configuration & Test Fixture Architect)  
**Date**: 2026-08-15  
**Target Milestone**: E2E Testing Track (`M_E2E_1` / `M_E2E_2`)  
**Working Directory**: `D:\CLASSROOM OS\.agents\sub_orch_e2e\explorer_3`  

---

## 1. Observation

Direct examination of the Classroom OS codebase revealed the following structural facts and constraints:

1. **Runtime & Framework Stack (`package.json:16-48`)**:
   - Next.js `16.2.10` (App Router), React `19.2.4`, Drizzle ORM `^0.45.2`, `@libsql/client` `^0.17.4`, `@uploadthing/react` `^7.3.3`, `uploadthing` `^7.7.4`, `zod` `^4.4.3`, `tailwindcss` `^4`.
   - Node.js runtime has built-in `node:crypto` (`scryptSync`, `randomBytes`, `timingSafeEqual`).
   - `@playwright/test` is currently **not installed** in `devDependencies` and needs to be added (`@playwright/test: ^1.50.0`).
   - Existing dev server script is `npm run dev` (`next dev`) running on `http://localhost:3000`.

2. **Authentication & Session Architecture (`src/lib/auth.ts`, `PROJECT.md:66-85`, `ORIGINAL_REQUEST.md:18-24`)**:
   - Zero public signup model; institutional admin-provisioned accounts.
   - Authentication is session-based via secure HTTP-only cookies (`auth_session`).
   - Session store is backed by SQLite `sessions` table (`id` [32-byte hex token], `userId`, `expiresAt`).
   - Roles: `ADMIN`, `TEACHER`, `CR`, `STUDENT`.
   - Mandatory quarantine flag: `mustChangePassword` (redirects all uncompleted users to `/change-password`).
   - Deterministic test user persona specification (`SCOPE.md:49-53`):
     - Admin: `admin@classroom.edu.np`
     - Active Student: `student@classroom.edu.np`
     - First-time Student: `newstudent@classroom.edu.np` (`mustChangePassword: true`)
     - Unauthorized/Unenrolled Student: `unauthorized@classroom.edu.np`

3. **Database Architecture (`src/db/schema.ts`, `src/db/client.ts`, `src/env.ts`)**:
   - Turso/libSQL SQLite database (`file:local.db` / `file:test.db`).
   - Single-writer SQLite concurrency requires serial or single-worker test execution during database-mutating E2E runs to prevent database locks.
   - Strict database-level integrity: composite unique keys, foreign keys with `onDelete: "cascade"`, and SQLite `CHECK` constraints.

4. **UploadThing Integration (`src/app/api/uploadthing/core.ts`, `src/utils/uploadthing.ts`)**:
   - `core.ts` defines `courseMaterial` (PDF 16MB, Image 4MB) and `assignmentSubmission` (PDF, ZIP, DOCX 16MB) file routers.
   - In E2E automated test runs, external cloud network calls to UploadThing servers will fail or produce latency without live API keys; network mocking via Playwright route interception (`page.route()`) is mandatory.

5. **UI & Route Hierarchy (`src/app/`, `src/components/`)**:
   - Student routes: `/` (Dashboard), `/today` (Schedule), `/subjects` & `/subjects/[id]`, `/attendance`, `/homework`, `/routine`, `/sessions`.
   - Admin routes: `/admin`, `/admin/accounts`, `/admin/students`, `/admin/teachers`, `/admin/subjects`, `/admin/homework`, `/admin/notices`, `/admin/events`.
   - Auth routes: `/login`, `/change-password`.
   - Client layout components: `student-sidebar.tsx`, `student-topbar.tsx`, `app-sidebar.tsx`, `attendance-gauge.tsx`, `status-chip.tsx`.

---

## 2. Logic Chain & Architecture Design

### 2.1 Playwright Global Configuration (`playwright.config.ts`)

```
┌────────────────────────────────────────────────────────────────────────┐
│                        playwright.config.ts                           │
│                                                                        │
│  ├── webServer: `npm run dev` (port 3000, timeout 120s, reuse: !CI)    │
│  ├── testDir: `./tests/e2e`                                            │
│  ├── outputDir: `./test-results/`                                      │
│  ├── workers: 1 (Ensures deterministic SQLite single-writer isolation)  │
│  ├── use:                                                              │
│  │   ├── baseURL: `http://localhost:3000`                              │
│  │   ├── timezoneId: `Asia/Kathmandu` (Strict NPT alignment)           │
│  │   ├── trace: `retain-on-failure`                                    │
│  │   ├── screenshot: `only-on-failure`                                 │
│  │   └── video: `retain-on-failure`                                    │
│  ├── globalSetup: `./tests/fixtures/global-setup.ts`                   │
│  └── projects:                                                         │
│      ├── `Desktop Chrome` (1280x720)                                   │
│      └── `Mobile Chrome` (Pixel 5 - Student bottom-nav & sheets)       │
└────────────────────────────────────────────────────────────────────────┘
```

#### Detailed Configuration Code: `playwright.config.ts`

```typescript
import { defineConfig, devices } from "@playwright/test";
import path from "node:path";

/**
 * Playwright E2E Test Suite Configuration for Classroom OS
 * Adheres strictly to Classroom OS Architecture & Next.js 16 / React 19 standards.
 */
export default defineConfig({
  testDir: "./tests/e2e",
  testMatch: "**/*.spec.ts",
  outputDir: "./test-results",
  snapshotDir: "./tests/__snapshots__",

  /* Maximum time one test can run for */
  timeout: 45 * 1000,
  expect: {
    timeout: 10 * 1000,
  },

  /* Run tests sequentially by default to ensure SQLite database isolation */
  fullyParallel: false,
  workers: process.env.CI ? 1 : 1,

  /* Retry on CI only */
  retries: process.env.CI ? 2 : 0,

  /* Reporters */
  reporter: [
    ["list"],
    ["html", { outputFolder: "playwright-report", open: "never" }],
    ["json", { outputFile: "test-results/results.json" }],
  ],

  /* Global Setup for Database Reset & Migration */
  globalSetup: path.resolve(__dirname, "./tests/fixtures/global-setup.ts"),

  /* Shared settings for all the projects below */
  use: {
    baseURL: process.env.PLAYWRIGHT_TEST_BASE_URL || "http://localhost:3000",
    
    /* Strict NPT timezone matching Classroom OS rules */
    timezoneId: "Asia/Kathmandu",
    locale: "en-US",

    /* Collect trace and artifacts on failure */
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "retain-on-failure",

    /* Action and navigation timeouts */
    actionTimeout: 15 * 1000,
    navigationTimeout: 30 * 1000,
  },

  /* Configure projects for major browsers */
  projects: [
    {
      name: "Desktop Chrome",
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 1280, height: 720 },
      },
    },
    {
      name: "Mobile Chrome",
      use: {
        ...devices["Pixel 5"],
      },
    },
  ],

  /* Run local dev server before starting the tests */
  webServer: {
    command: "npm run dev",
    url: "http://localhost:3000",
    timeout: 120 * 1000,
    reuseExistingServer: !process.env.CI,
    env: {
      NODE_ENV: "test",
      DATABASE_URL: process.env.DATABASE_URL || "file:local.db",
      APP_ROLE: "ADMIN",
    },
  },
});
```

---

### 2.2 Test Fixtures Architecture (`tests/fixtures/`)

To support high-velocity, deterministic testing across Tiers 1-4, the test suite utilizes a 4-pillar fixture system:

```
tests/fixtures/
├── global-setup.ts         # Global database migration, initial seeding & snapshotting
├── seed-data.ts            # Canonical deterministic mock records & persona IDs
├── db-fixture.ts           # DB reset, transaction helpers & direct state verification
├── auth.fixture.ts         # Fast session token injection (Admin, Student, NewStudent, Unauthorized)
├── upload-mock.ts          # UploadThing network route interception & synthetic file injection
└── pom/                    # Page Object Models
    ├── base.page.ts        # Common shell, navigation, alerts & wait helpers
    ├── login.page.ts       # Login form POM
    ├── change-password.page.ts # Quarantine password change POM
    ├── admin-accounts.page.ts  # Admin user management POM
    ├── dashboard.page.ts   # Student dashboard & live class POM
    ├── today.page.ts       # 7-day schedule timeline POM
    ├── attendance.page.ts  # TU 80% Barometer, What-If calculator & correction POM
    ├── homework.page.ts    # Assignment tabs & submission modal POM
    └── subjects.page.ts    # Enrolled subjects & 4-tab details POM
```

---

### 2.3 Canonical Seed Data & User Personas (`tests/fixtures/seed-data.ts`)

```typescript
export const TEST_PERSONAS = {
  admin: {
    id: "usr_admin_001",
    email: "admin@classroom.edu.np",
    password: "AdminPassword123!",
    name: "System Administrator",
    role: "ADMIN" as const,
    mustChangePassword: false,
    isActive: true,
  },
  teacher: {
    id: "usr_teacher_001",
    teacherId: "tch_ram_001",
    email: "teacher@classroom.edu.np",
    password: "TeacherPassword123!",
    name: "Prof. Ram Sharma",
    role: "TEACHER" as const,
    mustChangePassword: false,
    isActive: true,
  },
  cr: {
    id: "usr_cr_001",
    studentProfileId: "sp_cr_001",
    email: "cr@classroom.edu.np",
    password: "CrPassword123!",
    name: "Aashish CR",
    rollNumber: "BCA-2024-001",
    role: "CR" as const,
    faculty: "BCA",
    semester: "4th",
    mustChangePassword: false,
    isActive: true,
  },
  activeStudent: {
    id: "usr_student_001",
    studentProfileId: "sp_student_001",
    email: "student@classroom.edu.np",
    password: "StudentPassword123!",
    name: "Bikash Thapa",
    rollNumber: "BCA-2024-002",
    role: "STUDENT" as const,
    faculty: "BCA",
    semester: "4th",
    mustChangePassword: false,
    isActive: true,
  },
  newStudentQuarantined: {
    id: "usr_newstudent_001",
    studentProfileId: "sp_newstudent_001",
    email: "newstudent@classroom.edu.np",
    password: "TempPassword123!",
    name: "Roshani Shrestha",
    rollNumber: "BCA-2024-015",
    role: "STUDENT" as const,
    faculty: "BCA",
    semester: "4th",
    mustChangePassword: true, // Forces quarantine
    isActive: true,
  },
  unauthorizedStudent: {
    id: "usr_unauthorized_001",
    studentProfileId: "sp_unauthorized_001",
    email: "unauthorized@classroom.edu.np",
    password: "StudentPassword123!",
    name: "Kiran Adhikari",
    rollNumber: "BCA-2024-099",
    role: "STUDENT" as const,
    faculty: "BCA",
    semester: "4th",
    mustChangePassword: false,
    isActive: true,
  },
};

export const TEST_SUBJECTS = {
  dsa: {
    id: "subj_dsa_001",
    code: "CACS201",
    name: "Data Structures and Algorithms",
    teacherId: "tch_ram_001",
  },
  dbms: {
    id: "subj_dbms_001",
    code: "CACS202",
    name: "Database Management Systems",
    teacherId: "tch_ram_001",
  },
  isolatedSubject: {
    id: "subj_restricted_001",
    code: "CACS299",
    name: "Advanced Cryptography & Security",
    teacherId: "tch_ram_001",
  },
};

export const TEST_SESSIONS = {
  activeSession: {
    id: "sess_dsa_today",
    subjectId: "subj_dsa_001",
    startTime: "07:00",
    endTime: "08:30",
  },
};
```

---

### 2.4 Auth Fixtures & Session Injection (`tests/fixtures/auth.fixture.ts`)

Instead of requiring every test to undergo a slow UI login form submission, `auth.fixture.ts` generates a cryptographically valid session token, inserts it directly into the SQLite `sessions` table, and adds the `auth_session` cookie to the browser context before navigation.

```typescript
import { test as base, type Page, type BrowserContext } from "@playwright/test";
import crypto from "node:crypto";
import { db } from "@/db";
import { sessions, users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { TEST_PERSONAS } from "./seed-data";

export type AuthPersonas = {
  adminPage: Page;
  studentPage: Page;
  newStudentPage: Page;
  unauthorizedPage: Page;
  guestPage: Page;
};

/**
 * Creates an active database session and injects HTTP-only cookie into browser context.
 */
export async function injectAuthSession(
  context: BrowserContext,
  userId: string,
  baseURL: string = "http://localhost:3000"
): Promise<string> {
  const token = crypto.randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days

  // Insert session into SQLite
  await db.insert(sessions).values({
    id: token,
    userId,
    expiresAt,
  }).onConflictDoUpdate({
    target: sessions.id,
    set: { expiresAt },
  });

  const url = new URL(baseURL);

  // Set HTTP-only cookie
  await context.addCookies([
    {
      name: "auth_session",
      value: token,
      domain: url.hostname,
      path: "/",
      httpOnly: true,
      secure: false,
      sameSite: "Lax",
    },
  ]);

  return token;
}

export const test = base.extend<AuthPersonas>({
  adminPage: async ({ browser, baseURL }, use) => {
    const context = await browser.newContext();
    await injectAuthSession(context, TEST_PERSONAS.admin.id, baseURL);
    const page = await context.newPage();
    await use(page);
    await context.close();
  },

  studentPage: async ({ browser, baseURL }, use) => {
    const context = await browser.newContext();
    await injectAuthSession(context, TEST_PERSONAS.activeStudent.id, baseURL);
    const page = await context.newPage();
    await use(page);
    await context.close();
  },

  newStudentPage: async ({ browser, baseURL }, use) => {
    const context = await browser.newContext();
    await injectAuthSession(context, TEST_PERSONAS.newStudentQuarantined.id, baseURL);
    const page = await context.newPage();
    await use(page);
    await context.close();
  },

  unauthorizedPage: async ({ browser, baseURL }, use) => {
    const context = await browser.newContext();
    await injectAuthSession(context, TEST_PERSONAS.unauthorizedStudent.id, baseURL);
    const page = await context.newPage();
    await use(page);
    await context.close();
  },

  guestPage: async ({ page }, use) => {
    await use(page);
  },
});

export { expect } from "@playwright/test";
```

---

### 2.5 Database Reset & Seeding Fixture (`tests/fixtures/global-setup.ts` & `db-fixture.ts`)

#### Global Setup: `tests/fixtures/global-setup.ts`

```typescript
import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

export default async function globalSetup() {
  console.log("🛠️  [Global Setup] Initializing test database...");

  const dbPath = path.resolve(process.cwd(), "local.db");
  const seedBackupPath = path.resolve(process.cwd(), "local.test-seed.db");

  // Ensure migrations are run
  try {
    execSync("npm run db:migrate", { stdio: "inherit" });
  } catch (err) {
    console.warn("⚠️ Migration command exited with warning, verifying DB tables...");
  }

  // Run comprehensive seeder
  try {
    execSync("npx tsx scripts/seed-e2e.ts", { stdio: "inherit" });
  } catch (err) {
    console.error("❌ Failed to seed E2E database:", err);
    throw err;
  }

  // Create clean snapshot backup for instant file-level restoration if needed
  if (fs.existsSync(dbPath)) {
    fs.copyFileSync(dbPath, seedBackupPath);
    console.log("💾 [Global Setup] Created clean database snapshot at local.test-seed.db");
  }

  console.log("✅ [Global Setup] Test database ready.");
}
```

#### DB Helper: `tests/fixtures/db-fixture.ts`

```typescript
import { db } from "@/db";
import { users, sessions, assignmentSubmissions, attendanceCorrectionRequests } from "@/db/schema";
import { eq } from "drizzle-orm";
import fs from "node:fs";
import path from "node:path";

export class DatabaseTestHelper {
  /**
   * Resets mutated tables back to pristine state or restores DB file.
   */
  static async restoreSnapshot() {
    const dbPath = path.resolve(process.cwd(), "local.db");
    const seedBackupPath = path.resolve(process.cwd(), "local.test-seed.db");

    if (fs.existsSync(seedBackupPath)) {
      fs.copyFileSync(seedBackupPath, dbPath);
    }
  }

  /**
   * Directly queries user record for verification in auth lifecycle tests.
   */
  static async getUser(email: string) {
    return await db.query.users.findFirst({
      where: eq(users.email, email),
    });
  }

  /**
   * Directly queries assignment submission record.
   */
  static async getSubmission(homeworkId: string, studentId: string) {
    return await db.query.assignmentSubmissions.findFirst({
      where: (s, { and, eq }) => and(eq(s.homeworkId, homeworkId), eq(s.studentId, studentId)),
    });
  }

  /**
   * Directly queries attendance correction request.
   */
  static async getCorrectionRequest(attendanceId: string, studentId: string) {
    return await db.query.attendanceCorrectionRequests.findFirst({
      where: (c, { and, eq }) => and(eq(c.attendanceId, attendanceId), eq(c.studentId, studentId)),
    });
  }
}
```

---

### 2.6 Page Object Models (`tests/fixtures/pom/`)

#### 2.6.1 Base POM (`tests/fixtures/pom/base.page.ts`)

```typescript
import { type Page, type Locator, expect } from "@playwright/test";

export class BasePage {
  readonly page: Page;
  readonly toastMessage: Locator;
  readonly studentSidebar: Locator;
  readonly adminSidebar: Locator;

  constructor(page: Page) {
    this.page = page;
    this.toastMessage = page.locator("[role='status'], [role='alert'], .toast, [data-sonner-toast]");
    this.studentSidebar = page.locator("aside:has-text('Student Portal')");
    this.adminSidebar = page.locator("aside:has-text('Admin Console')");
  }

  async navigateTo(path: string) {
    await this.page.goto(path);
    await this.page.waitForLoadState("domcontentloaded");
  }

  async expectToast(message: string | RegExp) {
    await expect(this.toastMessage.filter({ hasText: message })).toBeVisible({ timeout: 5000 });
  }

  async waitForServerAction() {
    await this.page.waitForLoadState("networkidle");
  }
}
```

#### 2.6.2 Login & Password Quarantine POMs (`login.page.ts` & `change-password.page.ts`)

```typescript
// tests/fixtures/pom/login.page.ts
import { type Page, type Locator, expect } from "@playwright/test";
import { BasePage } from "./base.page";

export class LoginPage extends BasePage {
  readonly emailInput: Locator;
  readonly passwordInput: Locator;
  readonly submitButton: Locator;
  readonly errorMessage: Locator;

  constructor(page: Page) {
    super(page);
    this.emailInput = page.locator("input[name='email'], input[type='email'], #email");
    this.passwordInput = page.locator("input[name='password'], input[type='password'], #password");
    this.submitButton = page.locator("button[type='submit']:has-text('Sign In'), button:has-text('Log In')");
    this.errorMessage = page.locator("[data-testid='login-error'], [role='alert'], .text-destructive");
  }

  async goto() {
    await this.navigateTo("/login");
  }

  async login(email: string, pass: string) {
    await this.emailInput.fill(email);
    await this.passwordInput.fill(pass);
    await this.submitButton.click();
  }

  async expectErrorMessage(text: string | RegExp) {
    await expect(this.errorMessage.filter({ hasText: text })).toBeVisible();
  }
}

// tests/fixtures/pom/change-password.page.ts
import { type Page, type Locator, expect } from "@playwright/test";
import { BasePage } from "./base.page";

export class ChangePasswordPage extends BasePage {
  readonly currentPasswordInput: Locator;
  readonly newPasswordInput: Locator;
  readonly confirmPasswordInput: Locator;
  readonly submitButton: Locator;
  readonly validationError: Locator;

  constructor(page: Page) {
    super(page);
    this.currentPasswordInput = page.locator("input[name='currentPassword'], #currentPassword");
    this.newPasswordInput = page.locator("input[name='newPassword'], #newPassword");
    this.confirmPasswordInput = page.locator("input[name='confirmPassword'], #confirmPassword");
    this.submitButton = page.locator("button[type='submit']:has-text('Update Password'), button:has-text('Change Password')");
    this.validationError = page.locator("[role='alert'], .text-destructive, [data-testid='password-error']");
  }

  async changePassword(current: string, next: string, confirm: string) {
    await this.currentPasswordInput.fill(current);
    await this.newPasswordInput.fill(next);
    await this.confirmPasswordInput.fill(confirm);
    await this.submitButton.click();
  }
}
```

#### 2.6.3 Admin Accounts POM (`tests/fixtures/pom/admin-accounts.page.ts`)

```typescript
import { type Page, type Locator, expect } from "@playwright/test";
import { BasePage } from "./base.page";

export class AdminAccountsPage extends BasePage {
  readonly createAccountButton: Locator;
  readonly searchInput: Locator;
  readonly accountsTable: Locator;
  readonly nameInput: Locator;
  readonly emailInput: Locator;
  readonly roleSelect: Locator;
  readonly rollNumberInput: Locator;
  readonly facultySelect: Locator;
  readonly semesterSelect: Locator;
  readonly sectionInput: Locator;
  readonly submitModalButton: Locator;
  readonly tempPasswordDialog: Locator;
  readonly tempPasswordText: Locator;
  readonly copyCredentialsButton: Locator;

  constructor(page: Page) {
    super(page);
    this.createAccountButton = page.locator("button:has-text('Create Account'), button:has-text('Add User')");
    this.searchInput = page.locator("input[placeholder*='Search accounts'], input[type='search']");
    this.accountsTable = page.locator("table");
    
    // Modal form locators
    this.nameInput = page.locator("input[name='name']");
    this.emailInput = page.locator("input[name='email']");
    this.roleSelect = page.locator("select[name='role'], [role='combobox']:has-text('Role')");
    this.rollNumberInput = page.locator("input[name='rollNumber']");
    this.facultySelect = page.locator("select[name='faculty'], input[name='faculty']");
    this.semesterSelect = page.locator("select[name='semester'], input[name='semester']");
    this.sectionInput = page.locator("input[name='section']");
    this.submitModalButton = page.locator("button[type='submit']:has-text('Create'), button:has-text('Save Account')");
    
    // Temp password feedback
    this.tempPasswordDialog = page.locator("[role='dialog']:has-text('Credentials Created'), [data-testid='temp-password-modal']");
    this.tempPasswordText = page.locator("[data-testid='temp-password-value'], code");
    this.copyCredentialsButton = page.locator("button:has-text('Copy Credentials'), button:has-text('Copy Password')");
  }

  async goto() {
    await this.navigateTo("/admin/accounts");
  }

  async createStudentAccount(data: { name: string; email: string; rollNumber: string; faculty: string; semester: string }) {
    await this.createAccountButton.click();
    await this.nameInput.fill(data.name);
    await this.emailInput.fill(data.email);
    if (await this.roleSelect.isVisible()) {
      await this.roleSelect.selectOption("STUDENT");
    }
    await this.rollNumberInput.fill(data.rollNumber);
    await this.facultySelect.fill(data.faculty);
    await this.semesterSelect.fill(data.semester);
    await this.submitModalButton.click();
  }
}
```

#### 2.6.4 Student Dashboard & Schedule POMs (`dashboard.page.ts` & `today.page.ts`)

```typescript
// tests/fixtures/pom/dashboard.page.ts
import { type Page, type Locator, expect } from "@playwright/test";
import { BasePage } from "./base.page";

export class DashboardPage extends BasePage {
  readonly greetingHeader: Locator;
  readonly liveClassBadge: Locator;
  readonly liveClassCard: Locator;
  readonly attendanceSummaryGauge: Locator;
  readonly upcomingClassesList: Locator;
  readonly activeAssignmentsCard: Locator;
  readonly pinnedNoticesList: Locator;

  constructor(page: Page) {
    super(page);
    this.greetingHeader = page.locator("h1, h2").filter({ hasText: /Good (Morning|Afternoon|Evening)/i });
    this.liveClassBadge = page.locator("span:has-text('NOW'), span:has-text('LIVE')");
    this.liveClassCard = page.locator("[data-testid='live-class-card'], div:has-text('Current Class')");
    this.attendanceSummaryGauge = page.locator("svg circle, [data-testid='attendance-gauge']");
    this.upcomingClassesList = page.locator("[data-testid='upcoming-classes'], div:has-text('Today\\'s Timetable')");
    this.activeAssignmentsCard = page.locator("[data-testid='active-assignments-card'], div:has-text('Assignments Due')");
    this.pinnedNoticesList = page.locator("[data-testid='pinned-notices'], div:has-text('Notices')");
  }

  async goto() {
    await this.navigateTo("/");
  }
}

// tests/fixtures/pom/today.page.ts
import { type Page, type Locator, expect } from "@playwright/test";
import { BasePage } from "./base.page";

export class TodaySchedulePage extends BasePage {
  readonly daySelectorButtons: Locator;
  readonly sessionCards: Locator;
  readonly upcomingBadges: Locator;
  readonly ongoingBadges: Locator;
  readonly completedBadges: Locator;

  constructor(page: Page) {
    super(page);
    this.daySelectorButtons = page.locator("[data-testid='day-strip-btn'], button:has-text('Sun'), button:has-text('Mon')");
    this.sessionCards = page.locator("[data-testid='timeline-session-card'], div.border.rounded-xl");
    this.upcomingBadges = page.locator("span:has-text('UPCOMING')");
    this.ongoingBadges = page.locator("span:has-text('ONGOING'), span:has-text('IN PROGRESS')");
    this.completedBadges = page.locator("span:has-text('COMPLETED')");
  }

  async goto() {
    await this.navigateTo("/today");
  }

  async selectDay(dayName: string) {
    await this.page.locator(`button:has-text('${dayName}')`).click();
  }
}
```

#### 2.6.5 Attendance POM (`tests/fixtures/pom/attendance.page.ts`)

```typescript
import { type Page, type Locator, expect } from "@playwright/test";
import { BasePage } from "./base.page";

export class AttendancePage extends BasePage {
  readonly overallPercentageText: Locator;
  readonly safetyBufferText: Locator;
  readonly statusChip: Locator;
  readonly subjectTableRows: Locator;
  readonly whatIfSlider: Locator;
  readonly whatIfProjectedPercentage: Locator;
  readonly reportDisputeButton: Locator;
  readonly disputeReasonInput: Locator;
  readonly disputeStatusSelect: Locator;
  readonly submitDisputeButton: Locator;

  constructor(page: Page) {
    super(page);
    this.overallPercentageText = page.locator("span.tabular-nums, [data-testid='overall-percentage']");
    this.safetyBufferText = page.locator("p:has-text('Safety Buffer'), [data-testid='safety-buffer']");
    this.statusChip = page.locator("span").filter({ hasText: /SAFE|CAUTION|DANGER|At Risk/i });
    this.subjectTableRows = page.locator("table tbody tr");
    
    // What-If Calculator Locators
    this.whatIfSlider = page.locator("input[type='range'], [data-testid='what-if-slider']");
    this.whatIfProjectedPercentage = page.locator("[data-testid='what-if-projected-result']");

    // Correction Modal
    this.reportDisputeButton = page.locator("button:has-text('Report Incorrect Attendance'), button:has-text('Request Correction')");
    this.disputeReasonInput = page.locator("textarea[name='reason'], textarea#reason");
    this.disputeStatusSelect = page.locator("select[name='requestedStatus']");
    this.submitDisputeButton = page.locator("button[type='submit']:has-text('Submit Request')");
  }

  async goto() {
    await this.navigateTo("/attendance");
  }

  async submitCorrectionRequest(reason: string, requestedStatus: "present" | "excused" = "present") {
    await this.reportDisputeButton.click();
    await this.disputeReasonInput.fill(reason);
    if (await this.disputeStatusSelect.isVisible()) {
      await this.disputeStatusSelect.selectOption(requestedStatus);
    }
    await this.submitDisputeButton.click();
  }
}
```

#### 2.6.6 Homework & Assignment Submission POM (`tests/fixtures/pom/homework.page.ts`)

```typescript
import { type Page, type Locator, expect } from "@playwright/test";
import { BasePage } from "./base.page";

export class HomeworkPage extends BasePage {
  readonly tabActive: Locator;
  readonly tabDueSoon: Locator;
  readonly tabOverdue: Locator;
  readonly tabSubmitted: Locator;
  readonly tabGraded: Locator;
  readonly assignmentCards: Locator;
  readonly submitWorkButton: Locator;
  readonly textAnswerInput: Locator;
  readonly saveDraftButton: Locator;
  readonly finalSubmitButton: Locator;
  readonly gradeFeedbackCard: Locator;
  readonly uploadDropzone: Locator;

  constructor(page: Page) {
    super(page);
    this.tabActive = page.locator("button[role='tab']:has-text('Active')");
    this.tabDueSoon = page.locator("button[role='tab']:has-text('Due Soon')");
    this.tabOverdue = page.locator("button[role='tab']:has-text('Overdue')");
    this.tabSubmitted = page.locator("button[role='tab']:has-text('Submitted')");
    this.tabGraded = page.locator("button[role='tab']:has-text('Graded')");
    this.assignmentCards = page.locator("[data-testid='assignment-card'], div.border.rounded-xl");
    
    // Submission modal
    this.submitWorkButton = page.locator("button:has-text('Submit Assignment'), button:has-text('Submit Work')");
    this.textAnswerInput = page.locator("textarea[name='content'], textarea#content");
    this.saveDraftButton = page.locator("button:has-text('Save Draft')");
    this.finalSubmitButton = page.locator("button[type='submit']:has-text('Turn In'), button:has-text('Submit')");
    this.gradeFeedbackCard = page.locator("[data-testid='grade-feedback-card'], div:has-text('Grade & Feedback')");
    this.uploadDropzone = page.locator("[data-ut-element='dropzone'], [data-testid='file-upload-dropzone']");
  }

  async goto() {
    await this.navigateTo("/homework");
  }

  async openAssignment(title: string) {
    await this.page.locator(`text=${title}`).click();
  }

  async submitAssignmentWithText(answerText: string) {
    await this.submitWorkButton.click();
    await this.textAnswerInput.fill(answerText);
    await this.finalSubmitButton.click();
  }
}
```

#### 2.6.7 Subjects & Isolation POM (`tests/fixtures/pom/subjects.page.ts`)

```typescript
import { type Page, type Locator, expect } from "@playwright/test";
import { BasePage } from "./base.page";

export class SubjectsPage extends BasePage {
  readonly subjectCards: Locator;
  readonly tabSyllabus: Locator;
  readonly tabSessions: Locator;
  readonly tabAssignments: Locator;
  readonly tabResources: Locator;
  readonly forbiddenErrorBanner: Locator;
  readonly notFoundHeader: Locator;

  constructor(page: Page) {
    super(page);
    this.subjectCards = page.locator("[data-testid='subject-card'], div.border.rounded-xl:has-text('CACS')");
    this.tabSyllabus = page.locator("button[role='tab']:has-text('Syllabus')");
    this.tabSessions = page.locator("button[role='tab']:has-text('Sessions')");
    this.tabAssignments = page.locator("button[role='tab']:has-text('Assignments')");
    this.tabResources = page.locator("button[role='tab']:has-text('Resources')");
    this.forbiddenErrorBanner = page.locator("h1:has-text('403'), text='Access Denied', text='Not Enrolled'");
    this.notFoundHeader = page.locator("h1:has-text('404'), text='Not Found'");
  }

  async gotoGrid() {
    await this.navigateTo("/subjects");
  }

  async gotoDetail(subjectId: string) {
    await this.navigateTo(`/subjects/${subjectId}`);
  }
}
```

---

### 2.7 UploadThing & File Upload Mocking Strategy (`tests/fixtures/upload-mock.ts`)

In Next.js + UploadThing setups, the client widget communicates with `/api/uploadthing` to initiate presigned upload transactions. In automated testing without external credentials, we intercept these network requests to simulate 100% realistic uploads instantaneously.

```typescript
import { type Page } from "@playwright/test";

export interface MockUploadOptions {
  fileName?: string;
  fileUrl?: string;
  fileSize?: number;
  fileKey?: string;
}

/**
 * Intercepts UploadThing API requests and mocks successful file storage responses.
 */
export async function mockUploadThing(
  page: Page,
  options: MockUploadOptions = {}
) {
  const {
    fileName = "submission-lab1.pdf",
    fileUrl = "https://utfs.io/f/mock-test-file-key-123.pdf",
    fileSize = 1024 * 250, // 250 KB
    fileKey = "mock-test-file-key-123",
  } = options;

  // Intercept the Next.js API route for UploadThing
  await page.route("**/api/uploadthing**", async (route) => {
    const request = route.request();
    const url = request.url();

    // 1. Handle polling / config queries
    if (request.method() === "GET") {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify([
          {
            slug: "assignmentSubmission",
            maxFileSize: "16MB",
            fileTypes: ["pdf", "image", "application/zip"],
          },
        ]),
      });
      return;
    }

    // 2. Handle upload initiation POST request
    if (request.method() === "POST") {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify([
          {
            data: {
              url: fileUrl,
              name: fileName,
              size: fileSize,
              key: fileKey,
            },
            fileUrl: fileUrl,
            name: fileName,
            size: fileSize,
            key: fileKey,
          },
        ]),
      });
      return;
    }

    await route.continue();
  });

  // Intercept any direct calls to utfs.io or uploadthing AWS S3 buckets
  await page.route("**uploadthing**", async (route) => {
    if (route.request().method() === "PUT" || route.request().method() === "POST") {
      await route.fulfill({ status: 200, body: "OK" });
    } else {
      await route.continue();
    }
  });
}

/**
 * Attaches a synthetic PDF file directly to any file input element in the page.
 */
export async function attachSyntheticFile(
  page: Page,
  inputSelector: string = "input[type='file']",
  fileName: string = "assignment.pdf"
) {
  const buffer = Buffer.from("%PDF-1.4 synthetic mock pdf content for Classroom OS E2E");
  await page.setInputFiles(inputSelector, {
    name: fileName,
    mimeType: "application/pdf",
    buffer,
  });
}
```

---

## 3. Caveats & Assumptions

1. **Database Single-Writer Execution**:
   - Turso/libSQL local SQLite operates in single-writer mode. While reads are fast, concurrent writes across multiple worker threads can throw `SQLITE_BUSY: database is locked`.
   - **Recommendation**: Set `workers: 1` in `playwright.config.ts` to guarantee 100% deterministic test execution without flakiness.
2. **Timezone Uniformity**:
   - Tribhuvan University academic hours operate strictly under `Asia/Kathmandu` (NPT, UTC+5:45).
   - Playwright context is explicitly pinned to `timezoneId: 'Asia/Kathmandu'` to prevent UTC boundary mismatches in `/today` or greeting headers.
3. **External UploadThing Keys**:
   - Tests do not require real `UPLOADTHING_TOKEN` or `UPLOADTHING_SECRET` environment variables because `upload-mock.ts` mocks all network exchanges at the Playwright browser level.
4. **Shadcn / Base UI Compatibility**:
   - Locators rely on semantic accessible roles (`button`, `dialog`, `tab`, `table`, `alert`) and stable attributes rather than volatile Tailwind CSS utility class names.

---

## 4. Conclusion & Recommendations

The designed Playwright infrastructure and fixture architecture establishes a complete, robust testing foundation for Classroom OS:

| Component | Architecture Decision | Benefit |
|-----------|------------------------|---------|
| **Runner & Config** | `playwright.config.ts` with `webServer`, NPT timezone, `workers: 1`, and artifact retention | Zero setup friction, deterministic runs, and deep trace debugging. |
| **Auth Fixture** | Direct session cookie injection via `auth.fixture.ts` | Skips redundant login UI form submissions; speeds up test execution by ~10x. |
| **Database Fixture** | `global-setup.ts` + `db-fixture.ts` with file snapshot restoration | Guarantees clean, repeatable state across all test suites without manual DB cleanup. |
| **Page Object Models** | 8 dedicated POMs covering all core views (`Login`, `PasswordQuarantine`, `AdminAccounts`, `Dashboard`, `Today`, `Attendance`, `Homework`, `Subjects`) | Modular, clean separation of locators from test logic; resilient against UI refactors. |
| **UploadThing Mock** | `upload-mock.ts` with route interception and synthetic file injection | Enables offline and CI execution of assignment submission flows without external API dependencies. |

---

## 5. Verification Method

### 5.1 Package Installation & Script Verification
When ready for implementation in Milestone 2 / E2E Track, the following verification commands will confirm setup:

1. **Install Playwright**:
   ```bash
   npm install -D @playwright/test@^1.50.0
   npx playwright install chromium
   ```

2. **Add Scripts to `package.json`**:
   ```json
   "scripts": {
     "test:e2e": "playwright test",
     "test:e2e:ui": "playwright test --ui",
     "test:e2e:debug": "playwright test --debug"
   }
   ```

3. **Verify Fixture Compilation & Linting**:
   ```bash
   npx tsc --noEmit
   ```

4. **Dry Run Spec Discovery**:
   ```bash
   npx playwright test --list
   ```
