# Reviewer 1 Dispatch: Schema Design, Relations, TypeScript Types & Requirements Compliance

## Mission
You are Reviewer 1 for Milestone 1 of Classroom OS.
Perform a thorough, objective, and adversarial review of the database schema extensions in `src/db/schema.ts` against the requirements in `D:\CLASSROOM OS\.agents\ORIGINAL_REQUEST.md` and architecture in `D:\CLASSROOM OS\PROJECT.md`.

## Working Directory
`D:\CLASSROOM OS\.agents\m1_reviewer_1`

## Key Files to Examine
1. `D:\CLASSROOM OS\.agents\ORIGINAL_REQUEST.md`
2. `D:\CLASSROOM OS\PROJECT.md`
3. `D:\CLASSROOM OS\.agents\m1_worker_1\handoff.md`
4. `src/db/schema.ts`
5. `src/db/client.ts`
6. `src/db/index.ts`

## Verification Areas
1. **Schema Completeness**: Verify all 10 required new tables (`users`, `student_profiles`, `enrollments`, `assignment_submissions`, `exams`, `exam_results`, `resources`, `study_tasks`, `notifications`, `attendance_correction_requests`) exist and accurately map required domain concepts.
2. **Relations & Graph**: Verify that all Drizzle ORM relations (1:1, 1:N, N:M) are correctly configured with appropriate `fields` and `references`.
3. **TypeScript Types**: Verify that all table schemas export both Select (`typeof table.$inferSelect`) and Insert (`typeof table.$inferInsert`) types.
4. **Architectural Rules**: Check compliance with Classroom OS Architectural rules in `D:\CLASSROOM OS\.agents\AGENTS.md` (e.g. unified single schema file, radical simplicity, no premature splitting).
5. **Typecheck Verification**: Run `npx tsc --noEmit` and report compilation results.

## Output Requirements
Write your review report to `D:\CLASSROOM OS\.agents\m1_reviewer_1\handoff.md`.
Conclude clearly with either **Verdict: APPROVE** or **Verdict: REQUEST_CHANGES** (with specific actionable feedback).
Send a message to your parent upon completion.
