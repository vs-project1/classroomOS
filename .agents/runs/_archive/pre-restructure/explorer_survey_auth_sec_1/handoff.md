# Technical Architecture & Survey Specification: Auth, Security & Admin Account Management (R1 & R2)

## Executive Summary
This document provides the definitive architectural specification for **R1 (Authentication & Security Architecture)** and **R2 (Core Domain & Data Isolation - Admin Accounts & Authorization)** for **Classroom OS**. It transitions the system from mock role-toggling prototypes to an institutional-grade, zero-trust, session-based academic operating system.

---

## 1. Observation

### 1.1 Existing Codebase State
- **Current Auth Implementation (`src/lib/auth.ts:6-15`)**:
  ```ts
  export async function getCurrentRole() {
    const cookieStore = await cookies();
    const role = cookieStore.get("APP_ROLE")?.value;
    if (role === "STUDENT") return "STUDENT";
    if (role === "ADMIN") return "ADMIN";
    const envRole = process.env.APP_ROLE;
    return envRole === "STUDENT" ? "STUDENT" : "ADMIN";
  }
  ```
  *Observation*: Role switching is currently unauthenticated and managed via an insecure client-writable `APP_ROLE` cookie (`src/components/role-switcher.tsx:18`) and an environment fallback `DEMO_STUDENT_ID` (`src/lib/auth.ts:36`).
- **Database Schema (`src/db/schema.ts:7-45`)**:
  - `teachers` and `students` exist as standalone domain entities.
  - No `users`, `sessions`, `student_profiles`, or `enrollments` tables exist in `src/db/schema.ts`.
  - `attendance` table (`src/db/schema.ts:102-118`) directly references `students.id`.
- **Next.js Version & Dependencies (`package.json:16-35`)**:
  - `next`: `16.2.10`, `react`: `19.2.4`, `drizzle-orm`: `^0.45.2`, `@libsql/client`: `^0.17.4`, `zod`: `^4.4.3`, `server-only`: `^0.0.1`, `@uploadthing/react`: `^7.3.3`.
  - Node.js runtime has built-in `node:crypto` (`scryptSync`, `randomBytes`, `timingSafeEqual`), eliminating the need for heavy native dependencies (e.g. `bcrypt`).
- **No Middleware File (`src/middleware.ts`)**:
  - The repository currently has no middleware file, meaning route protection relies solely on component-level rendering.
- **Admin Navigation (`src/components/app-sidebar.tsx:8-16`)**:
  - Nav items list `/admin`, `/admin/homework`, `/admin/notices`, `/admin/events`, `/admin/teachers`, `/admin/students`, `/admin/subjects`.
  - Missing `/admin/accounts` navigation link.

---

## 2. Logic Chain & Technical Architecture

### 2.1 Core Architectural Principles
1. **Zero-Trust Client Identity**: The client never specifies their own `userId`, `studentId`, or `role` in requests. All authorization context is derived server-side from a cryptographically verified HTTP-only session cookie.
2. **Private Institution Model (No Public Signup)**: Classroom OS is an internal institutional platform. User accounts are created exclusively by Administrators. Public signup routes (`/register`, `/signup`) are strictly prohibited.
3. **Decoupled Identity vs. Academic Profile**: Authentication identity (`users`, `sessions`) is separated from academic domain records (`student_profiles`, `teachers`). Deactivating or resetting a user's account never mutates or breaks historical attendance logs, homework submissions, or lecture records.
4. **Enforced Security Quarantine (`mustChangePassword`)**: Newly provisioned accounts are placed into a restricted quarantine state where they can only access the password change flow before unlocking academic workspaces.

---

### 2.2 R1: Authentication & Security Architecture

