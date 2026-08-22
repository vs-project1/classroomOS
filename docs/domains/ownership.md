# Domain Brief: Ownership (Authorization & Scoping)

## Purpose
Invariants added this cycle (commit 3ff8178 "fix: security ownership enforcement, auth dedup, and
a11y remediation batch") so that **role ≠ scope**: every surface restricts rows to what the caller
owns or is enrolled in, and fails closed when identity can't be resolved. Review basis:
docs/reviews/2026-08-21-full-codebase-review.md (C1/identity-fallback findings).

## THE rule: navigation is not a boundary
Chrome and nav links are UX only (app-shell.tsx:16-18). Every protected surface must enforce its
own check server-side. Layering:
1. `proxy.ts` — edge gate: `/admin/*` requires role ADMIN or redirect `/` (:106-111); unauth →
   `/login`; quarantine (`mustChangePassword`) → `/change-password` (:76-82). Matcher covers all
   routes (:119-123).
2. Layouts — `requireAuth(role matrix)` per route group (see navigation.md).
3. Pages/actions — ownership checks below. A missing #3 is a bug even if #1/#2 pass.

## Enforcement points
| Surface | Rule | Evidence |
|---|---|---|
| `/subjects/[slug]` enrollment wall | STUDENT/CR must have an enrollment row for the subject; if the student profile can't be resolved → access DENIED (fail-closed), rendered 403 card | src/app/(student)/subjects/[slug]/page.tsx:145-174 |
| Sidebar subjects | TEACHER → assigned subjects; STUDENT/CR → enrollment-scoped; zero enrollments ⇒ `[]`, **never** the full catalog; ADMIN → all | src/features/subjects/queries.ts:21-57 (comment :39-41) |
| Session create | Shared `getSubjectAccessError`: TEACHER = assigned subjects only (:103-108), CR = enrolled subjects only (:110-124), ADMIN unrestricted by design (:99-101); default deny :126 | src/features/sessions/actions/session-actions.ts:94-127 |
| Roster fetch | `getStudentsBySubject` applies the same ownership gate before returning students | session-actions.ts:142-145 |
| `/sessions/new` page guard | Page-level `requireAuth(["CR","TEACHER","ADMIN"])` beyond layout (defense in depth) | src/app/(student)/sessions/new/page.tsx:13 |
| Subject picker scoping | TEACHER/ADMIN → assigned; CR → enrolled; empty ⇒ "Missing Prerequisites" screen, never global list | sessions/new/page.tsx:19-43, :45-62 |
| Submission detail `/homework/submissions/[id]` | STUDENT/CR: own submissions only, 403 otherwise (:39-75); TEACHER: submissions whose subject they teach (:79-97); ADMIN: all | src/app/(student)/homework/submissions/[id]/page.tsx |

## Fail-closed pattern
Where identity resolution can fail, denial is the fallback — e.g. enrollment wall renders 403 when
`resolveCurrentStudent()` returns null ([slug]/page.tsx:148-158); sidebar returns `[]`
(queries.ts:43-44). Never fall back to a wider query to "be helpful".

## Known gaps (UNFIXED — do not document as solved)
1. **Subjects grid still leaks the catalog.**
   `src/app/(student)/subjects/page.tsx:57-79`: when enrollments resolve to zero rows the grid
   falls back to querying ALL subjects ("Fallback" comment :57). This contradicts the fail-closed
   invariant that sidebar/grid never fall back to global catalogs. Mitigation is partial only:
   clicking through hits the `[slug]` enrollment wall, but names/codes/faculty of unenrolled
   subjects still render. Fix belongs in this page, not the sidebar.
2. Same degenerate-fallback shape exists on `/lecture-logs` (empty `enrolledSubjectIds` ⇒ unscoped
   where-clause) — see class-history.md.

## Sharp edges
- ADMIN intentionally bypasses subject ownership everywhere (sessions carry no teacherId;
  session-actions.ts:92) — don't "fix" this without redesign.
- `requireAuth` wrong-role redirects go to role home (session.ts:322-331): STUDENT→`/`,
  CR→`/cr`, TEACHER→`/teacher`, ADMIN→`/admin`. Tests rely on these destinations.

## Changelog
- 2026-08-21: review identified identity-fallback leaks (review C1 tail).
- 2026-08-22: commit 3ff8178 landed enrollment wall, session-create ownership, submission detail
  visibility, /sessions/new guard + scoped picker, sidebar fail-closed scoping, proxy admin gate.
