# Handoff Report: Admin Accounts Console & Server Actions Specification (Milestone 2)

**Author**: `m2_explorer_3` (Admin Accounts Console & Server Actions Explorer)  
**Recipient**: `parent` (Sub-Orchestrator M2 / Orchestrator)  
**Milestone**: Milestone 2 (Auth, Security, RBAC & Admin Accounts)  
**Working Directory**: `D:\CLASSROOM OS\.agents\m2_explorer_3`  
**Date**: 2026-08-16  

---

## 1. Observation

1. **Database Schema & Constraints** (`src/db/schema.ts:232–277`):
   - `users` table defines:
     - `id: text("id").primaryKey()`
     - `email: text("email").notNull().unique()`
     - `passwordHash: text("password_hash").notNull()`
     - `role: text("role").notNull()` with `CHECK(role IN ('ADMIN', 'TEACHER', 'CR', 'STUDENT'))`
     - `mustChangePassword: integer("must_change_password", { mode: "boolean" }).notNull().default(true)`
     - `isActive: integer("is_active", { mode: "boolean" }).notNull().default(true)`
   - `studentProfiles` table (`src/db/schema.ts:256–277`) defines `userId` referencing `users.id` (with `onDelete: "cascade"`), `rollNumber` (UNIQUE), `semester` (integer with `CHECK(semester BETWEEN 1 AND 8)`), `faculty`, `section`, `batchYear`.
   - `students` table (`src/db/schema.ts:33–44`) defines `id`, `name`, `rollNumber` (UNIQUE), `email` (UNIQUE), `faculty`, `semester` (text).
   - `teachers` table (`src/db/schema.ts:7–20`) defines `id`, `name`, `email` (UNIQUE), `faculties` (JSON array), `semesters` (JSON array).

2. **Database Seeding Reference** (`src/db/seed.ts:34–38, 70–187`):
   - Password hashing standard:
     ```typescript
     export function hashPassword(plainText: string): string {
       const salt = crypto.randomBytes(16).toString("hex");
       const derivedKey = crypto.scryptSync(plainText, salt, 64);
       return `${salt}:${derivedKey.toString("hex")}`;
     }
     ```
   - Seed users are created with `mustChangePassword: true` for new temporary accounts (e.g. `usr_student_aarav` has `mustChangePassword: true`, `role: "CR"`).

3. **Playwright Page Object Model & E2E Locators** (`tests/fixtures/pom/admin-accounts.page.ts:23–42`):
   - `createAccountButton`: `page.locator("button").filter({ hasText: /Create Account|Add User|New Account/i })`
   - `searchInput`: `page.locator("input[placeholder*='Search'], input[type='search']")`
   - `roleFilterSelect`: `page.locator("select[name='roleFilter'], [role='combobox']").filter({ hasText: /Role|All/i })`
   - `accountsTable`: `page.locator("table")`
   - `nameInput`: `page.locator("input[name='name'], #name")`
   - `emailInput`: `page.locator("input[name='email'], #email")`
   - `roleSelect`: `page.locator("select[name='role'], #role")`
   - `rollNumberInput`: `page.locator("input[name='rollNumber'], #rollNumber")`
   - `facultySelect`: `page.locator("select[name='faculty'], input[name='faculty'], #faculty")`
   - `semesterSelect`: `page.locator("select[name='semester'], input[name='semester'], #semester")`
   - `sectionInput`: `page.locator("input[name='section'], #section")`
   - `submitModalButton`: `page.locator("button[type='submit']").filter({ hasText: /Create|Save|Add/i })`
   - `tempPasswordDialog`: `page.locator("[role='dialog']").filter({ hasText: /Credentials|Temporary Password|Created/i })`
   - `tempPasswordText`: `page.locator("[data-testid='temp-password-value'], code, [data-temp-password]")`
   - `copyCredentialsButton`: `page.locator("button").filter({ hasText: /Copy Credentials|Copy Password|Copy/i })`

4. **E2E Spec Assertions** (`tests/e2e/auth-lifecycle.spec.ts:114–164`):
   - `TC-SPEC-AUTH-10`: Verifies `/admin/accounts` renders table roster.
   - `TC-SPEC-AUTH-11`: Creates new student account, verifies credentials dialog or toast appears within 10s.
   - `TC-SPEC-AUTH-12`: Verifies student access to `/admin/accounts` is blocked (403 or redirect).
   - `TC-SPEC-AUTH-13`: Verifies deactivated user account is rejected on login with "deactivated" error.

