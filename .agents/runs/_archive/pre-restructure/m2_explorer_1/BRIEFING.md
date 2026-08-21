# BRIEFING — 2026-08-16T11:29:45Z

## Mission
Analyze and produce a detailed architectural specification for the session auth service in src/lib/auth/ (password crypto and session/cookie management) for Milestone 2.

## 🔒 My Identity
- Archetype: explorer
- Roles: Session Auth Architecture & Cryptography Explorer
- Working directory: D:\CLASSROOM OS\.agents\m2_explorer_1
- Original parent: 51f04cf5-c8ae-404e-93f7-a224187f6ab7
- Milestone: Milestone 2 (Auth System & User Management)

## 🔒 Key Constraints
- Read-only investigation — do NOT implement
- Password format must be 100% compatible with existing passwords hashed in src/db/seed.ts
- Use node:crypto scrypt and timingSafeEqual
- Next.js 16 App Router cookies() async API
- Strict adherence to Classroom OS architecture rules (Radical Simplicity, strict database-level integrity, etc.)

## Current Parent
- Conversation ID: 51f04cf5-c8ae-404e-93f7-a224187f6ab7
- Updated: not yet

## Investigation State
- **Explored paths**:
  - `src/db/schema.ts` (users, student_profiles, teachers, enrollments)
  - `src/db/seed.ts` (scryptSync password hashing standard with 16-byte hex salt, 64-byte keylen)
  - `tests/fixtures/auth.fixture.ts` & `tests/fixtures/seed-data.ts` (Playwright E2E persona injection)
  - `tests/e2e/auth-lifecycle.spec.ts` (Login, quarantine, accounts console, RBAC specs)
  - `graphify-out/GRAPH_REPORT.md` (codebase topology)
- **Key findings**:
  - Hashing algorithm: `scrypt` with 16-byte random salt (32 hex characters) and 64-byte keylen (128 hex characters), stored as `${salt}:${derivedKeyHex}` (161 chars total).
  - Production password verification: async `util.promisify(crypto.scrypt)` + `crypto.timingSafeEqual`.
  - Session token format: Stateless HMAC-SHA256 signed payload `${userId}.${expiresAt}.${signature}` in `auth_session` cookie (30-day TTL, HttpOnly, SameSite=Lax, Secure in prod).
  - Next.js 16 App Router `cookies()` async API integration (`await cookies()`).
  - Seamless dual-mode support in `getCurrentUser()` for production HMAC tokens and test fixture personas (`DEMO_STUDENT_ID`, `APP_ROLE`).
- **Unexplored areas**: None (Full exploration complete).

## Key Decisions Made
- Recommended 5-module structure for `src/lib/auth/`: `password.ts`, `token.ts`, `session.ts`, `rbac.ts`, `index.ts`.
- Retained `src/lib/auth.ts` as a re-export layer for backwards compatibility.

## Artifact Index
- `D:\CLASSROOM OS\.agents\m2_explorer_1\DISPATCH.md` — Initial dispatch message
- `D:\CLASSROOM OS\.agents\m2_explorer_1\BRIEFING.md` — Agent briefing & memory
- `D:\CLASSROOM OS\.agents\m2_explorer_1\progress.md` — Progress tracker
- `D:\CLASSROOM OS\.agents\m2_explorer_1\analysis.md` — Detailed architectural analysis & code specs
- `D:\CLASSROOM OS\.agents\m2_explorer_1\handoff.md` — 5-Component handoff report
