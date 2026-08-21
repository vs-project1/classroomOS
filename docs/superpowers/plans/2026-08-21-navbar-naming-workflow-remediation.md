# Navbar Naming & Workflow Remediation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Land the P0/P1 security-and-flow fixes found by the user-flow audit and make every navbar label, page heading, and workflow name consistent and truthful on branch `refactor/navbar-workflow-orchestrator`.

**Architecture:** Copy/label remediation plus small server-action fixes. No route renames, no schema changes, no new pages except none. Each task is independently committable and verifiable via `tsc`, ESLint, and the existing Playwright suite (`tests/e2e/*.spec.ts`).

**Tech Stack:** Next.js 16.2.10 (App Router, `src/proxy.ts` middleware convention), React 19, Drizzle ORM + libsql, Zod v4, Playwright, pnpm on Windows PowerShell.

**Spec:** The User-Flow Audit produced by the 8-probe orchestrator sweep (this session). Findings referenced below as F-xx match that audit's IDs.

## Global Constraints

- Roles are exactly `ADMIN | TEACHER | CR | STUDENT` (`src/db/schema.ts:238`). Never introduce new role strings.
- This Next.js version uses `src/proxy.ts` (not `middleware.ts`) — do not create middleware files.
- No route renames in this plan: URLs like `/homework`, `/lecture-logs` stay; only visible copy, headings, and link targets change.
- Canonical vocabulary (verbatim, case-sensitive):
  - Entity shown to users: **Assignment** (never "homework" in UI copy; DB table/routes keep `homework` internally).
  - Class meeting: **Session**. Written record: **Session Log** (singular), **Session Logs** (list). Never "Lecture Log(s)" in UI copy.
  - Create-session action label everywhere: **Log Session** (never "New Session", "Log a Session", "Log Class Session").
- Package manager is pnpm; shell is PowerShell — chain commands with `; if ($?) { }`, never `&&`.
- Every commit message: conventional style (`fix:`, `refactor:`), lowercase, imperative.

---

### Task 1: Commit the pending security remediation

The working tree carries an uncommitted security fix (adds `requireAuth(["CR","TEACHER","ADMIN"])` to `createSession` at `src/features/sessions/actions/session-actions.ts:70`, session revocation on account deactivation/reset, etc. from `.agents/runs/2026-08-21_security-remediation/`). At HEAD `b2aed45` any authenticated user could write sessions/attendance/homework (audit F-01).

**Files:**
- Modify (already modified on disk): `.gitignore`, `eslint.config.mjs`, `pnpm-workspace.yaml`, `src/features/assignments/actions/assignments.ts`, `src/lib/auth/index.ts`
- Add: `.env.example`

- [ ] **Step 1: Review the diff**

Run: `git diff --stat; git diff src/features/assignments/actions/assignments.ts src/lib/auth/index.ts`
Expected: guard additions (`requireAuth`, `getPermissions`) present; no secrets, no unrelated refactors.

- [ ] **Step 2: Verify types and lint pass**

Run: `npx tsc --noEmit; if ($?) { pnpm lint }`
Expected: both exit clean.

- [ ] **Step 3: Inspect .env.example for secrets before adding**

Run: `Get-Content .env.example`
Expected: variable names only (`SESSION_SECRET=` style placeholders), no real values. If any real secret appears, stop and redact first.

- [ ] **Step 4: Commit**

```bash
git add .gitignore eslint.config.mjs pnpm-workspace.yaml src/features/assignments/actions/assignments.ts src/lib/auth/index.ts .env.example
git commit -m "fix: enforce server-side role guards on session actions and commit security remediation"
```

---

### Task 2: Remove the first-student data-leak fallback in /homework

Audit F-02a: when a STUDENT/CR has no resolvable student profile, `src/app/(student)/homework/page.tsx:39-43` binds `studentId` to the **first student row in the DB**, exposing another student's submissions.

**Files:**
- Modify: `src/app/(student)/homework/page.tsx:39-43`
- Test: `tests/e2e/homework-submissions.spec.ts` (existing spec must stay green)

**Interfaces:**
- Consumes: existing `resolveCurrentStudentId` pattern used by sibling pages.
- Produces: page renders an explicit empty state instead of foreign data.

- [ ] **Step 1: Delete the fallback block**

Remove exactly these lines (verified on disk):

```tsx
// Fallback to first student if running demo or test without explicit student profile
if (!studentId && (!user || user.role === "STUDENT" || user.role === "CR")) {
  const firstStudent = await db.query.students.findFirst();
  if (firstStudent) studentId = firstStudent.id;
}
```

