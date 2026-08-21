# DISPATCH — 2026-08-15T12:47:27Z

You are Worker 1 for Milestone 1 (Database Schema Extension & Seeding Infrastructure).
Your working directory is: D:\CLASSROOM OS\.agents\m1_worker_1

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_preview_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

You MUST read:
- D:\CLASSROOM OS\.agents\ORIGINAL_REQUEST.md
- D:\CLASSROOM OS\PROJECT.md
- D:\CLASSROOM OS\AGENTS.md
- D:\CLASSROOM OS\.agents\AGENTS.md
- D:\CLASSROOM OS\.agents\sub_orch_m1\SCOPE.md
- D:\CLASSROOM OS\.agents\m1_explorer_1\analysis.md
- D:\CLASSROOM OS\.agents\m1_explorer_2\analysis.md
- D:\CLASSROOM OS\.agents\m1_explorer_2\proposed_verify_db.ts
- D:\CLASSROOM OS\.agents\m1_explorer_3\analysis.md

Your exclusive write ownership:
- D:\CLASSROOM OS\src\db\schema.ts
- D:\CLASSROOM OS\scripts\verify-db.ts
- D:\CLASSROOM OS\src\db\seed.ts
- D:\CLASSROOM OS\package.json
- (and generated drizzle migration files)

Tasks:
1. Implement all 10 new SQLite Drizzle tables, composite unique constraints, SQLite CHECK constraints, cascading foreign keys, updated relations, and inferred TypeScript types in `src/db/schema.ts` according to `m1_explorer_1/analysis.md`.
2. Update `scripts/verify-db.ts` according to `m1_explorer_2/proposed_verify_db.ts` to implement the comprehensive 7-suite verification covering:
   - Full lifecycle insertions & selection on all 23 tables
   - Negative CHECK constraint rejection tests
   - Negative composite UNIQUE constraint rejection tests
   - Foreign key CASCADE delete verification
   - Foreign key SET NULL verification
   - Transaction rollback test
   - Automated cleanup
3. Create `src/db/seed.ts` according to `m1_explorer_3/analysis.md`:
   - Admin account (default credentials with scrypt hash)
   - Teachers, CR, Students (with studentProfiles)
   - Subjects, Chapters, Weekly Routine
   - 45 historical Sessions with Lecture Logs
   - 360 Attendance records mapping students into 4 Barometer zones (Perfect, Safe, Caution, Danger)
   - 6 Assignments with Submissions across all states (`graded`, `submitted`, `draft`, `late`)
   - 3 Exams with 24 Exam Results
   - 8 Resources, 10 Study Tasks, 3 Notices, 3 Events, 12 Notifications, and 3 Attendance Correction Requests
4. Update `package.json` to register `"db:seed": "tsx --env-file=.env.local src/db/seed.ts"`.
5. Run commands to generate/apply migrations, verify the database, run the seed script, and check TypeScript compilation:
   - `npm run db:generate`
   - `npm run db:migrate` (or apply migrations to local db)
   - `npm run db:verify`
   - `npm run db:seed`
   - `npx tsc --noEmit`
6. Verify all commands execute with 0 errors and print clean output.
7. Write a detailed handoff report in `D:\CLASSROOM OS\.agents\m1_worker_1\handoff.md` documenting:
   - Exact changes made
   - Commands executed and their full outputs
   - Verification results
8. Send a message to your parent with your summary and handoff path.
