# Domain Brief: Class History (/lecture-logs)

## Purpose
Per-student archive of logged class sessions: one row per `class_sessions` record joined to its
`lecture_logs` payload (topics/notes/homework), searchable and filterable by URL params.
Renamed from **"Session Logs"** → **"Class History"** this cycle (page h2
src/app/(student)/lecture-logs/page.tsx:76; nav labels student.ts:26, cr.ts:19, teacher.ts:19;
rename asserted by e2e TC-HISTORY-01, tests/e2e/class-history.spec.ts:10-19).

## Key files
| File | Role |
|---|---|
| `src/app/(student)/lecture-logs/page.tsx` | The page (178 lines). Shared surface: all 4 roles admitted (:18) |
| `src/app/(teacher)/teacher/lecture-logs/page.tsx` | 1-line mirror re-exporting the same component (:1) |
| `src/db/schema.ts` | `classSessions` (:71-88), `lectureLogs` (:90-102) |
| `src/features/sessions/actions/session-actions.ts` | Writer — atomic insert of session+log+homework+attendance (:250-295) |
| `tests/e2e/class-history.spec.ts` | Rename + q/subject filter coverage (TC-HISTORY-01..04) |

## Shipped URL contract (current code)
| Param | Semantics | Evidence |
|---|---|---|
| `q` | Case-insensitive substring over subject name + `topicsCovered` + `notes` + `homework` | :53-67 |
| `subject` | Exact subject id; dropdown options derive from the caller's own scoped history (never a global catalog) | :44-50, :56, select UI :94-107 |

Rows link to `/sessions/{id}` (:139-140); dates render in Asia/Kathmandu (:150).
Test hooks: `history-filters`, `history-search`, `history-subject`, `history-filter-btn`,
`history-clear-btn` (:81-127).

## Scope rules (as implemented)
1. `resolveCurrentStudent()` → enrollments → `enrolledSubjectIds` (:21-30) for STUDENT/CR.
2. Query filters `classSessions.subjectId IN enrolledSubjectIds` (:32-35).
3. **Sharp edge (leak):** the where-clause is `undefined` when the list is EMPTY — a caller with
   zero enrollments or no resolvable student profile (some TEACHER/ADMIN paths) fetches ALL
   sessions school-wide (:32-35). Same degenerate-fallback pattern as the subjects grid gap
   (see ownership.md). Unfixed at time of writing.

## PLANNED filter params (concurrent work — NOT yet in code)
The working tree only accepts `q`/`subject` (:13-15). The intended extended contract, being added
in parallel, is documented here so agents don't reinvent it. Each item below is **PLANNED until it
appears in `Props` (:13-15)**:

| Param | Intended semantics |
|---|---|
| `semester` | Matches the **caller's enrollment semester** (`enrollments.semester`, schema.ts:291, CHECK 1-8 :299) — not a free-text subject field. Students/CRs see their own cohort's history only. |
| `date` | Matches the **NPT calendar date** of `session_date`. Stored as timestamp (schema.ts:78); matching must bucket via Asia/Kathmandu like display does (:150) and `/today` does (today/page.tsx:30-50) — not naive UTC comparison. |
| `unit` | Substring match of **unit/chapter titles appearing in logged text** (`course_units.title` schema.ts:185+, `course_chapters.title` :202+ vs lectureLog topics/notes/homework). **No FK exists between units and sessions by design**: coverage is proven by text, so a unit filter can return sessions whose logged prose mentions the title without any relational link. |

## Data model invariants
- One log per session: `lecture_logs.class_session_id` UNIQUE FK, cascade delete (schema.ts:92-95).
- One session per subject/day: `unq_class_session_subject_date` (schema.ts:87); duplicate writes
  surface as friendly error (session-actions.ts:302-304).
- Session + log + homework + attendance commit atomically (session-actions.ts:250-295).

## Sharp edges
- Empty-scope leak above (unfixed).
- Teacher "mirror" route renders the identical student-scoped page — a teacher without a student
  profile sees the global list (same root cause). If teacher scoping lands, do it in the shared
  component, not the mirror file.

## Changelog
- 2026-08-22 (working tree, uncommitted): rename + q/subject search & filter landed; semester/
  date/unit documented as PLANNED per concurrent-work spec. Source: git diff on
  `(student)/lecture-logs/page.tsx`; tests/e2e/class-history.spec.ts.
