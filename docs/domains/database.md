# Domain Brief: Database

## Purpose
SQLite (local file) / Turso (remote libsql) via Drizzle ORM. Single schema source `src/db/schema.ts`;
SQL migrations in `drizzle/`. All writes flow through feature actions — no client-side DB access.

## Key files
- `src/db/schema.ts` — all tables; `sessions` revocation registry (:496-507); relations/types at bottom
- `src/db/client.ts` — libsql client; `PRAGMA foreign_keys = ON` first statement (:14-16)
- `src/db/seed.ts` — dev seeder; deletes ALL tables non-transactionally (:44-68)
- `drizzle/0000..0006_*.sql` — migrations; 0006 adds `sessions` (+ stray
  `unq_class_session_subject_date` re-create from snapshot drift, S10 report §Migration)
- `drizzle.config.ts`; `scripts/verify-db.ts` (`pnpm db:verify`)
- `tests/fixtures/global-setup.ts` — migrates+seeds whatever DATABASE_URL points to (:11-33)

## Invariants
1. PRAGMA foreign_keys=ON is queued at module init before any query (client.ts:11-16). Remote/Turso
   drivers may reject PRAGMAs — failure is logged, NOT fatal (client.ts:14-16): FK enforcement on remote
   is UNVERIFIED.
2. Password hash format `${saltHex}:${scryptHex}` (16-byte salt / 64-byte key) must stay identical between
   `src/db/seed.ts:34-38` (private copy) and `src/lib/auth/password.ts:22-29` — drift locks every account out.
3. Migrations apply via `pnpm db:migrate`. S10's 0006 was applied to the local file DB ONLY
   (`file:local.db`, S10 report §Migration).

## Known sharp edges
- Seed script can wipe live DB (review C8, UNFIXED): seed.ts loads `.env.local` (seed.ts:2) which holds a
  remote rw Turso URL+token; truncation (:44-68) is non-transactional with no file:-URL guard. Known
  seeded creds are exempt from rotation.
- Migration drift (review IMPORTANT, UNFIXED): drizzle/0002_lonely_master_chief.sql:98,:101 add
  routine_id/teacher_id WITHOUT the ON DELETE SET NULL the schema expects.
- Remote DB NOT yet migrated to 0006 (S10) — deploy window must run `pnpm db:migrate` against Turso. PLANNED.
- Triple student identity: students.email ↔ users.email ↔ studentProfiles.rollNumber resolution chains
  (session.ts:263-275); teachers linked by email string only (session.ts:277-279) — email renames
  silently break profile links.
- `.env.local` holds a live rw Turso token (gitignored) — rotate (review closing note).
- e2e global-setup migrates+seeds the same DATABASE_URL target (global-setup.ts:11-33); snapshot copy
  exists (:36-43) but restore path is unwired (review C8 tail).
- Hygiene (T0.1): `local*.db` gitignored; `.env.example` tracked with placeholders only.

## Changelog
- 2026-08-21: S10 added sessions table (migration 0006) + PRAGMA fix; T0.1 restored .env.example to VCS.
  Sources: reports S10/T0.1; docs/reviews/2026-08-21-full-codebase-review.md.