- [ ] **Step 2: Render an honest empty state when studentId is still null**

Immediately after the removed block, add:

```tsx
if (!studentId && (user?.role === "STUDENT" || user?.role === "CR")) {
  return (
    <div className="flex-1 space-y-6 max-w-2xl">
      <h1 className="text-2xl font-semibold tracking-tight">Assignments</h1>
      <p className="text-sm text-muted-foreground">
        No student profile is linked to your account yet. Ask the college
        administration to link your login to a student record.
      </p>
    </div>
  );
}
```

- [ ] **Step 3: Verify**

Run: `npx tsc --noEmit; if ($?) { pnpm lint }; if ($?) { pnpm test:e2e --grep homework }`
Expected: tsc/lint clean; homework spec passes.

- [ ] **Step 4: Commit**

```bash
git add src/app/(student)/homework/page.tsx
git commit -m "fix: stop falling back to first student's data on homework page"
```

---

### Task 3: Require current password in change-password

Audit F-04/F-18: `currentPassword` is optional (`src/features/auth/actions/auth.ts:110`) and verification is skipped when absent (`auth.ts:170-178`), so any logged-in user rotates their password without proving the current one.

**Files:**
- Modify: `src/features/auth/actions/auth.ts:108-128,139-143,170-178`
- Modify: `src/features/auth/components/change-password-form.tsx:39-46` (input lacks `required`)
- Test: `tests/e2e/auth-lifecycle.spec.ts`

**Interfaces:**
- Consumes: `verifyPassword(currentPassword, hash)` (existing import in auth.ts).
- Produces: unchanged `AuthActionResult` shape — no callers need updates.

- [ ] **Step 1: Make the field mandatory in the schema**

In `changePasswordSchema`, replace:

```ts
currentPassword: z.string().optional(),
```

with:

```ts
currentPassword: z.string().min(1, "Current password is required"),
```

and replace the second refine's condition/message:

```ts
.refine((data) => data.newPassword !== data.currentPassword, {
  message: "New password must differ from current password.",
  path: ["newPassword"],
})
```

- [ ] **Step 2: Stop defaulting the field to undefined**

Replace line 140 with:

```ts
currentPassword: formData.get("currentPassword")?.toString() || "",
```

- [ ] **Step 3: Always verify — remove the conditional**

Replace the `if (currentPassword) { ... }` block (lines 170-178) with an unconditional check:

```ts
const isCurrentValid = await verifyPassword(currentPassword, dbUser.passwordHash);
if (!isCurrentValid) {
  return {
    success: false,
    message: "Current password is incorrect.",
  };
}
```

- [ ] **Step 4: Mark the input required in the form**

In `change-password-form.tsx`, add `required` to the current-password `<Input>` (the one labelled `"Current Temporary Password"` — also rename that label to `"Current Password"` for vocabulary consistency).

- [ ] **Step 5: Update e2e expectations and verify**

Open `tests/e2e/auth-lifecycle.spec.ts`; update any assertion that submits an empty current-password field to expect the error `"Current password is required."` instead of success.

Run: `npx tsc --noEmit; if ($?) { pnpm lint }; if ($?) { pnpm test:e2e --grep auth }`
Expected: all green.

- [ ] **Step 6: Commit**

```bash
git add src/features/auth/actions/auth.ts src/features/auth/components/change-password-form.tsx tests/e2e/auth-lifecycle.spec.ts
git commit -m "fix: require and verify current password before rotation"
```

---

### Task 4: Carry sessionDate from Today into Log Session

Audit (STUDENT-FLOW 1b): `src/app/(student)/today/page.tsx:312` links `/sessions/new?sessionDate=YYYY-MM-DD`, but the page/form ignore `sessionDate`, so logging from a past day silently records today's date.

**Files:**
- Modify: `src/app/(student)/sessions/new/page.tsx:53-58`
- Modify: `src/features/sessions/components/session-form.tsx:26-31` and the date `<Input>` (~line 109)

**Interfaces:**
- Produces: `defaultValues.sessionDate?: string` accepted by `SessionForm`.

- [ ] **Step 1: Extend the Props type**

In `session-form.tsx`, replace the `defaultValues` type with:

```ts
  defaultValues?: {
    subjectId?: string;
    startTime?: string;
    endTime?: string;
    routineId?: string;
    sessionDate?: string;
  };
```

- [ ] **Step 2: Prefer the passed date over today**

Find the date input rendered with `type="date"` whose value/default derives from `getNepalDateString()` (~line 109) and change its value expression to:

```ts
value={defaultValues?.sessionDate || watchedSessionDate || getNepalDateString()}
```