```
                                  ┌─────────────────────────────┐
                                  │      Client (Browser)       │
                                  └──────────────┬──────────────┘
                                                 │
                                 HTTP Request    │ Cookie: auth_session=<token>
                                 (or Login POST) │
                                                 ▼
┌─────────────────────────────────────────────────────────────────────────────────────────────────┐
│ Next.js Request Lifecycle                                                                        │
│                                                                                                 │
│  1. Edge/Node Middleware (src/middleware.ts)                                                    │
│     ├── Extract `auth_session` cookie                                                           │
│     ├── Public routes: [/login, /api/uploadthing] -> Allow                                      │
│     ├── No cookie & protected route -> Redirect /login?callbackUrl=...                          │
│     └── Authenticated -> Pass through to Server Components                                      │
│                                                                                                 │
│  2. Server Components & Layouts (src/lib/auth/session.ts)                                        │
│     ├── `getCurrentUser()`: Lookup session in DB -> verify expiry & users.isActive              │
│     ├── Check `mustChangePassword === true`: If on academic page -> Redirect /change-password    │
│     └── `requireAuth([roles])`: Verify RBAC role (`ADMIN`, `TEACHER`, `CR`, `STUDENT`)          │
│                                                                                                 │
│  3. Server Actions (Data Mutations)                                                             │
│     ├── Self-authenticating: `const auth = await requireAuth(["ADMIN" | "TEACHER" | ...])`      │
│     ├── Derive caller ID strictly from `auth.user.id` / `auth.studentProfile.id`                │
│     └── Execute database transaction with constraint handling                                   │
└─────────────────────────────────────────────────────────────────────────────────────────────────┘
```

#### 2.2.1 Session Storage & Cookie Security Specification
- **Session Mechanism**: Database-backed sessions table (`sessions`) stored in Turso/libSQL.
  - *Rationale*: Allows instantaneous administrative revocation (deactivating an account or resetting a password immediately kills active sessions), auditability, and concurrent session tracking.
- **Session Token Generation**:
  - Cryptographically secure 32-byte random hex string: `crypto.randomBytes(32).toString("hex")`.
  - Stored directly as primary key in `sessions` table (or SHA-256 hashed if token-hashing is desired).
  - Session TTL: 30 days (`30 * 24 * 60 * 60 * 1000` ms).
- **Cookie Security Attributes**:
  - Name: `auth_session`
  - `httpOnly: true` (Prevents client-side JS / XSS access)
  - `secure: process.env.NODE_ENV === "production"` (Enforces HTTPS in production)
  - `sameSite: "lax"` (Mitigates CSRF while enabling standard navigation links)
  - `path: "/"`
  - `maxAge: 60 * 60 * 24 * 30` (30 days)

#### 2.2.2 Password Security & Cryptographic Hashing
- Utilizes Node.js standard library `node:crypto` (`scryptSync`, `randomBytes`, `timingSafeEqual`) to avoid external native binary compilation issues:
  - **Hashing Algorithm**: `scrypt` with 16-byte random salt and 64-byte key length.
  - **Storage Format**: `${salt}:${derivedKeyHex}`.
  - **Verification**: Timing-safe buffer comparison (`crypto.timingSafeEqual`) to prevent side-channel timing attacks.
  - **Password Strength Rules**: Minimum 8 characters, requiring at least one uppercase letter, one lowercase letter, and one number or special character.

#### 2.2.3 Temporary Password & `mustChangePassword` Workflow
1. **Account Provisioning**:
   - Admin generates an account via `/admin/accounts`.
   - System produces a secure, readable temporary password (e.g., `TuPass-9k82X`) or uses an admin-specified initial password.
   - User record is created with:
     - `password_hash`: hashed temporary password
     - `must_change_password`: `true`
     - `is_active`: `true`
2. **First Login**:
   - User navigates to `/login` and enters their email/roll number and temporary password.
   - Authentication succeeds, creating a new session cookie.
   - System checks `user.mustChangePassword === true`.
   - Server Action redirects user immediately to `/change-password`.