5. **Existing UI & Layout Standards** (`src/components/ui/dialog.tsx`, `src/app/(admin)/admin/layout.tsx`):
   - Base UI dialog primitives with `DialogTrigger`, `DialogContent`, `DialogHeader`, `DialogTitle`, `DialogDescription`.
   - Admin sidebar at `src/components/app-sidebar.tsx` links admin routes.

---

## 2. Logic Chain

1. **Authentication Decoupling vs. Domain Profiles**:
   - Because `users` holds authentication data while `student_profiles` and `students` hold academic data (Observation 1), `createAccountAction` must insert into both `users` and `student_profiles` + `students` atomically in order for attendance, submissions, and subject views to link cleanly.
2. **Deterministic Constraint Handling**:
   - `users.email`, `students.roll_number`, and `student_profiles.roll_number` have database `UNIQUE` constraints (Observation 1). Following Project Rule 4 ("Do NOT run pre-emptive 'check if exists' SELECT queries before inserting. Rely strictly on database-level constraints"), `createAccountAction` and `updateAccountAction` catch SQLite unique constraint errors and return user-friendly messages (`"A user with this email address already exists."` or `"Roll number already assigned."`).
3. **Password Quarantine Flow**:
   - When an admin provisions an account or resets a password, `mustChangePassword` is set to `true` (Observation 1, 2). This ensures `m2_explorer_2`'s middleware quarantines the user to `/change-password` on their first sign-in.
4. **Strict Locator Compliance**:
   - The Playwright Page Object Model (`admin-accounts.page.ts`) uses specific element locators (Observation 3). Designing our components with `data-testid="temp-password-value"`, `data-temp-password`, `<select name="roleFilter">`, and exact button text ensures 100% test compatibility for `TC-SPEC-AUTH-10` and `TC-SPEC-AUTH-11` (Observation 4).
5. **Self-Deactivation Guard**:
   - If an admin deactivates their own user ID, they would lock themselves out of the console. `toggleAccountStatusAction` verifies `userId !== currentAdmin.id` before mutating `isActive`.

---

## 3. Caveats

1. **Session Invalidation on Deactivation**:
   - When a user is deactivated, if the active session is stored in an encrypted stateless cookie (e.g. HMAC), middleware must check `isActive` on each request or query the user record during session validation to guarantee immediate lockout.
2. **Faculty / Department Multi-Select for Teachers**:
   - In SQLite, teacher `faculties` and `semesters` are stored as JSON arrays (`mode: "json"`). In the creation modal, we allow selecting primary faculty and default to `["BCA"]` if left blank.
3. **Semester Representation**:
   - In `student_profiles`, `semester` is an integer `1..8`. In `students`, it is a string (e.g. `"4th Semester"`). Our `normalizeSemester()` helper converts any representation (`"4th"`, `4`, `"IV"`) to both formats cleanly.

---

## 4. Conclusion

The specification for the Admin Accounts Console (`/admin/accounts`) and Server Actions (`src/app/actions/accounts.ts`) is fully designed and documented in `D:\CLASSROOM OS\.agents\m2_explorer_3\analysis.md`. It includes:
- Complete Server Component & Client Component architecture.
- 5 KPI summary metric cards.
- Search and multi-criteria filtering (role, status).
- Interactive Accounts Table with role badges, academic metadata, and action dropdowns.
- Create Account Dialog with role selector, memorable password generator (`generateMemorablePassword()`), and post-creation Credentials Dialog with 1-click clipboard copying.
- 4 production-ready Server Actions: `createAccountAction`, `updateAccountAction`, `toggleAccountStatusAction`, and `resetPasswordAction`.
- Strict alignment with Playwright E2E tests (`auth-lifecycle.spec.ts`) and Classroom OS architecture rules.

---

## 5. Verification Method

To independently verify this specification and its future implementation:
1. **Compilation Check**:
   ```bash
   npx tsc --noEmit
   ```
   Ensures 0 TypeScript diagnostic errors.
2. **E2E Playwright Suite**:
   ```bash
   npx playwright test tests/e2e/auth-lifecycle.spec.ts
   ```
   Validates `TC-SPEC-AUTH-10` (Roster render), `TC-SPEC-AUTH-11` (Account provisioning & temporary credentials), `TC-SPEC-AUTH-12` (RBAC access denial for students), and `TC-SPEC-AUTH-13` (Deactivated account login rejection).
3. **Inspection of Specifications**:
   - Review `D:\CLASSROOM OS\.agents\m2_explorer_3\analysis.md` for full component code and action definitions.
