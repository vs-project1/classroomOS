# Domain Brief: Sessions (Class Sessions)

## Purpose
NOT auth sessions (see authentication.md). This is the class-session logger: one action atomically writes
class_sessions + lecture_logs + homework + attendance for a subject/date. Worst pre-remediation attack
surface (review C1 tail).

## Key files
- `src/features/sessions/actions/session-actions.ts` — createSession (:69), SessionSchema (:40s),
  integrity checks (:114-144), transaction (:147-190)
- `src/db/schema.ts` — classSessions (:70), lectureLogs, attendance; unique index
  idx_class_sessions_subject_date (:85)
- `src/app/(cr)/cr/log-session/page.tsx` — CR entry point (nav link added by B12)
- `src/app/(student)/sessions/{page,[id],new}/page.tsx` — read/create surfaces

## Invariants
1. `await requireAuth(["CR","TEACHER","ADMIN"])` is the FIRST statement, outside/above all try blocks
   (session-actions.ts:69-70) — matches rbac.ts canCreateSessions true only for ADMIN/TEACHER/CR
   (:24,:37,:50) — post-A5. STUDENT denied regardless of UI.
2. NEXT_REDIRECT digest rethrow guard at the top of the transaction catch (session-actions.ts:192-195) so
   any future redirect inside try cannot be silently converted to a form error — defense-in-depth from A5.
3. All four inserts run in ONE transaction (session-actions.ts:147-190): no partial class-session state.
4. Duplicate subject/date hits the UNIQUE index → friendly message (:197-199).

## Known sharp edges (UNFIXED)
- Roster = entire school (review CRITICAL tail): fetches ALL students (session-actions.ts:126) and
  requires the submitted set to match exactly (:142-144) — a CR must mark attendance for every student in
  school regardless of subject enrollment. No enrollment check exists anywhere in the flow.
- Time inputs are stringly normalized before zod (parseAndNormalizeTime :74-75); cross-browser format
  drift is only as good as the schema's string checks.
- revalidatePath("/sessions") (:203) targets routes that exist under `(student)/sessions` (verified) but
  admin/teacher visibility of fresh data after logging is UNVERIFIED.

## Changelog
- 2026-08-21: A5 closed the worst C1 instance (unauthenticated class-wide writes). Sources: report A5;
  docs/reviews/2026-08-21-full-codebase-review.md.
