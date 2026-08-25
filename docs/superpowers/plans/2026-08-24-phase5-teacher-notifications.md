# Phase 5: Teacher Role Hardening + Notifications — Implementation Plan

> Council-synthesized (5 free models). Verify with `npx tsc --noEmit` per task.

**Goal:** Teachers see only their subjects everywhere; notifications fire on key events; bell with unread count.

## Resolved Decisions (security-critical)
- **Layouts are UX only.** Server actions bypass layouts entirely — every mutating teacher/admin server action MUST call a guard first line: `requireTeacher()` / `requireAdmin()`. Strong council consensus.
- **Central scope helpers:** `src/lib/auth/scope.ts` → `getTeacherScope()` cached via React `cache()` returning `{userId, role, teacherId}` (users↔teachers joined on email); `assertOwnsSubject(subjectId, teacherId)` throws on foreign subject — never trust client-passed IDs.
- **All queries filter by `inArray(subjects.id, ownSubjectIds)`** derived from session — one helper module (`src/lib/teacher-scope.ts`), refactor existing manually-scoped teacher pages onto it.
- **Notifications: same-transaction inserts** via `notifyMany()` inside the action's `db.transaction` (swallow notification errors so parent mutation never breaks). Triggers: homework created→enrolled students; grade posted→student; absence marked→student; notice/event published→class.
- **Bell: on-load indexed count** (`WHERE userId=? AND readAt IS NULL`, capped "99+"), `markRead` action + `revalidatePath`. NO polling/SSE/WebSocket at school scale.

## Tasks

### Task 1: Scope + guard lib
`src/lib/auth/scope.ts`: `getTeacherScope()`, `requireAdmin()`, `requireTeacher()`, `assertOwnsSubject()`. Unit tests: foreign-subject access throws.

### Task 2: Migration
Check `notifications` schema — add `readAt timestamp` + index `(userId, readAt)` if missing (existing table has read flag? verify during impl).

### Task 3: Refactor existing teacher pages
Replace ad-hoc `eq(subjects.teacherId, ...)` scatters in `(teacher)/teacher/*` pages with scope helpers. Verify each page loads scoped-only data.

### Task 4: Guard every action
Audit all server actions under admin/teacher features; add guards as first line. Integration test: TEACHER calling an admin action throws.

### Task 5: Notification triggers
Extend `src/lib/notifications.ts` (`notifyMany` inside transactions); wire into homework-create, grading, attendance-mark-absent, notice-publish actions.

### Task 6: Bell UI
Unread count in shell nav badge + `/notifications` page mark-read/mark-all actions wired to `revalidatePath`.

### Task 7: Verify
tsc, lint, e2e: teacher blocked from /admin/accounts, sees only own subjects, bell count increments when grade posted.
