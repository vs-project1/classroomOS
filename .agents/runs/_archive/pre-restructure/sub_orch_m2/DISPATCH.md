# Milestone 2: Authentication, Security, RBAC & Admin Accounts Console

## Mission
Orchestrate, implement, and verify Milestone 2 (Features F4–F8) for Classroom OS:
1. **F4: Session-Based Authentication**: `src/lib/auth/` (scrypt password crypto, `auth_session` HTTP-only cookies, session creation/invalidation, `getCurrentUser`, `requireAuth`).
2. **F5: Admin-Controlled Provisioning**: No public signup. Admin creation of Student, Teacher, CR accounts with temporary password generation.
3. **F6: Mandatory Password Change Quarantine Flow**: `/change-password` page and middleware quarantine intercepting users with `mustChangePassword === true`.
4. **F7: Role-Based Access Control (RBAC)**: `src/middleware.ts`, layout guards, server component helpers, and server action permission checks.
5. **F8: Admin Accounts Console**: `/admin/accounts` with KPI metrics, search, role/status filtering, creation modal, edit/deactivate, and password reset server actions.
6. **Login Page**: `/login` supporting email/password authentication, error display, and redirect handling.

## Scope & Constraints
- Authoritative User Request: `D:\CLASSROOM OS\.agents\ORIGINAL_REQUEST.md` (§R1, §R2)
- Project Specifications: `D:\CLASSROOM OS\PROJECT.md` (§F4–F8, Interface Contracts, Code Layout)
- Architecture Rules: `AGENTS.md` and `D:\CLASSROOM OS\.agents\AGENTS.md` (React 19 Server Actions, Zod validation, no raw `route.ts` for UI mutations, standardized action response `{ success: boolean, message?: string, fieldErrors?: object }`, Asia/Kathmandu timezone, Base UI / Shadcn styling).
- E2E Test Specifications: `D:\CLASSROOM OS\TEST_INFRA.md` & `tests/e2e/auth-lifecycle.spec.ts`.

## Your Execution Procedure
1. Initialize your BRIEFING.md and SCOPE.md in `D:\CLASSROOM OS\.agents\sub_orch_m2`.
2. Dispatch 3 Explorers (`teamwork_preview_explorer`):
   - Explorer 1: Session auth service architecture (`src/lib/auth/`), scrypt password hashing, cookies, and Next.js 16 / React 19 compatibility.
   - Explorer 2: Middleware quarantine & RBAC guard (`src/middleware.ts`), login page (`/login`), and password change flow (`/change-password`).
   - Explorer 3: Admin Accounts Console (`/admin/accounts`), UI components, KPIs, and Server Actions (create, update, deactivate, reset password).
3. Synthesize explorer findings into an implementation plan.
4. Dispatch Worker (`teamwork_preview_worker`) to implement all M2 components and run tests/type checks.
5. Dispatch 2 Reviewers (`teamwork_preview_reviewer`):
   - Reviewer 1: Security, password crypto, session cookies, RBAC quarantine middleware.
   - Reviewer 2: Admin accounts UI, server actions, Zod schemas, error handling.
6. Dispatch 2 Challengers (`teamwork_preview_challenger`):
   - Challenger 1: Empirical verification of auth lifecycle, quarantine redirect, and RBAC enforcement.
   - Challenger 2: Empirical verification of admin accounts CRUD, deactivation, password reset, and type checking (`npx tsc --noEmit`).
7. Dispatch Forensic Auditor (`teamwork_preview_auditor`) for anti-cheating & integrity checks.
8. Evaluate Gate in `GATE_STATUS.md` (Forensic Auditor CLEAN, all Reviewers APPROVE, all Challengers APPROVE).
9. Once Gate passes, write `handoff.md` and report completion via `send_message` to parent (`80c1ff19-33dc-4507-b232-1fdadb07c472`).
