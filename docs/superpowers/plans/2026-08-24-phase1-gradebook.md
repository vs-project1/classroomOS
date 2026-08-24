# Phase 1: Gradebook + Report Cards — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Weighted gradebook aggregating existing homework scores + exam results per subject/semester, with configurable weights & grade scales, teacher grid, student "My Grades", and printable report card.

**Architecture:** Pure compute module (`compute.ts`, no DB imports) fed by a Drizzle query layer; server-rendered grids via RSC queries, mutations via server actions. No persisted computed grades in v1 — live computation with coverage warnings.

**Tech Stack:** Next.js 15 App Router (verify APIs against `node_modules/next/dist/docs/`), Drizzle/SQLite, Tailwind v4 print-CSS.

**Spec:** Council consensus from 2 blueprints (big-pickle + mimo). Key agreements: live-compute over snapshot tables; absent≠missing≠zero (3 states); weight renormalization with `coverage` flag; single rounding rule (float internally, round at band lookup, format at render).

## Global Constraints
- Free tier only; no new paid deps. Print via CSS (`window.print()`), no PDF service.
- SQLite CHECK/enum limits: validate enums in Zod at every action boundary.
- All grades scoped by academic session; NULL sessionId rows treated as current session.
- Authz: TEACHER only owns subjects where `subjects.teacherId` matches their teachers.id (linked by email); ADMIN global; STUDENT only own data; publish gate enforced server-side.
- Verify `revalidatePath` semantics and async searchParams against bundled Next docs before page shells.

### Task 1: Schema + migration

**Files:**
- Modify: `src/db/schema.ts`
- Create: `drizzle/0011_gradebook.sql` + journal entry (idx 11)

Tables:
```ts
gradeScales(id autoincrement, name, displayMode 'percentage'|'letter'|'gpa', isActive bool default false)
gradeBands(id, scaleId FK cascade, label text, minPercent real, gradePoint real null, isPassing bool default true, UNIQUE(scaleId,minPercent))
subjectGradeWeights(id, subjectId FK cascade, category text check IN ('homework','unit_test','midterm','pre_board','practical','final'), weightPct real, UNIQUE(subjectId,category))
termConfigurations(id, academicSessionId FK unique, scaleId FK, includeHomework bool, includedExamTypes json, areGradesPublished bool default false, publishedAt ts null)
```
Also add to `homework`: `maxScore integer NOT NULL DEFAULT 100`.

- [ ] Add schema, run `npm run db:generate`, review SQL, apply via `npm run db:migrate`
- [ ] Seed: one letter scale (A+ 90/4.0 …) active + term config for current session
- [ ] Commit `feat(gradebook): schema for scales, bands, weights, term config`

### Task 2: Pure compute + scale libs (TDD)

**Files:**
- Create: `src/features/gradebook/lib/types.ts`, `constants.ts` (GRADE_CATEGORIES, DEFAULT_WEIGHTS), `compute.ts`, `scale.ts`
- Test: `src/features/gradebook/lib/compute.test.ts`

Compute rules (council consensus):
- homework component = mean of `(score/maxScore)*100` over submissions with status `graded|late`; missing/ungraded excluded from numerator AND denominator ("N/M graded")
- each included exam type = mean of `obtainedMarks/totalMarks*100`; `isAbsent=true` excluded + flagged "AB"; no row flagged "—"
- empty components → null; renormalize weights over available; result carries `coverage` (% of configured weight backed by data)
- finalPct null when nothing available; never NaN into JSX
- band lookup on `Math.round(pct*100)/100`, bands sorted desc by minPercent
- unit tests: empty inputs, all-absent, Σweights≠100 tolerance (99.99–100.01), boundary 89.95→round→band, late inclusion

- [ ] Write failing tests, implement, pass
- [ ] Commit `feat(gradebook): pure computation engine`

### Task 3: Query layer

**Files:** Create `src/features/gradebook/lib/queries.ts`
- `getGradebookGrid(subjectId)` → students (enrollments join profiles, order rollNumber) × category inputs + finals
- `getMyGrades(studentUserId)` → per-subject breakdown; **throws/blocks unless `areGradesPublished`**
- `getReportCard(studentId)` → DTO incl. attendance % (reuse formula consistent with what-if calculator: `(present+late)/(total-excused)`)
- [ ] Implement + commit `feat(gradebook): query layer`

### Task 4: Server actions

**Files:** Create `src/features/gradebook/actions/{grade-scales.ts,subject-weights.ts,term-config.ts}`
- Signatures: `saveSubjectWeights(subjectId, weights[])` Zod Σ=100±0.01; `activateGradeScale(id)` tx swap; `publishGrades(sessionId)`/`unpublishGrades`
- Every action: zod → role guard (TEACHER ownership via subjects.teacherId / ADMIN) → tx → revalidatePath
- [ ] Implement + commit `feat(gradebook): actions`

### Task 5: Teacher UI

**Files:** Create `src/features/gradebook/components/{gradebook-grid.tsx,weight-editor.tsx}`; routes `/teacher/gradebook/page.tsx` (+ settings)
- Server-rendered table: rows=students, cols=categories+Final%+Letter+coverage ⚠️ badge; `<details>` cell drill-down linking to source homework/exam
- [ ] Implement + commit `feat(gradebook): teacher grid + weights editor`

### Task 6: Student UI + report card

**Files:** Create components `{subject-grade-card.tsx,report-card.tsx,print-button.tsx}`; routes `/my-grades/page.tsx`, `/my-grades/report-card/page.tsx`
- Unpublished state = explicit "Results not yet published" (server-enforced)
- Print CSS: chrome `print:hidden`, card `print-color-adjust:exact`, `@page{margin:12mm}`, force light-mode values inside card
- [ ] Implement + Playwright spec `tests/e2e/gradebook.spec.ts` (grid seeded fixture, Σ≠100 blocked, pre-publish block, post-publish visible, print emulation)
- [ ] Commit `feat(gradebook): student grades + printable report card`
