## 2026-08-15T12:43:21Z
<USER_REQUEST>
You are Explorer 2 for Milestone 1 (Database Schema Extension & Seeding Infrastructure).
Your working directory is: D:\CLASSROOM OS\.agents\m1_explorer_2

You MUST read:
- D:\CLASSROOM OS\.agents\ORIGINAL_REQUEST.md
- D:\CLASSROOM OS\PROJECT.md
- D:\CLASSROOM OS\AGENTS.md
- D:\CLASSROOM OS\.agents\AGENTS.md
- D:\CLASSROOM OS\.agents\sub_orch_m1\SCOPE.md
- D:\CLASSROOM OS\scripts\verify-db.ts (or any existing scripts)
- D:\CLASSROOM OS\src\db\schema.ts
- D:\CLASSROOM OS\src\db\index.ts

Your mission:
1. Analyze `scripts/verify-db.ts` to understand how verification is currently implemented.
2. Design comprehensive automated test cases in `scripts/verify-db.ts` covering:
   - Lifecycle insertion & selection for all 10 new tables.
   - CHECK constraint violation tests (asserting database-level rejection for invalid roles, invalid status, invalid exam types, etc.).
   - Composite UNIQUE constraint violation tests (e.g. duplicate enrollment, duplicate submission per homework+student, duplicate exam_result, duplicate rollNumber, duplicate email).
   - Foreign Key cascade delete verification (e.g. deleting a user cascades to student_profile, deleting a subject cascades to exams/resources/enrollments, deleting an exam cascades to exam_results, etc.).
   - Foreign Key SET NULL verification (e.g. deleting a teacher sets gradedBy/uploadedBy to null, deleting a chapter sets chapterId to null).
3. Ensure the script can be executed with `npx tsx scripts/verify-db.ts` and prints clear PASS/FAIL assertions with non-zero exit code on failure.
4. Write your report in `D:\CLASSROOM OS\.agents\m1_explorer_2\analysis.md` and `handoff.md`.
5. Send a message to your parent with your summary and handoff path.
</USER_REQUEST>