3. **Quarantine Enforcement**:
   - Both `middleware.ts` and root layouts (`src/app/(student)/layout.tsx`, `src/app/(admin)/admin/layout.tsx`) verify `mustChangePassword`.
   - Any attempt to access `/`, `/today`, `/subjects`, `/attendance`, `/homework`, `/admin`, etc. while `mustChangePassword === true` is rejected with an HTTP 307 redirect to `/change-password`.
4. **Password Set**:
   - On `/change-password`, user enters:
     - `currentPassword` (temporary password)
     - `newPassword`
     - `confirmPassword`
   - Server Action `changeInitialPassword`:
     - Verifies current temporary password against database hash.
     - Enforces that `newPassword !== currentPassword`.
     - Validates password complexity.
     - Updates `users.passwordHash` with newly hashed password.
     - Sets `users.mustChangePassword = false`.
     - Sets `users.updatedAt = new Date()`.
     - Redirects user to their role landing page (`/` for Student/CR, `/admin` for Admin).

---

### 2.3 R2: Core Domain & Data Isolation Architecture

#### 2.3.1 Database Schema Specification (`src/db/schema.ts`)

```ts
import { sql, relations } from "drizzle-orm";
import { sqliteTable, text, integer, unique, index, check } from "drizzle-orm/sqlite-core";

// 1. Users Table (Core Auth Identity)
export const users = sqliteTable("users", {
  id: text("id").primaryKey(), // UUID
  email: text("email").notNull().unique(),
  username: text("username").unique(),
  passwordHash: text("password_hash").notNull(),
  role: text("role").notNull(), // 'ADMIN', 'TEACHER', 'CR', 'STUDENT'
  isActive: integer("is_active", { mode: "boolean" }).notNull().default(true),
  mustChangePassword: integer("must_change_password", { mode: "boolean" }).notNull().default(true),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`),
  updatedAt: integer("updated_at", { mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`),
}, (table) => [
  index("idx_users_email").on(table.email),
  index("idx_users_role").on(table.role),
  check("chk_users_role", sql`${table.role} IN ('ADMIN', 'TEACHER', 'CR', 'STUDENT')`),
]);

// 2. Sessions Table (Active Authentication Tokens)
export const sessions = sqliteTable("sessions", {
  id: text("id").primaryKey(), // 32-byte hex token
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  expiresAt: integer("expires_at", { mode: "timestamp" }).notNull(),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`),
}, (table) => [
  index("idx_sessions_user_id").on(table.userId),
  index("idx_sessions_expires_at").on(table.expiresAt),
]);

// 3. Student Profiles Table (Decoupled Academic Identity)
export const studentProfiles = sqliteTable("student_profiles", {
  id: text("id").primaryKey(), // UUID
  userId: text("user_id")
    .notNull()
    .unique()
    .references(() => users.id, { onDelete: "cascade" }),
  rollNumber: text("roll_number").notNull().unique(),
  name: text("name").notNull(),
  phone: text("phone"),
  faculty: text("faculty").notNull(), // e.g., 'BCA'
  semester: text("semester").notNull(), // e.g., '4th'
  section: text("section"), // e.g., 'A'
  batch: text("batch"), // e.g., '2024'
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`),
  updatedAt: integer("updated_at", { mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`),
}, (table) => [
  index("idx_student_profiles_user").on(table.userId),
  index("idx_student_profiles_faculty_sem").on(table.faculty, table.semester),
  index("idx_student_profiles_roll").on(table.rollNumber),
]);

