# Phase 5: Teacher Role Hardening + Notifications — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:subagent-driven-development or executing-plans.

**Goal:** Make TEACHER least-privilege real (own-subject scoping across every action/page) and wire the existing-but-unused `notifications` table into bell UI with triggers.

**Architecture:** Central guard module `src/lib/authorization.ts` (getAuthContext resolves role + teacherId via teachers.email==users.email; assertTeacherOwnsSubject; assertTeacherCanAccessClassSession). Hybrid enforcement: guards at every server-action boundary + role-scoped queries in pages. Notifications: polling bell (30–60s) — SQLite has no LISTEN/NOTIFY; SSE/WebSocket explicitly out of scope.

**Spec:** Council blueprint (mimo). Audit-first approach: script/grep sweep of all actions BEFORE adding guards.

## Global Constraints
- users.role CHECK already includes TEACHER — NO constraint migration needed this phase (only needed if new roles added).
- Teacher↔user linkage is teachers.email == users.email (same pattern as files/authz.ts resolveTeacherId).
- Every guard failure throws typed AuthorizationError → action returns {ok:false,error} envelope consistent with repo convention.

### Task 1: Authz module + audit
**Files:** Create `src/lib/authorization.ts`; audit report `docs/reviews/authz-audit.md`
- Sweep: grep all `'use server'` files for missing role checks; grep pages querying without teacher filter. Document each finding as fix-list row.
- Helpers: getAuthContext(userId), assertRole(ctx, roles[]), assertTeacherOwnsSubject(ctx, subjectId), assertTeacherCanAccessStudent(ctx, studentId), assertTeacherCanAccessClassSession(ctx, sessionId)
- [ ] Commit `feat(authz): central authorization helpers + audit`

### Task 2: Action guards
Apply audit fix-list. Expected touchpoints:
- homework create/edit: allow ADMIN+TEACHER(owns subject); teacher creates homework for own subjects
- attendance write: ADMIN+TEACHER via assertTeacherCanAccessClassSession
- subjects/students/enrollments/classSessions lists & mutations: teacher-scoped reads, ADMIN-only writes
- notices/events publish: ADMIN only (teachers read)
- grading: ADMIN+TEACHER owns submission's subject
- [ ] Each feature committed separately `fix(authz): <feature> least-privilege`

### Task 3: Page-level scoping
Dashboard/subjects/students/homework/attendance/class-sessions pages: query filtered by ctx.role (ADMIN=all, TEACHER=subjects.teacherId=me, STUDENT=enrollments, CR=read-limited). Empty-state for teacher w/ no subjects.
- [ ] Commit `fix(authz): role-scoped page queries`

### Task 4: Notification triggers
Use EXISTING notifications table (verify columns first; type enum values per schema: system|assignment|attendance|notice|exam|correction_request).
Triggers: homework created → enrolled students' userIds (bulk insert); grade posted → that student; notice published → all active users (cap: skip if >500 recipients, use notice page instead); absence marked → student user (optional flag).
Helper: `createBulkNotifications(payloads)` single insert; fire AFTER primary tx commits (non-fatal on failure).
- [ ] Commit `feat(notifications): event triggers`

### Task 5: Bell UI
**Files:** `src/features/notifications/components/{notification-bell.tsx,notification-dropdown.tsx}`; actions getUnreadCount/getNotifications/markAsRead/markAllAsRead
- Bell in both student + admin topbars; badge count; dropdown lists latest 20, mark-all-read; 60s polling via setInterval; unread rows highlighted; icons per type
- Cleanup job note: delete notifications older than 90 days (documented; cron later)
- [ ] Playwright: trigger homework→student sees bell count; commit `feat(notifications): bell UI + polling`
