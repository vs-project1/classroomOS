# Full-Codebase Review — Classroom OS (2026-08-21)

7 parallel reviewers covered auth/security, DB layer, feature actions, admin pages, student/CR pages, teacher/shared UI, and tests/scripts/config. ~174 TS/TSX files.

**Verdict: Not production-safe.** The security model is perimeter-only: authorization lives in proxy.ts and hidden UI, while nearly every server action executes unauthenticated — a pattern Next 16's bundled docs explicitly warn against (`node_modules/next/dist/docs/.../proxy.md:219`).

## CRITICAL

1. **Server actions have no internal authorization (systemic)** — Only `accounts.ts` and `createSubject` check identity. Unauthenticated: createHomework/updateHomeworkStatus (`features/assignments/actions/assignments.ts:234,280`), notices CRUD (`notice-actions.ts:18,58,68`), events CRUD (`event-actions.ts:29,80`), routine CRUD (`routine-actions.ts:40,107`), teacher/student saves+deletes (`teacher-actions.ts:52,109`, `student-actions.ts:51,92`), syllabus edits (`subjects/actions/syllabus.ts:18,61,106`), and worst: createSession writes class-wide attendance (`session-actions.ts:68`). Action IDs ship in public bundles.
2. **getCurrentRole() fails open to ADMIN** — `lib/auth/index.ts:26-27`: no session + unset APP_ROLE ⇒ ADMIN permissions. Raw APP_ROLE cookie honored with no NODE_ENV gate (:20-24); DEMO_STUDENT_ID cookie likewise (:50-58) — direct IDOR.
3. **Identity fallbacks leak/write wrong students' data** — (student) pages unguarded, layout presentational; `resolveCurrentStudent()` falls back to first-student-alphabetically (index.ts:61-65); `resolveCurrentStudentId()` lets teachers/admins write submissions as arbitrary students (assignments.ts:71-72); homework page serializes ALL submissions when identity unresolved (homework/page.tsx:50-57).
4. **Attendance dispute ownership check discarded** — dispute.ts:90-95 verifies, :98 accepts any attendanceId anyway; cross-student disputes possible.
5. **Temp passwords ≈6 bits entropy via Math.random()** — password.ts:80-85: ~80 guesses own any fresh account; no login rate limiting (auth.ts:51-105).
6. **Sessions non-revocable 30-day HMAC blobs** — password change/reset/deactivation never evict tokens (auth.ts:199-203, accounts.ts:327-334,289-295).
7. **Change-password doesn't require current password** — optional field (auth-schema:110) → session theft = permanent takeover.
8. **Seed script can wipe live DB** — db/seed.ts:46-928 truncates all tables non-transactionally; package.json:14 wires it to .env.local pointing at remote Turso. Known seeded creds exempt from rotation. e2e global-setup migrates/seeds same live DB; snapshot/restore helper unwired.

## IMPORTANT

- **Data-wipe bugs**: teacher edit page omits faculties/semesters defaults (teachers/[id]/edit/page.tsx:38-45); semester format mismatch ("4th Semester" vs "IV") wipes semesters on edit-save.
- **Graded work tamperable**: resubmission flips graded→submitted keeping score (assignments.ts:193-205); drafts editable post-grade.
- **Broken navigation**: teacher sidebar → nonexistent /teacher/classes, /teacher/assignments; CR nav → /cr/classes, /cr/attendance; saveTeacher redirects to /teachers (404).
- **Corrupted Tailwind classes**: juCRify-between/CRicky/deCRructive (cr-topbar.tsx:9,26); juTRify-between/TRicky/deTRructive (teacher-topbar.tsx:9,26).
- **Fake homework upload**: stores mock utfs.io URL, no validation (homework-client-workspace.tsx:132-139); uploadthing blob route allows any file type (core.ts:12,28).
- **Timezone bugs**: due dates UTC-midnight vs server-local lateness check (assignments.ts:183,258); NPT helpers dead code; projection rounds before 80% eligibility test (attendance-projection.ts:66-81).
- **Session roster = entire school**: createSession requires marking all students regardless of enrollment (session-actions.ts:123-141).
- **DB integrity**: migration drift lost ON DELETE SET NULL for routine_id/teacher_id (drizzle/0002_*.sql:98,101); PRAGMA foreign_keys never pinned; triple student identity; teachers linked by email-string only.
- **Error handling**: raw error.message returned to clients; requireAuth inside try/catch swallows NEXT_REDIRECT (resources.ts:19-23,64-67); silent void returns on deletes.
- **Tests certify little**: tautological assertions (challenger-m2-stress.ts:236 asserts x===x); vacuous conditional test bodies; OR-weakened security checks; scripts pollute dev DB.
- **Hygiene**: .env.example gitignored+incomplete; local.test-seed.db not ignored; next.config.ts ignoreBuildErrors:true; missing force-dynamic on 3 admin pages + wrong revalidate targets; post-create redirects dump admins into student area; decorative no-op buttons; ~1,100 lines dead UI primitives; two conflicting dead can() modules; quadruplicated migration logic; admin KPI cards capped at 1.
- **Note**: .env.local holds a live rw Turso token (gitignored) — rotate.

## What's good

Scrypt hashing timing-safe; HMAC tokens fail closed on missing prod secret; open-redirect guarded; accounts module shows correct RBAC pattern (requireAuth + transactions + whitelisted serialization); schema CHECKs/uniques/indexes strong; grading/resources properly teacher-scoped; verify-db.ts and test-attendance-stress.ts excellent; strict TS, zero eslint suppressions.

## Recommended fix order

1. requireAuth([...]) in every server action + (admin)/(student)/(teacher) layouts; delete ADMIN-default and demo-cookie fallbacks.
2. Strong random temp passwords + login rate limiting + revocable sessions + mandatory current-password check.
3. Guard seed script to local file: URLs; isolate e2e DB; wire snapshot restore.
4. Fix data-wipe pair (teacher edit/semester formats), dispute ownership, graded-submission freeze.
5. Repair nav/routes/classname corruption, then sweep timezone math and vacuous tests.
