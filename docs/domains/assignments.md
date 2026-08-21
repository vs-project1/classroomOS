# Domain Brief: Assignments (Homework)

## Purpose
Homework creation (teacher/CR/admin), student submissions (draft → submitted/late → graded), and the
teacher grading dashboard.

## Key files
- `src/features/assignments/actions/assignments.ts` — createHomework (:230), updateHomeworkStatus (:278),
  saveSubmissionDraftAction (:76), submitAssignmentAction (:144), resolveCurrentStudentId (:40)
- `src/features/assignments/components/homework-client-workspace.tsx` — student UI; mock upload (:132-139)
- `src/app/(student)/homework/page.tsx` — student list with own submissions
- `src/app/(admin)/admin/homework/page.tsx` — admin list (permission-gated status actions :57)
- `src/app/(teacher)/teacher/grading/page.tsx` — grading dashboard

## Invariants
1. createHomework/updateHomeworkStatus begin with `await requireAuth(["TEACHER","CR","ADMIN"])` as the
   FIRST statement, before validation and outside try (assignments.ts:231,:282) — post-A1.
2. Student identity default-deny (post-T1.1): resolveCurrentStudentId throws "Student academic profile
   not found for this account." when unresolved (assignments.ts:70); both submission callers degrade to
   {success:false}. No arbitrary-student writes.
3. Draft saves never overwrite graded status (assignments.ts:113 keeps "graded").
4. Grading page is object-scoped: filter `subjects.teacherId = user.teacherId`
   (grading/page.tsx:37); no teacherId → explicit empty state (:15-24).

## Known sharp edges (UNFIXED unless noted)
- `(student)/homework/page.tsx:39-43` still falls back to FIRST student in DB when identity is unresolved,
  and :50-57 then serializes ALL students' submissions to the client — review C3 tail, flagged as T1.1
  residual #4. Highest-priority leftover in this domain.
- Resubmission flips graded→submitted keeping prior score fields (submitAssignmentAction sets status
  unconditionally, assignments.ts:189-201) — review IMPORTANT.
- Timezone mismatch: lateness compares server-local now vs stored dueDate (assignments.ts:179); dates
  inserted via new Date(string) (:256-257) — UTC-midnight vs NPT drift — review IMPORTANT.
- Mock upload: handleFileChange stores fake `https://utfs.io/f/mock-*` URL with zero validation
  (homework-client-workspace.tsx:132-139) — review IMPORTANT.
- updateHomeworkStatus catch swallows errors silently (assignments.ts:291-293).
- Role gate is coarse: no object-level check that the teacher actually teaches the subject
  (A1 residual #1).
- uploadthing route allows any file type (review; src/app/api/uploadthing/core.ts:12,:28) — UNVERIFIED this pass.

## Changelog
- 2026-08-21: A1 added action gates; T1.1 removed arbitrary-student write-as fallback. Sources: reports
  A1/T1.1; docs/reviews/2026-08-21-full-codebase-review.md.
