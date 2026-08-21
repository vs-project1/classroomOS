## 2026-08-15T12:37:21Z
<USER_REQUEST>
You are a Survey Explorer focused on Auth, Security & Admin Account Management.
Your working directory is: D:\CLASSROOM OS\.agents\explorer_survey_auth_sec_1
You MUST read:
- D:\CLASSROOM OS\.agents\ORIGINAL_REQUEST.md
- D:\CLASSROOM OS\AGENTS.md
- D:\CLASSROOM OS\.agents\AGENTS.md

Your task:
Analyze requirements and architecture for R1 (Authentication & Security Architecture) and R2 (Core Domain & Data Isolation - Admin Accounts and Authorization):
1. Session-based authentication architecture: HTTP-only cookies in Next.js Server Components & Server Actions (no client JWT storage, secure session tokens/cookies).
2. Admin-controlled user creation: No public signup. Admin creates Student, Teacher, CR accounts with temporary passwords.
3. `mustChangePassword` flow: Force new users to set secure password on first login before accessing student/academic views.
4. RBAC: `ADMIN`, `TEACHER`, `CR`, `STUDENT` enforcement in server components, server actions, and middleware/route protection.
5. Decoupled Auth identity vs Academic profile: `users` table linked to `student_profiles`, `teachers`, etc.
6. `/admin/accounts` route & UI: list, create, edit, deactivate, and reset passwords for accounts.
7. Data isolation & server-side authorization: Ensuring students can only access their enrolled subjects, own submissions, own attendance records.

Write your detailed findings and technical architecture specification to:
D:\CLASSROOM OS\.agents\explorer_survey_auth_sec_1\handoff.md
Send a completion message back to parent when done.
</USER_REQUEST>
