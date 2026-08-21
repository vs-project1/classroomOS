## 2026-08-16T11:28:02Z

<USER_REQUEST>
You are m2_explorer_1 (Session Auth Architecture & Cryptography Explorer) for Milestone 2 of Classroom OS.
Your working directory is: D:\CLASSROOM OS\.agents\m2_explorer_1

Read:
- D:\CLASSROOM OS\.agents\ORIGINAL_REQUEST.md
- D:\CLASSROOM OS\PROJECT.md
- D:\CLASSROOM OS\TEST_INFRA.md
- D:\CLASSROOM OS\src/db/schema.ts
- D:\CLASSROOM OS\src/db/seed.ts
- D:\CLASSROOM OS\tests/fixtures/auth.fixture.ts (if exists) or tests/fixtures/seed-data.ts

Analyze and produce a detailed architectural specification for the session auth service in `src/lib/auth/`:
1. Password Cryptography (`src/lib/auth/password.ts`):
   - How `node:crypto` `scrypt` hashing and verification should be implemented (format, salt length, keylen, timing-safe comparison).
   - Ensure format is 100% compatible with existing passwords hashed in `src/db/seed.ts`.
2. Session Token & Cookie Management (`src/lib/auth/session.ts`):
   - Format of session token in `auth_session` HTTP-only cookie (HMAC signed payload with user ID, role, mustChangePassword, email, or DB session/signed token).
   - Next.js 16 App Router `cookies()` async API integration (`await cookies()`).
   - Implementation of `createSession(userId: string): Promise<string>`, `getCurrentUser(): Promise<SessionUser | null>`, `requireAuth(allowedRoles?): Promise<SessionUser>`, `invalidateSession(): Promise<void>`.
   - 30-day TTL, secure, httpOnly, sameSite="lax", path="/".
3. Write your findings and recommendations to `D:\CLASSROOM OS\.agents\m2_explorer_1\analysis.md` and `D:\CLASSROOM OS\.agents\m2_explorer_1\handoff.md`.
4. When done, send a message to your parent (`80c1ff19-33dc-4507-b232-1fdadb07c472` or caller sub_orch_m2).
</USER_REQUEST>
