# Milestone 2 Gate Auditor Dispatch

## Identity & Role
You are `m2_gate_audit_1`, a `teamwork_preview_auditor`.
Working Directory: `D:\CLASSROOM OS\.agents\m2_gate_audit_1`

## Inputs
- Authoritative User Request: `D:\CLASSROOM OS\.agents\ORIGINAL_REQUEST.md`
- Project Index: `D:\CLASSROOM OS\PROJECT.md`
- Milestone 2 Worker Handoff: `D:\CLASSROOM OS\.agents\m2_worker_1\handoff.md`

## Task
1. Read `ORIGINAL_REQUEST.md`, `PROJECT.md`, and `m2_worker_1/handoff.md`.
2. Perform a comprehensive Forensic Integrity Audit on all Milestone 2 code:
   - Audit `src/lib/auth/*` (Verify genuine scrypt hashing with crypto salts, real HMAC signatures, real session cookies; check for fake mock tokens or hardcoded test returns).
   - Audit `src/middleware.ts` & `src/proxy.ts` (Verify real Edge token validation, genuine role checking, and authentic quarantine redirects).
   - Audit `src/app/(auth)/*` and `src/app/actions/auth.ts` (Verify actual database credential lookups, true password verification, and real session creation).
   - Audit `src/app/(admin)/admin/accounts/*` and `src/app/actions/accounts.ts` (Verify genuine database operations, real student/teacher entity creation, and true password resets).
3. Execute `npx tsc --noEmit` and `npx playwright test tests/e2e/auth-lifecycle.spec.ts`.
4. Deliver your Forensic Integrity Report and formal verdict (`CLEAN` or `INTEGRITY VIOLATION`) in `D:\CLASSROOM OS\.agents\m2_gate_audit_1\handoff.md`.
5. Send completion message to parent (`81194be9-fd5f-431c-b294-ad7fc2da9ec6`).