// 4. Enrollments Table (Subject Access & Data Isolation)
export const enrollments = sqliteTable("enrollments", {
  id: text("id").primaryKey(),
  studentProfileId: text("student_profile_id")
    .notNull()
    .references(() => studentProfiles.id, { onDelete: "cascade" }),
  subjectId: text("subject_id")
    .notNull()
    .references(() => subjects.id, { onDelete: "cascade" }),
  status: text("status").notNull().default("enrolled"),
  enrolledAt: integer("enrolled_at", { mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`),
}, (table) => [
  unique("unq_enrollment_student_subject").on(table.studentProfileId, table.subjectId),
  index("idx_enrollments_student").on(table.studentProfileId),
  index("idx_enrollments_subject").on(table.subjectId),
  check("chk_enrollment_status", sql`${table.status} IN ('enrolled', 'dropped', 'completed')`),
]);
```

#### 2.3.2 Updating Existing Tables
- **`teachers` Table**:
  - Add `userId: text("user_id").unique().references(() => users.id, { onDelete: "set null" })`.
- **`attendance` Table**:
  - Update `studentId` foreign key to reference `studentProfiles.id` with `onDelete: "cascade"`.
- **`homework` & `assignmentSubmissions`**:
  - `assignmentSubmissions` table linking `homeworkId` + `studentProfileId` (composite unique).

---

### 2.4 Role-Based Access Control (RBAC) Matrix

| Domain Area / Route | `ADMIN` | `TEACHER` | `CR` (Class Rep) | `STUDENT` |
| :--- | :--- | :--- | :--- | :--- |
| **Account Management (`/admin/accounts`)** | **Full CRUD, Reset PW, Deactivate** | ❌ None | ❌ None | ❌ None |
| **Teacher Directory (`/admin/teachers`)** | **Full CRUD** | View self / colleagues | ❌ None | ❌ None |
| **Student Directory (`/admin/students`)** | **Full CRUD** | View assigned students | View classmates | ❌ None |
| **Subject Configuration (`/admin/subjects`)** | **Full CRUD** | Edit assigned subject syllabus | ❌ None | ❌ None |
| **Weekly Routine (`/routine`)** | **Full CRUD** | Read-only | Read-only | Read-only |
| **Session Logging (`/sessions/new`)** | **Full** | **Full (Own subjects)** | **Full (Can log for class)** | ❌ None |
| **Attendance Capture** | **Full** | **Full (Own sessions)** | **Full (Session attendance)** | ❌ None |
| **Attendance Barometer (`/attendance`)** | View all students | View class statistics | **View own barometer** | **View own barometer** |
| **Attendance Correction Requests** | Review / Approve / Reject | Review / Approve / Reject | Submit for own records | Submit for own records |
| **Assignment Creation (`/homework/new`)** | **Full** | **Full** | **Auto-log from session** | ❌ None |
| **Assignment Submissions (`/homework`)** | Review & Grade all | Review & Grade assigned | Submit & view own only | Submit & view own only |
| **Course Materials / Resources** | Full upload/delete | Full upload for assigned | View enrolled materials | View enrolled materials |
| **Notice Board (`/notices`)** | Full (Global & Pinned) | Subject-level notices | Class notices | Read-only |
| **Events Calendar (`/events`)** | **Full CRUD** | View / Post Events | Read-only | Read-only |

---

### 2.5 `/admin/accounts` UI & Functionality Specification

#### 2.5.1 Page Layout & Route Structure
- **Path**: `src/app/(admin)/admin/accounts/page.tsx`
- **Subcomponents**:
  - `src/app/(admin)/admin/accounts/account-table.tsx`
  - `src/app/(admin)/admin/accounts/account-dialog.tsx`
  - `src/app/(admin)/admin/accounts/reset-password-dialog.tsx`
  - `src/app/(admin)/admin/accounts/account-stats.tsx`
  - `src/app/(admin)/admin/accounts/actions.ts`

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│ Admin Console > Accounts Management                                  [+ Create Account]│
├────────────────────────────────────────────────────────────────────────────────────────┤
│  [Total: 124]    [Students: 98]    [Teachers: 14]    [CRs: 4]    [PW Pending: 12]      │
├────────────────────────────────────────────────────────────────────────────────────────┤
│  🔍 Search name, email, roll...   [Role: All ▼]   [Status: All ▼]   [Faculty: BCA ▼]   │
├────────────────────────────────────────────────────────────────────────────────────────┤
│ Name & Email         │ Role     │ Linked Profile        │ Status       │ Actions       │
├──────────────────────┼──────────┼───────────────────────┼──────────────┼───────────────┤
│ Aarav Sharma         │ STUDENT  │ Roll: 24BCA012 (4th)  │ Active       │ [••• Actions] │
│ aarav@college.edu.np │          │                       │              │               │
├──────────────────────┼──────────┼───────────────────────┼──────────────┼───────────────┤
│ Er. Ramesh Adhikari  │ TEACHER  │ Dept: Computer Science│ Active       │ [••• Actions] │
│ ramesh@college.edu.np│          │ Subjects: DSA, DBMS   │              │               │
├──────────────────────┼──────────┼───────────────────────┼──────────────┼───────────────┤
│ Sneha Shrestha       │ CR       │ Roll: 24BCA001 (4th)  │ Must Change  │ [••• Actions] │
│ sneha@college.edu.np │          │                       │ Password     │               │
└────────────────────────────────────────────────────────────────────────────────────────┘
```

#### 2.5.2 Account Creation Modal Workflow (`account-dialog.tsx`)
1. **Role Selection**: Radio group selecting `STUDENT`, `TEACHER`, `CR`, `ADMIN`.
2. **User Identity Fields**: Full Name, Email (validated unique), Phone (optional, NP standard).
3. **Dynamic Role-Specific Profiles**:
   - If `STUDENT` or `CR`: Roll Number (unique), Faculty (BCA, CSIT, etc.), Semester (1st-8th), Section (A, B), Batch (e.g., 2024).
   - If `TEACHER`: Select assigned faculties and semesters.
4. **Temporary Password Generation**:
   - Checkbox "Auto-generate secure temporary password" (checked by default, generates 10-char alpha-numeric memorable string e.g. `TuPass-7m9X`).
   - Manual entry alternative with strength gauge.
5. **Submission Feedback**:
   - Returns a modal confirmation dialog containing the newly created user credentials with a 1-click **"Copy Login Credentials"** button for easy distribution to students/teachers.

#### 2.5.3 Account Actions Menu
- **Edit Account**: Update name, email, phone, semester/faculty.
- **Reset Password**: Generates a new temporary password, updates `users.mustChangePassword = true`, revokes active sessions in `sessions` table, and presents the new password for sharing.
- **Toggle Active Status (Deactivate / Reactivate)**:
  - Deactivating sets `users.isActive = false` and deletes all rows for that `userId` in `sessions`, immediately terminating any active login session.
  - Reactivating sets `users.isActive = true`.

---

### 2.6 Strict Data Isolation & Server-Side Authorization Model

```
                    ┌──────────────────────────────────────────────────┐
                    │ Client Request: GET /subjects/subj_discrete_math │
                    └────────────────────────┬─────────────────────────┘
                                             │
                                             ▼
                    ┌──────────────────────────────────────────────────┐
                    │ Server Component: SubjectDetailPage({ params })  │
                    │                                                  │
                    │ 1. `const auth = await requireAuth();`           │
                    │    -> Extracted user: ID=u_101, Role=STUDENT     │
                    │ 2. `const profile = await getStudentProfile(...)`│
                    │    -> Profile: ID=sp_202, Faculty=BCA, Sem=4th   │
                    │                                                  │
                    │ 3. Authorization Query:                          │
                    │    SELECT 1 FROM enrollments                     │
                    │    WHERE student_profile_id = 'sp_202'           │
                    │      AND subject_id = 'subj_discrete_math'       │
                    │                                                  │
                    │ ─── Is Enrolled? ─────────────────────────────── │
                    │   ├── YES -> Render syllabus, sessions, resources│
                    │   └── NO  -> `notFound()` (404) or 403 Forbidden │
                    └──────────────────────────────────────────────────┘
```

#### 2.6.1 Zero-Trust Rules by Module
1. **Subject Pages (`/subjects/[id]`)**:
   - Students can only view subjects they are enrolled in (`enrollments` table).
   - Attempting to view another faculty/semester's subject ID returns `notFound()`.
2. **Assignments & Submissions (`/homework/[id]`)**:
   - Submissions are queried strictly with `where: and(eq(submissions.homeworkId, homeworkId), eq(submissions.studentProfileId, profile.id))`.
   - File uploads in Server Actions verify that the homework belongs to an enrolled subject before committing to the database.
3. **Attendance Records (`/attendance`)**:
   - Aggregations and TU 80% barometer calculations execute only over records where `attendance.studentId === profile.id`.
4. **Attendance Correction Flow**:
   - When a student files a correction request for a session, the server action verifies that the student was scheduled for that session before creating the request.

---

## 3. Caveats & Edge Cases Considered

1. **Migration from Legacy `students` Table**:
   - The current database has a `students` table referenced by `attendance`. During implementation of R4, existing records in `students` must be migrated to `student_profiles` and linked to new `users` accounts via a migration script (`scripts/migrate-auth.ts`).
2. **Session Expiry Cleanup**:
   - In SQLite/libSQL, expired sessions accumulate over time. A periodic cleanup helper (`cleanupExpiredSessions()`) should be executed during routine login operations or server startup.
3. **Rate Limiting & Brute-Force Protection**:
   - While public signup is disabled, the `/login` endpoint must be protected against brute-force attacks by tracking failed login attempts per IP/account.

---

## 4. Conclusion
The proposed architecture for R1 and R2 provides a complete, robust, and zero-trust foundation for Classroom OS:
- **Authentication**: Native React 19 / Next.js session-based architecture with HTTP-only cookies and zero-dependency `node:crypto` hashing.
- **Access Control**: Strict RBAC across `ADMIN`, `TEACHER`, `CR`, and `STUDENT` enforced consistently across middleware, server components, and server actions.
- **Account Lifecycle**: Administrator-controlled user provisioning with automated temporary password generation, one-click credential sharing, and a mandatory `mustChangePassword` quarantine flow.
- **Domain Decoupling & Isolation**: Clear separation between `users`, `sessions`, `student_profiles`, `enrollments`, and `teachers`, ensuring absolute data isolation across subjects, assignments, and attendance.

---

## 5. Verification Method

### 5.1 Playwright E2E Test Suite (`tests/auth-and-accounts.spec.ts`)
Run: `npx playwright test tests/auth-and-accounts.spec.ts`

Key test cases to verify:
1. **Admin Account Creation Workflow**:
   - Admin logs in with master credentials (`admin@college.edu.np`).
   - Navigates to `/admin/accounts`.
   - Creates a new student account (`test.student@college.edu.np`, Roll: `24BCA999`).
   - Captures generated temporary password from modal.
2. **`mustChangePassword` Quarantine Flow**:
   - Student logs in with temporary password.
   - Assert browser is redirected to `/change-password`.
   - Attempt to manually navigate to `/` or `/attendance` -> Assert automatic redirect back to `/change-password`.
   - Submit new secure password.
   - Assert successful redirection to Student Dashboard (`/`).
3. **RBAC Route Protection**:
   - Student attempts to access `/admin/accounts` or `/admin/teachers` -> Assert 403 / Redirect to `/login`.
   - Non-CR Student attempts to access `/sessions/new` -> Assert blocked.
   - CR Student accesses `/sessions/new` -> Assert accessible.
4. **Data Isolation**:
   - Student A attempts to access `/subjects/[id]` for an un-enrolled subject -> Assert 404 Not Found.
   - Student A attempts to query Student B's assignment submission -> Assert Forbidden / 404.

### 5.2 TypeScript Compilation & Migration Verification
1. Run `npx tsc --noEmit` to assert 0 type errors across all schema and route files.
2. Run `npm run db:generate && npm run db:migrate` to verify zero SQLite referential integrity errors.
3. Execute `npx tsx scripts/verify-auth.ts` to test password hashing, session insertion, constraint violation handling, and user deactivation.
