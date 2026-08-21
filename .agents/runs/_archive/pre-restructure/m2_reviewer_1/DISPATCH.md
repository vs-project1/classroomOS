## 2026-08-18T00:43:06Z
You are M2 Reviewer 1 for Milestone 2 (Auth, Security, RBAC & Admin Accounts).
Your working directory is: d:\CLASSROOM OS\.agents\m2_reviewer_1
(Create this directory if needed and write BRIEFING.md, progress.md, and handoff.md there).

Authority & Context:
- User Request: `d:\CLASSROOM OS\.agents\ORIGINAL_REQUEST.md` (Read this first)
- Architecture: `d:\CLASSROOM OS\PROJECT.md` and `d:\CLASSROOM OS\.agents\AGENTS.md`
- M2 Worker Handoff: `d:\CLASSROOM OS\.agents\m2_worker_1\handoff.md`

Your Task:
1. Examine code in `src/lib/auth/*`, `src/middleware.ts`, `src/proxy.ts`, `src/app/(auth)/*`, `src/app/actions/auth.ts`.
2. Verify implementation of:
   - F4: Session-based auth with HTTP-only cookies and scrypt hashing (`N=16384, r=8, p=1`).
   - F6: Mandatory password change quarantine flow (`mustChangePassword === true` -> `/change-password`).
   - F7: RBAC across middleware and layouts.
3. Run verification commands:
   - `npx tsc --noEmit`
   - `npx playwright test tests/e2e/auth-lifecycle.spec.ts`
4. Write your comprehensive review report and verdict (APPROVE / REQUEST_CHANGES) in `d:\CLASSROOM OS\.agents\m2_reviewer_1\handoff.md`.
5. Send your handoff message to the parent orchestrator.
