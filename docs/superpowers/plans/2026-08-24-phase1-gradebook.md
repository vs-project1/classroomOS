# Phase 1: Gradebook + Report Cards — Implementation Plan

> Council-synthesized (5 free models, chairman-resolved). Execute task-by-task; verify with `npx tsc --noEmit` after each.

**Goal:** Weighted gradebook over existing `exams`/`examResults`, admin grid + student view + printable report card.

**Architecture:** New `subject_grade_weights` table reusing the `examType` enum as category taxonomy. One pure compute module (`src/lib/grading/compute.ts`) is the single source of truth consumed by grid, student page, and report card. Report card via print-CSS (zero deps, free ethos — council split 2-2, chairman ruled print-CSS).

## Resolved Decisions
- **Weights: table, not JSON.** `UNIQUE(subjectId, category)`. Default seed per subject: unit_test 20, midterm 20, pre_board 20, practical 10, final 30.
- **Aggregation:** `categoryPct[c] = ΣobtainedMarks / ΣtotalMarks` across exams of category `c` where graded. `finalPct = Σ(pct_c × w_c) / Σ(w_c)` renormalized over categories having ≥1 graded exam.
- **Semantics:** `isAbsent=true` → excluded from numerator AND denominator, renders "AB". `obtainedMarks=null && !isAbsent` → "Pending", excluded from both, never coerced to 0. Reject absent+marks together in zod refine.
- **Homework scores stay OUT of v1 math** (completion, not weighted assessment).
- **Grade scale:** TS constant in `src/lib/grading/scale.ts` (A≥90, B≥80, C≥70, D≥60, F<60). Promote to table only when admins ask.
- **Term = semester** (aligns with `enrollments.semester`). No terms table (YAGNI).

## Tasks

### Task 1: Schema + migration
Add to `src/db/schema.ts`: `subjectGradeWeights` (id text PK, subjectId FK→subjects cascade, category text CHECK in examType values, weightPct int CHECK 0-100, UNIQUE(subjectId,category), timestamps). Run `npm run db:generate` then review SQL, `npm run db:migrate`.

### Task 2: Pure compute module
Create `src/lib/grading/compute.ts`: `computeSubjectGrade(studentId, subjectId): { finalPct: number|null, categories: Array<{category, pct, status:'graded'|'absent'|'pending'}>, letter }`. No IO inside math — fetch results first, pass arrays in. Unit-test the formula edge cases (all pending → null; absent-only category dropped from denominator).

### Task 3: Grade scale + zod schemas
`src/lib/grading/scale.ts` constant + `letterForPct(pct)`. Zod schema for weight upsert (weights must sum to 100 per subject) and exam-result save (absent XOR marks).

### Task 4: Server actions
`src/features/grades/actions.ts` ("use server"): `upsertWeights(subjectId, weights[])`, `saveExamResult(examId, studentId, data)`. Guards: ADMIN or owning TEACHER (`requireAuth(["ADMIN","TEACHER"])` + teacherId check). `revalidatePath`.

### Task 5: Admin gradebook grid
`src/app/(admin)/admin/gradebook/page.tsx` (server) + `src/components/gradebook/grade-grid.tsx` + `weight-editor.tsx` (client). Students × subjects matrix; cell = final% + letter + AB/Pending chips; click cell → drilldown of that student-subject's exams. Sticky headers.

### Task 6: Student My Grades
`src/app/(student)/my-grades/page.tsx` + `src/components/grades/subject-card.tsx`. Per enrolled subject: final%, letter, per-category contribution bars, exam list with obtained/total + flags. No class rank in v1.

### Task 7: Report card (print)
`src/app/report-cards/[studentId]/page.tsx` server component rendering semantic HTML report card (student info, per-subject rows: category breakdowns, weighted total, letter; attendance % from existing queries) + `print.css` (`@media print`, `@page { size: A4; margin: 12mm }`) + auto `window.print()` button. Access: ADMIN/TEACHER any student; STUDENT self only.

### Task 8: Seed defaults + verify
Backfill weights for existing subjects (seed script or action). Full verify: tsc, lint, e2e smoke of grid + my-grades + print page.
