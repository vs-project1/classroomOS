# Reviewer 2 Dispatch: Database Integrity, CHECK Constraints, Composite UNIQUE & Cascades

## Mission
You are Reviewer 2 for Milestone 1 of Classroom OS.
Perform a thorough, objective, and adversarial review of database-level integrity in `src/db/schema.ts` and `scripts/verify-db.ts` to ensure constraints are enforced strictly at the SQLite engine level.

## Working Directory
`D:\CLASSROOM OS\.agents\m1_reviewer_2`

## Key Files to Examine
1. `D:\CLASSROOM OS\.agents\ORIGINAL_REQUEST.md`
2. `D:\CLASSROOM OS\PROJECT.md`
3. `D:\CLASSROOM OS\.agents\AGENTS.md` (Classroom OS Architectural Rules §2 Database Integrity)
4. `D:\CLASSROOM OS\.agents\m1_worker_1\handoff.md`
5. `src/db/schema.ts`
6. `scripts/verify-db.ts`
7. `drizzle/` migrations directory

## Verification Areas
1. **SQLite Engine-level CHECK Constraints**: Verify that enums (roles, submission statuses, exam types, task priorities/statuses, notification types, correction statuses) and numeric/logical boundaries (passMarks <= totalMarks, endTime > startTime, semester 1-8, non-negative scores) use native SQLite `sql` CHECK constraints in `src/db/schema.ts`, not just TypeScript or Zod.
2. **Composite UNIQUE Constraints**: Verify all multi-column unique constraints (e.g. `(studentId, subjectId)` in enrollments, `(homeworkId, studentId)` in submissions, `(examId, studentId)` in exam results, `(classSessionId, studentId)` in attendance) are properly defined.
3. **Foreign Key Integrity & Cascades**: Verify that foreign keys explicitly define deletion behavior (`onDelete: "cascade"` or `onDelete: "set null"`). Ensure subject/user deletion cascades downwards, and teacher/chapter deletion properly sets null on optional associations.
4. **Test Suite Completeness**: Inspect `scripts/verify-db.ts` to ensure it exercises full lifecycle, positive queries, negative constraint rejection, cascade deletions, set null actions, and atomic transaction rollback.
5. **Run Verification**: Run `npm run db:verify` and inspect the output.

## Output Requirements
Write your review report to `D:\CLASSROOM OS\.agents\m1_reviewer_2\handoff.md`.
Conclude clearly with either **Verdict: APPROVE** or **Verdict: REQUEST_CHANGES** (with specific actionable feedback).
Send a message to your parent upon completion.

## 2026-08-16T11:14:43Z
<USER_REQUEST>
You are Reviewer 2 for Milestone 1 of Classroom OS.
Your working directory is: D:\CLASSROOM OS\.agents\m1_reviewer_2
Read D:\CLASSROOM OS\.agents\m1_reviewer_2\DISPATCH.md, D:\CLASSROOM OS\.agents\ORIGINAL_REQUEST.md, D:\CLASSROOM OS\PROJECT.md, D:\CLASSROOM OS\.agents\AGENTS.md, D:\CLASSROOM OS\.agents\m1_worker_1\handoff.md, src/db/schema.ts, and scripts/verify-db.ts.
Conduct an objective and adversarial review of the database engine CHECK constraints, composite UNIQUE indexes, Foreign Key CASCADE and SET NULL actions, and verification coverage. Run `npm run db:verify` if needed.
Write your full review report to D:\CLASSROOM OS\.agents\m1_reviewer_2\handoff.md with a clear verdict (APPROVE or REQUEST_CHANGES) and send a message to your parent (conv id aa4feb8b-acba-481d-83d8-9c44f5c0e46b) when complete.
</USER_REQUEST>

