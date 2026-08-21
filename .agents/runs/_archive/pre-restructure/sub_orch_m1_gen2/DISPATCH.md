# Milestone 1: Database Schema Extension & Seeding Infrastructure

## Mission
Complete the verification gate for Milestone 1 (Database Schema Extension & Seeding Infrastructure), certify all 31 verification tests, seeder, types, review reports, empirical challenger assertions, and forensic integrity audit, then update PROJECT.md milestone status to DONE and hand off.

## Context & Inputs
- Authoritative User Request: `D:\CLASSROOM OS\.agents\ORIGINAL_REQUEST.md`
- Project Specifications & Architecture: `D:\CLASSROOM OS\PROJECT.md`
- Worker 1 Implementation Handoff: `D:\CLASSROOM OS\.agents\m1_worker_1\handoff.md`
- Implemented Schema: `src/db/schema.ts` (23 tables, relations, types)
- Implemented Verification Suite: `scripts/verify-db.ts` (7 suites, 31 tests)
- Implemented Seeder: `src/db/seed.ts` (Full academic semester dataset)

## Your Task
1. Read the input files above.
2. Initialize your BRIEFING.md, SCOPE.md, and GATE_STATUS.md in `D:\CLASSROOM OS\.agents\sub_orch_m1_gen2`.
3. Dispatch 2 Reviewers, 2 Challengers, and 1 Forensic Auditor (`teamwork_preview_auditor`) to verify:
   - Reviewer 1: Schema design, relations, TypeScript types, and compliance with ORIGINAL_REQUEST.md and PROJECT.md.
   - Reviewer 2: Database integrity, SQLite CHECK constraints, composite UNIQUE indexes, foreign key CASCADE/SET NULL actions, and transaction rollback.
   - Challenger 1: Empirical execution of `npm run db:verify`, constraint violations, negative tests.
   - Challenger 2: Empirical execution of `npm run db:seed`, `npx tsc --noEmit`, migration drift check `npm run db:generate`.
   - Forensic Auditor: Anti-cheating verification, ensuring genuine SQLite engine constraints, real migrations, and genuine seeder records (no dummy stubs or fake assertions).
4. Evaluate gate verdicts in `GATE_STATUS.md` (Forensic Auditor CLEAN, all Reviewers APPROVE, all Challengers APPROVE).
5. If any changes are needed, spawn a Worker to fix them.
6. When gate passes, write `handoff.md` in your directory and report completion to parent (`80c1ff19-33dc-4507-b232-1fdadb07c472`).