(Keep whatever local watch/state binding already exists — only prepend the `defaultValues?.sessionDate ||` check so an explicit param wins.)

- [ ] **Step 3: Read the param in the page**

In `sessions/new/page.tsx`, extend the `defaultValues` object passed to `<SessionForm>`:

```ts
        defaultValues={{
          subjectId: typeof params.subjectId === 'string' ? params.subjectId : undefined,
          startTime: typeof params.startTime === 'string' ? params.startTime : undefined,
          endTime: typeof params.endTime === 'string' ? params.endTime : undefined,
          routineId: typeof params.routineId === 'string' ? params.routineId : undefined,
          sessionDate: typeof params.sessionDate === 'string' ? params.sessionDate : undefined,
        }}
```

- [ ] **Step 4: Verify manually via Playwright trace or dev server**

Run: `pnpm dev` then open `/today?date=<a past date>`, click **Log Session**, confirm the date input shows the past date. Then `npx tsc --noEmit`.

- [ ] **Step 5: Commit**

```bash
git add "src/app/(student)/sessions/new/page.tsx" src/features/sessions/components/session-form.tsx
git commit -m "fix: honor sessionDate query param when logging a session from Today"
```

---

### Task 5: Fix admin post-create redirects and stale revalidations

Audit F-10 + ADMIN-CRUD #9: admins creating notices/events/homework get ejected to student pages; revalidations target non-existent routes.

**Files:**
- Modify: `src/features/notices/actions/notice-actions.ts:58` — `redirect("/notices")` → `redirect("/admin/notices")`
- Modify: `src/features/events/actions/event-actions.ts:87` — `redirect("/events")` → `redirect("/admin/events")`
- Modify: `src/features/assignments/actions/assignments.ts:272` — `redirect("/homework")` → `redirect("/admin/homework")`
- Modify: `src/features/users/actions/student-actions.ts:88,136` — `revalidatePath("/students")` → `revalidatePath("/admin/students")`
- Modify: `src/features/subjects/actions/create.ts:51` — `revalidatePath("/subjects")` → `revalidatePath("/admin/subjects")`

- [ ] **Step 1: Apply the five single-line replacements above** (each cites its current exact string; use Edit with the old URL string plus enough surrounding context to be unique).

- [ ] **Step 2: Grep for leftovers**

Run: `rg -n "revalidatePath\(\"/(students|subjects|notices|events|homework)\"|redirect\(\"/(notices|events|homework)\"" src/features`
Expected: no matches outside `(student)` feature actions that legitimately target student routes.

- [ ] **Step 3: Verify and commit**

Run: `npx tsc --noEmit; if ($?) { pnpm test:e2e --grep admin }`

```bash
git add src/features
git commit -m "fix: return admins to admin console after creates; revalidate real admin paths"
```

---

### Task 6: Unify session vocabulary and remove the duplicate /sessions list page

Audit F-07/F-08 + NAV-NAMING: `/lecture-logs` and `/sessions` render near-identical lists under identical `"Lecture Logs"` h2s; creation flow uses three different names; two dead/misleading links exist. `/sessions` list has zero inbound nav links — delete it, keep `/sessions/[id]` detail (it is the redirect target of `createSession`).

**Files:**
- Delete: `src/app/(student)/sessions/page.tsx`
- Modify: `src/app/(student)/sessions/[id]/page.tsx:53` — back-arrow `href="/sessions"` → `href="/lecture-logs"`
- Modify: `src/app/(student)/sessions/new/page.tsx:45` — same back-arrow change; `:18` h2 `"Log Session"` stays (already canonical); `:32-34` dead `href="/students"` → `href="/admin/students"` with label `"Register Student"`
- Modify: `src/app/(student)/subjects/[id]/page.tsx:167-172` — button `"View Routine"` retarget `href="/today"` → `href="/routine"`
- Rename copy: `"Lecture Logs"` → `"Session Logs"` and `"Lecture Log"` → `"Session Log"` in:
  - `src/app/(student)/lecture-logs/page.tsx:24` (h2) and `:64` (`"Read Log"` → `"View Session"`)
  - `src/app/(student)/sessions/[id]/page.tsx:69` (card title)
  - `src/lib/navigation.ts:16` and `:39` (nav item titles)
  - `src/features/sessions/components/session-form.tsx:78` helper text → `"Record session details and attendance in one go."`
  - `src/features/sessions/components/session-form.tsx:203` submit `"Log Class Session"` → `"Log Session"`
