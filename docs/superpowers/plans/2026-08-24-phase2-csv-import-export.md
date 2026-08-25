# Phase 2: CSV Import/Export — Implementation Plan

> Council-synthesized (5 free models). Verify with `npx tsc --noEmit` per task.

**Goal:** Bulk-import students from spreadsheets with preview+error report; one-click CSV export of attendance, grades, notices.

## Resolved Decisions
- **Flow: upload → parse → validate → preview-with-errors → confirm commit.** All-or-nothing transaction (partial imports create "why is student X missing" support burden). Chunk inserts 500 rows/tx to avoid SQLite lock strain.
- **Parsing: papaparse**, dynamically imported server-side (`await import('papaparse')`) — handles quoted fields/CRLF/BOM that manual split breaks on.
- **Validation:** zod per-row + intra-batch dup check (Map by email/rollNumber) + DB uniqueness via batch `inArray` queries. Collect ALL errors as `{row, field, code, message}[]`, never fail-fast.
- **Passwords:** `crypto.randomBytes(9).toString('base64url')`, hashed with existing hashing scheme; `users.mustChangePassword=true` (column already exists). Never from CSV, never logged.
- **Export:** route handler `src/app/api/export/[type]/route.ts` returning `new Response(bom + csv, { headers: { 'Content-Type': 'text/csv; charset=utf-8', 'Content-Disposition': `attachment; filename="${type}-${date}.csv"` } })`. UTF-8 BOM `\uFEFF` prepended for Excel.

## Tasks

### Task 1: Parse + validate lib
`src/lib/csv/parse.ts` (papaparse wrapper) + `src/lib/csv/validate.ts` (zod `studentImportSchema`: email, rollNumber pattern, name, semester 1–8 coerce, faculty/section/batchYear optional) + DB uniqueness checks. Export types `ImportRowError`.

### Task 2: Import server action
`src/features/students/import-actions.ts`: `previewImport(formData)` returns `{rows, errors}`; `commitImport(rows)` runs in `db.transaction` — insert users (random pw), studentProfiles, enrollments if subject columns present. Guard `requireAuth(["ADMIN"])`.

### Task 3: Import UI
`src/app/(admin)/admin/students/import/page.tsx` + `src/components/admin/csv-importer.tsx` (client): dropzone, preview table with red error rows + tooltips, confirm dialog, success summary.

### Task 4: Shared export helper
`src/lib/csv/export.ts`: `toCsv(columns, rows)` + BOM handling.

### Task 5: Export routes
`src/app/api/export/[type]/route.ts` for `attendance | grades | notices` with drizzle joins (attendance→student→subject etc.). Guard ADMIN/TEACHER (teacher scoped to own subjects).

### Task 6: Export buttons
Add "Export CSV" buttons on admin attendance logs, gradebook grid, notices page.

### Task 7: Verify
tsc + lint + e2e smoke: import valid file, import file with duplicate rollNumber shows row error and commits nothing, exports download with BOM.
