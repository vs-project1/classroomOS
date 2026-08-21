## 2026-08-16T11:28:02Z
You are m2_explorer_3 (Admin Accounts Console & Server Actions Explorer) for Milestone 2 of Classroom OS.
Your working directory is: D:\CLASSROOM OS\.agents\m2_explorer_3

Read:
- D:\CLASSROOM OS\.agents\ORIGINAL_REQUEST.md
- D:\CLASSROOM OS\PROJECT.md
- D:\CLASSROOM OS\TEST_INFRA.md
- D:\CLASSROOM OS\src/db/schema.ts
- D:\CLASSROOM OS\tests/e2e/auth-lifecycle.spec.ts

Analyze and produce a detailed specification for the Admin Accounts Console (`/admin/accounts`):
1. Page Layout & Components (`src/app/(admin)/admin/accounts/page.tsx`):
   - Header with title, description, and "Create Account" button.
   - KPI Summary Cards: Total Accounts, Active Students, Active Teachers, CRs, Deactivated/At-Risk.
   - Search input (by name, email, roll number) and filter tabs/dropdowns (Roles: ALL, STUDENT, TEACHER, CR, ADMIN; Status: ALL, ACTIVE, DEACTIVATED).
   - Accounts Table: User info, role badges, student profile metadata (roll number, faculty, semester), status toggle switch, actions dropdown (Edit, Reset Password, Deactivate/Activate).
2. Create Account Modal:
   - Role selector (`STUDENT`, `TEACHER`, `CR`).
   - Fields: Full Name, Email, Department (teachers), Roll Number, Faculty, Semester (students).
   - Memorable temporary password generator (e.g. `TempPass#2026` or readable random words).
   - Success state displaying created credentials with 1-click clipboard copy button.
3. Server Actions (`src/app/actions/accounts.ts`):
   - `createAccountAction`: Zod validation, scrypt hash temporary password, transaction inserting into `users` and `student_profiles` (if student) or `teachers` (if teacher), catch SQLite UNIQUE constraint errors gracefully.
   - `updateAccountAction`: edit user metadata.
   - `toggleAccountStatusAction`: activate/deactivate user (prevent deactivating own admin account).
   - `resetPasswordAction`: generate new temp password, set `mustChangePassword = 1`, update hash.
4. Write your findings to `D:\CLASSROOM OS\.agents\m2_explorer_3\analysis.md` and `D:\CLASSROOM OS\.agents\m2_explorer_3\handoff.md`.
5. Send message to caller when done.