- Modify: `src/app/(cr)/cr/page.tsx:22` — `"Log a Session"` → `"Log Session"`
- Modify: `src/app/(student)/sessions/new/page.tsx:48` — h2 `"New Session"` → `"Log Session"`

- [ ] **Step 1: Apply every edit listed above** (delete file last among edits that reference it).

- [ ] **Step 2: Prove nothing else references the deleted list route**

Run: `rg -n 'href="/sessions"' src/ ; rg -n '"Lecture Log' src/`
Expected: zero matches (detail-route links like `/sessions/${id}` are fine).

- [ ] **Step 3: Check e2e specs for the deleted route or renamed strings**

Run: `rg -n "'/sessions'|\"Lecture Logs\"|Log a Session|New Session" tests/`
Expected: no matches; if a Page Object asserts an old string, update it to the canonical term from Global Constraints.

- [ ] **Step 4: Verify**

Run: `npx tsc --noEmit; if ($?) { pnpm lint }; if ($?) { pnpm test:e2e }`
Expected: full suite green.

- [ ] **Step 5: Commit**

```bash
git add -A src tests
git commit -m "refactor: unify session terminology and drop duplicate sessions list page"
```

---

### Task 7: Align Assignments copy (retire user-facing "Homework")

Audit F-06: nav says **Assignments**, headings/buttons say **Homework**/**Turn In**. Route `/homework` and DB stay untouched.

**Files (all copy-only):**
- `src/app/(student)/homework/submissions/[id]/page.tsx:82` — `"Back to Homework"` → `"Back to Assignments"`; `:69` `"Return to My Homework"` → `"Return to My Assignments"`
- `src/features/assignments/components/homework-client-workspace.tsx:316` — `"Homework & Assignments"` → `"Assignments"`; `:564` `"Turn In"` → `"Submit Assignment"` (matches `:301`)
- `src/app/(admin)/admin/homework/page.tsx:97` heading `"Assignments"` — already correct, no change (verify only)
- `src/app/(admin)/admin/homework/new/page.tsx` — ensure h2 reads `"Assign New Assignment"`; adjust if it says something else
- `src/features/assignments/actions/assignments.ts:176,220` — messages `"Assignment not found."` (keep), `"Assignment submitted successfully!"` (keep) — verify only

- [ ] **Step 1: Apply the edits; verify the two keep-as-is items**

- [ ] **Step 2: Sweep for stragglers**

Run: `rg -ni "homework" src/ --glob "*.tsx" | rg -v "route|import|from \"|db\.|schema|homework-client-workspace.tsx:|/homework"`
Expected: only code identifiers and route paths remain — no user-visible strings.

- [ ] **Step 3: Update e2e assertions referencing old strings, then verify**

Run: `rg -n "Turn In|Back to Homework|Homework &" tests/ ; npx tsc --noEmit ; pnpm test:e2e --grep homework`

- [ ] **Step 4: Commit**

```bash
git add src tests
git commit -m "refactor: standardize user-facing assignment vocabulary"
```

---

### Task 8: Align nav labels with destination headings

Audit F-09 mismatch pairs (nav source `src/lib/navigation.ts`; cheapest direction chosen per pair):

| Nav entry (line) | Destination h1/h2 | Change |
|---|---|---|
| Student `"Subjects"` (:12) | `"Enrolled Subjects"` (subjects/page.tsx:85) | nav → `"Subjects"`; heading → `"Subjects"` |
| Student `"Attendance"` (:15) | `"Attendance Records"` (attendance/page.tsx:143) | heading → `"Attendance"` |
| Teacher `"Today's Classes"` (:35) | `"Today's Schedule"` (today/page.tsx:148) | nav → `"Today's Schedule"` |
| Teacher `"Grade Submissions"` (:36) | `"Grading Dashboard"` (grading/page.tsx:18) | heading → `"Grade Submissions"` |
| Teacher `"Resources"` (:37) | `"Resources Dashboard"` (resources/page.tsx:18) | heading → `"Resources"` |
| Admin `"Dashboard"` (:23) | `"Command Center"` (admin/page.tsx:65) | heading → `"Dashboard"` |
| Admin `"Accounts & Auth"` (:24) | `"Account Management"` (accounts-client-console.tsx:175) | nav → `"Accounts"` |

**Files:** `src/lib/navigation.ts`, `src/app/(student)/subjects/page.tsx`, `src/app/(student)/attendance/page.tsx`, `src/app/(teacher)/teacher/grading/page.tsx`, `src/app/(teacher)/teacher/resources/page.tsx`, `src/app/(admin)/admin/page.tsx`, `src/components/admin/accounts-client-console.tsx`

- [ ] **Step 1: Apply the seven changes from the table.**
- [ ] **Step 2: Re-run the mismatch sweep**

Run: `rg -n "Command Center|Grading Dashboard|Resources Dashboard|Enrolled Subjects|Attendance Records|Today's Classes" src/`
Expected: zero matches.

- [ ] **Step 3: Update any e2e POM asserting old headings; run suite; commit**

Run: `rg -n "Command Center|Today's Classes" tests/ ; npx tsc --noEmit ; pnpm test:e2e --grep navigation`

```bash
git add src tests
git commit -m "refactor: align nav labels with page headings"
```

---

### Task 9: Align RBAC flags with reality

Audit F-13: `TEACHER.canCreateNotices: true` (`src/lib/auth/rbac.ts:40`) but `createNotice` requires `["ADMIN"]` (`notice-actions.ts:20`) — UI offers a button that always fails. (`canManageSubjects` intentionally stays `true`: teachers legitimately edit their own subjects' syllabus via `syllabus.ts` which allows `["TEACHER","ADMIN"]`; its missing ownership check is parked in Backlog.)

**Files:**
- Modify: `src/lib/auth/rbac.ts:40` — `canCreateNotices: true` → `canCreateNotices: false` (TEACHER block only)

- [ ] **Step 1: Flip the flag.**
- [ ] **Step 2: Confirm no teacher UI depended on it**

Run: `rg -n "canCreateNotices" src/`
Expected: rbac.ts definition + any notice-page gating; teacher pages must not render a "New Notice" affordance afterward (they gate on `permissions.canCreateNotices`).

- [ ] **Step 3: Verify and commit**

Run: `npx tsc --noEmit; if ($?) { pnpm test:e2e }`

```bash
git add src/lib/auth/rbac.ts
git commit -m "fix: revoke unimplemented teacher notice-creation permission flag"
```

---

### Task 10: Final verification sweep

- [ ] **Step 1: Vocabulary audit greps (expect zero hits)**

Run: `rg -n "\"Lecture Log|Log a Session|\"New Session\"|Turn In|Back to Homework|Command Center" src/`
Expected: no matches.

- [ ] **Step 2: Full gates**

Run: `npx tsc --noEmit; if ($?) { pnpm lint }; if ($?) { pnpm test:e2e }`
Expected: all green. If `responsive-navigation.spec.ts` or `typography-contrast.spec.ts` fail on renamed strings, update those specs to the canonical vocabulary and re-run.

- [ ] **Step 3: Summarize**

Post a short changelog comment listing each audit finding ID (F-01…F-13 covered here) and its resolving commit.

---

## Out of Scope / Follow-up Backlog (parked, with pointers)

These audit findings are real but are feature work beyond this branch's naming/workflow mandate — each needs its own mini-spec/plan:

1. **Grading write-back feature (P1)** — disabled `"Grade Now"` placeholder at `src/app/(teacher)/teacher/grading/page.tsx:86-89`; no `gradeSubmissionAction` exists anywhere; `assignmentSubmissions.grade/score/feedback/gradedBy/gradedAt` fields unused (`src/db/schema.ts:315-320`); graded results never rendered in `/homework/submissions/[id]`.
2. **CRUD completeness (P2)** — no student delete; no subject edit/delete; no notice/event content edit; homework status-only mutation; `updateAccountAction` (`accounts.ts:361`) is dead code; orphaned `/admin/teachers/[id]/edit` route.
3. **Syllabus ownership (P2)** — `addCourseUnit/Chapter/Material` (`syllabus.ts:24,74,126`) let any TEACHER mutate any subject's syllabus; mirror the ownership pattern of `resources.ts:44-50`.
4. **Proxy defense-in-depth (P2/P3)** — add `/teacher/*`, `/cr/*` prefix rules to `src/proxy.ts:105-113`; gate the `/events/new` page itself (action is guarded, page form is not).
5. **Teacher attendance/today views (P2)** — `/attendance` renders `"No Student Context Found"` for teachers (`attendance/page.tsx:15-28`); teachers need dedicated views.
6. **Mobile bottom-nav single-source (P3)** — `mobile-bottom-nav.tsx:8-13` duplicates its array instead of deriving from `navigation.ts`.
7. **Misc P3s** — hardcoded attendance threshold `80` twice in `attendance/page.tsx:54,106`; `submitAssignmentAction` can overwrite a graded submission (`assignments.ts:197,211`); `fileSize` never set by `createResourceAction`; `can()` helpers in `rbac.ts:98-141` and `lib/authorization/can.ts` are dead/conflicting code.
