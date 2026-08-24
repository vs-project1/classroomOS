# Phase 2: CSV Import/Export — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:subagent-driven-development or executing-plans.

**Goal:** Bulk-import students (users+students+studentProfiles+enrollments atomically) and subjects/enrollments from CSV with dry-run preview + row-level errors; export buttons on every admin table.

**Architecture:** Shared CSV kernel (`csv-parse/sync` + `csv-stringify/sync`, MIT, Node-runtime) used by all importers; exports as Route Handlers (`GET`) returning streamed Response with BOM+CRLF for Excel. Imports via server actions (preview → commit two-step).

**Spec:** Council consensus (lightning + muse-spark + hy3). Decisions: csv-parse over papaparse (server-side single source of truth); BOM strip on parse / prepend on stringify; Excel row numbering (header=1, first data=2); errors downloadable as CSV.

## Global Constraints
- Free tier: csv-parse/csv-stringify only (no SaaS). Max 2000 rows/import (SQLite safety); chunk 500/tx if needed later.
- `runtime = 'nodejs'` on export route handlers (not Edge).
- Auth: every action/handler calls requireAdmin() first line; Playwright IDOR test.
- Never `split('\n')`; parser handles quoted commas/newlines/CRLF/BOM/delimiter-auto.

### Task 1: Kernel + templates

**Files:**
- Create: `src/lib/csv/parse.ts` (`parseCsv(text, zodSchema) → {data, errors}` w/ bom:true, trim, skip_empty_lines, header normalization `trim().toLowerCase().replace(/[\s_-]+/g,'')`)
- Create: `src/lib/csv/stringify.ts` (`toCsv(rows, columns)` — bom:true, quoted:true, `\r\n`)
- Test: kernel unit tests (BOM file, `"Doe, John"`, CRLF, semicolon delimiter)

- [ ] `npm i csv-parse csv-stringify`; implement + tests green
- [ ] Commit `feat(csv): parse/stringify kernel`

### Task 2: Student import (preview + atomic commit)

**Files:**
- Create: `src/features/students/actions/import-students.ts`
  - `importStudentsCsv(csvText, {dryRun}) : ImportResult`
  - `ImportResult = { success, imported, skipped, errors: {row, field?, code, reason}[] , preview? }`
  - Error codes: MISSING_COLUMN | INVALID_EMAIL | DUPLICATE_ROLL | DUPLICATE_EMAIL | FK_NOT_FOUND
  - Flow: zod per row → in-file Set dedupe → DB pre-check `WHERE email IN (...)` + rolls (no N+1) → if !dryRun: `db.transaction` sequential `for...of` inserts users(passwordHash temp, mustChangePassword=true) → students → studentProfiles → optional enrollments by subject code (pre-fetch Map). NO Promise.all inside tx.
  - Idempotency: `.onConflictDoNothing` on unique targets as safety net.
- Create: template route `src/app/api/admin/import/template/students/route.ts` (headers + 1 example row, BOM)
- Test: e2e `students-import.spec.ts` (happy, duplicate roll, BOM, quoted comma, non-admin 403)

- [ ] Implement, tests pass
- [ ] Commit `feat(students): atomic CSV bulk import with dry-run`

### Task 3: Subjects + enrollments import

**Files:** `src/features/subjects/actions/import-subjects.ts`, `src/features/enrollments/actions/import-enrollments.ts` (CSV keys: rollNumber+subjectCode+semester → resolve FKs; unknown subject = row error not crash)
- [ ] Reuse kernel; commit `feat(admin): subject + enrollment CSV import`

### Task 4: Export route handlers ×6

**Files:** `src/app/api/admin/export/{students,subjects,enrollments,attendance,grades,notices,events}/route.ts`
- Pattern: requireAdmin() → reuse existing list queries w/ filters → stream `'\uFEFF'+header+\r\n` then rows → headers `Content-Type: text/csv; charset=utf-8`, `Content-Disposition: attachment; filename="students-YYYY-MM-DD.csv"`, `Cache-Control: no-store`
- CSV-injection guard: prefix `'` for cells starting with `= + - @`
- [ ] Implement all + commit `feat(export): admin CSV exports`

### Task 5: Wizard UI + wiring

**Files:**
- Create: `src/components/csv/ImportWizard.tsx` (client: File/Paste tabs, template link, dryRun preview table Row|Field|Reason, error-CSV download button, confirm import), `src/components/csv/ExportButton.tsx` (plain `<a href>` — cookie auth automatic)
- Modify: admin students/subjects pages — add ImportWizard + ExportButton in page headers; attendance/grades/notices/events get ExportButton
- [ ] Wire up, manual Excel-open test (Windows), commit `feat(admin): import wizard + export buttons wired`
