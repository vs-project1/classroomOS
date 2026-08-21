# Classroom OS — Navigation & Information Architecture Design

**Date:** 2026-08-22
**Status:** Approved (user spec + audit-derived decisions)
**Scope:** Information-architecture refactor of navigation only. No backend/domain-logic changes.

---

## 1. Audit Summary (current state)

| Area | Finding |
|---|---|
| Route groups | `(auth) (student) (teacher) (cr) (admin)` + `api`. Root layout has fonts/globals only. |
| Shared routes | `(student)/layout.tsx` admits ALL 4 roles. Teacher group re-exports `/today`, `/attendance`, `/lecture-logs` as 1-line mirrors under `/teacher/*`. Subjects shared by same URL for all roles. Homework/notices/events duplicated student↔admin. |
| Nav definitions | `src/lib/navigation.ts`: flat `NavItem[]` per role (9/8/6/2 items). No sections, badges, children, or active-pattern typing. |
| Active state | `pathname === url || startsWith(url)` duplicated inline in 6 components with 6 variants. |
| Components | 3 near-identical ~200-line sidebars (student/teacher/CR) + admin `app-sidebar`; `mobile-navbar.tsx` = 9-item horizontal pill bar; `mobile-bottom-nav.tsx` exists but never rendered; shadcn `ui/sidebar.tsx` unused; `role-switcher.tsx` dead. |
| Breadcrumbs | None anywhere. |
| Badges | Only a static subjects-count pill. `notifications` table exists (indexed, seeded) but has zero consumers — no notifications UI/page exists. |
| Dead routes | `/admin/teachers/[id]/edit` orphaned; `/admin/attendance` missing from admin nav (reachable only via dashboard card). |
| Tests | Playwright-only (port 3001, isolated `local.test.db`, cookie-injection auth fixtures, serial workers). `responsive-navigation.spec.ts` asserts the OLD pill bar. No teacher or CR specs exist. |
| Next.js 16 traps | `params`/`searchParams` are promises (must await); `next build` ignores TS errors (`npx tsc --noEmit` is the real gate); `middleware`→`proxy` rename already applied in repo; Turbopack default. |

## 2. Core Decision: Role-Aware AppShell on the shared layout

The `(student)` route group is the de-facto shared surface. Instead of restructuring routes, its layout stops hardcoding student chrome and delegates to a server-side role-aware **AppShell**:

```
(student)/layout.tsx        → requireAuth(all roles) → <AppShell …>   ← /today, /subjects, /homework, /attendance, /lecture-logs, /notices, /events, /
(teacher)/teacher/layout.tsx → requireAuth([TEACHER, ADMIN]) → <AppShell …>
(cr)/cr/layout.tsx           → requireAuth([CR, ADMIN]) → <AppShell …>
(admin)/admin/layout.tsx     → requireAuth([ADMIN]) → <AppShell …>
```

AppShell picks sidebar/topbar/mobile-nav by `user.role`. Result: **any URL renders the correct role chrome** — teacher visiting `/today` gets teacher navigation; no leakage; zero domain-logic duplication; **no route moves required**.

## 3. Typed Navigation Model

```ts
// src/lib/navigation/types.ts
import type { LucideIcon } from "lucide-react";
export type UserRole = "STUDENT" | "TEACHER" | "CR" | "ADMIN";

export type NavBadgeKey = "assignmentsDue" | "pendingGrading";

export type NavItem = {
  label: string;
  href?: string;            // omitted → non-link section header use-case (unused today)
  icon: LucideIcon;
  badgeKey?: NavBadgeKey;
  activePatterns?: string[]; // extra hrefs that activate this item (segment-boundary match)
};

export type NavSection = {
  title?: string;            // undefined → top block (no heading)
  items: NavItem[];
};

export function isNavActive(pathname: string | null, href: string): boolean;
// "/" matches exactly "/"; otherwise exact match OR pathname === href OR
// pathname.startsWith(href + "/")  → segment-boundary safe.
```

Badge counts are resolved **server-side per request** by the layout via:

```ts
// src/lib/navigation/badges.ts   ("server-only" semantics; called from layouts)
export type NavBadges = Partial<Record<NavBadgeKey, number>>;
export async function getNavBadges(): Promise<NavBadges>;
// STUDENT → assignmentsDue: published homework for the student's enrolled subjects,
//           dueDate > now, no submission row by this student. Capped at 9+ at render time.
// TEACHER → pendingGrading: assignmentSubmissions status IN ('submitted','late')
//           joined to subjects where teacherId = user.teacherId.
// CR      → assignmentsDue (CRs are class members too; reuse student resolution when resolvable).
// ADMIN   → {} (no academic-participation counts).
```

Notification badges are intentionally **omitted**: the `notifications` table exists but no notification page/UI does. A bell linking nowhere would violate "no dead navigation items". The `NavBadgeKey` union can be extended later.

Role-specific trees live in separate files sharing only primitives:
`src/lib/navigation/student.ts`, `teacher.ts`, `cr.ts`, `admin.ts` (+ `index.ts` re-exporting a `getNavigationForRole(role)` map).

### 3.1 Student tree

```
(top)          Home / · Today /today
ACADEMICS      My Subjects /subjects · Assignments /homework [badge] · Attendance /attendance
CLASS          Routine /routine · Session Logs /lecture-logs
CAMPUS         Notices /notices · Events /events
footer card    BCA Program / TU FOHSS (existing static context) + Sign Out
```

Active patterns: My Subjects also activates on `/subjects/*` (automatic via matcher). Home only exact `/`.

### 3.2 Teacher tree

```
(top)          Home /teacher · Today /today
TEACHING       My Subjects /subjects (auto-scoped to assigned subjects) · Attendance /teacher/attendance
               Sessions /teacher/lecture-logs · Resources /teacher/resources
WORK           Grading /teacher/grading [badge: pendingGrading]
footer card    Teacher Portal / N Assigned Subjects (from subjects.length) + Sign Out
```

Grading is its own prominent section with a live count.

### 3.3 CR tree

```
(top)          Home /cr · Today /today
CLASS MGMT     Log Session /cr/log-session · Attendance /attendance · Session History /lecture-logs
MY CLASS       Subjects /subjects · Routine /routine
footer card    Class Representative + Sign Out
```

### 3.4 Admin tree

```
(top)          Dashboard /admin
PEOPLE         Students /admin/students · Teachers /admin/teachers · Accounts /admin/accounts
ACADEMICS      Subjects /admin/subjects · Assignments /admin/homework
CAMPUS         Notices /admin/notices · Events /admin/events
SYSTEM         Attendance Reviews /admin/attendance   ← fixes currently-orphaned page
footer card    Administrator Mode + Sign Out
```

### Deviations from the original brief (deliberate, documented)

1. **No standalone “Results” nav item** — graded scores already surface under Assignments (Graded tab) and subject workspace Assignments; no results table/route exists (“do not invent unsupported functionality”).
2. **No “Settings” item** — no settings route exists.
3. **No teacher “Assignments management” item** — homework CRUD lives in the admin console; teachers grade via `/teacher/grading`.
4. **No Exams & Results for admin** — unsupported by schema.
5. **No notification bell/badge** — see §3 rationale above.

## 4. Component Architecture

```
src/components/shell/
  app-shell.tsx          (server) receives { user, subjects, badges }; renders DesktopSidebar + ShellTopbar + MobileBottomNav + <main>; mobile drawer inside topbar
  desktop-sidebar.tsx    (client) generic renderer: brand header w/ portal label + sections + NavItem links + NavBadge + footer slot (context card + Sign Out form). Single implementation for all roles.
  shell-topbar.tsx       (client) sticky top bar: ☰ Sheet drawer (full role nav, replaces pill bar) · brand · ThemeToggle · Sign Out · avatar. Replaces student-topbar/teacher-topbar/cr-topbar/admin inline topbar.
  mobile-bottom-nav.tsx  (client) fixed bottom tab bar, 4 items per role + "More" opening a Sheet with remaining items. Replaces MobileNavbar pills.
  nav-badge.tsx          (client) count pill (renders only when count > 0; caps at "9+").
```

Mobile bottom tabs per role (More = Sheet):

| Role | Tabs | More sheet contents |
|---|---|---|
| STUDENT | Home · Today · Subjects · More | Assignments, Attendance, Routine, Session Logs, Notices, Events + Sign Out |
| TEACHER | Home · Today · Grading [badge] · More | My Subjects, Attendance, Sessions, Resources + Sign Out |
| CR | Home · Today · Log Session · More | Attendance, Session History, Subjects, Routine + Sign Out |
| ADMIN | Dashboard · Students · Notices · More | Teachers, Accounts, Subjects, Assignments, Events, Attendance Reviews + Sign Out |

Deletions after rewiring: `components/student/student-sidebar.tsx`, `student-topbar.tsx`, `mobile-navbar.tsx`, `components/teacher/teacher-*`, `components/cr/cr-*`, `components/app-sidebar.tsx`, `lib/navigation.ts` legacy arrays (replaced by new module), `components/student/mobile-bottom-nav.tsx` (superseded by shell version).

## 5. Subject Workspace (Level 2)

`/subjects/[slug]` converts client-side `<Tabs>` to **URL-driven tabs** via `searchParams.tab`
(`overview`(default) | `syllabus` | `classes` | `assignments` | `resources`) — awaited per Next 16.
Each existing `TabsContent` body becomes a plain section rendered conditionally; content markup is preserved.

New server component `src/components/shell/context-header.tsx` renders at the top of the page:

```
← My Subjects                    (back link, /subjects)
DATABASE MANAGEMENT SYSTEMS      (subject name; code/meta line if present on record)
[Overview] [Syllabus] [Classes] [Assignments] [Resources]   ← Links preserving slug, active = current tab
Breadcrumbs: My Subjects / Database Management Systems
```

Deep entity pages add breadcrumbs only where deeper than Level 2:
`/homework/submissions/[id]` → `Assignments / Submission`.
Breadcrumbs component: `src/components/shell/breadcrumbs.tsx` (server, takes `[{label, href?}]`).
Mobile shows the same compact strip (short labels); no separate back-chrome needed since ContextHeader carries `←`.

## 6. Today as Command Center (shared page, role-aware sections)

`/today/page.tsx` (single shared file; sections vary by role):

1. **Header** — `Today` + long date + greeting (`Good morning, {firstName}`) in Asia/Kathmandu tz (already the project standard).
2. **Current / Next class card** — derived from today's routine rows vs current time; shows subject, time range, room, status chip (reuses existing UPCOMING/ONGOING/COMPLETED logic from day-strip). CR sees `[Log Session]` prefill link (query-param prefill already supported by `/sessions/new`).
3. **Schedule** — existing day-strip selector + class list retained.
4. **Deadlines** (STUDENT/CR) — unsubmitted assignments due within 7 days (existing homework tables; co-located read query).
5. **Needs your attention** (max 4 links, role-based): student → due-soon/overdue assignments, attendance below threshold if data supports, recent notices; teacher → pending grading count link; CR → sessions not yet logged today.

All data from existing tables; new read queries are co-located in `src/app/(student)/today/queries.ts`. No invented features.

## 7. Breadcrumbs & Back Rules

- Render breadcrumbs only when user is deeper than main-nav level (subject detail, submission detail, admin subject editor).
- Never on top-level pages (Home, Today, lists).
- Server-rendered from explicit crumb arrays (no path parsing magic).

## 8. Authorization Invariants (unchanged)

Layouts still call `requireAuth(...)` with the same role sets. Pages keep their own checks where they exist today. Navigation renders destinations only; it is never a security boundary. New badge queries filter by the authenticated user's own scope (enrollments / teacherId / userId).

## 9. Test Strategy (TDD)

Framework: Playwright e2e only (project standard; no unit framework installed — adding one is out of scope; pure helpers like `isNavActive` are covered through active-state assertions).

1. **RED first:** `tests/e2e/navigation-roles.spec.ts` — asserts final IA for all four roles (sidebar sections/items, active states on nested routes, shared-route chrome correctness, mobile bottom nav + More sheet, grading badge visibility).
2. Rewrite `responsive-navigation.spec.ts` to assert the NEW IA (bottom nav + drawer instead of pill bar).
3. New `tests/e2e/teacher-portal.spec.ts` (teacher home/today/grading/resources + badge) and `tests/e2e/cr-admin-nav.spec.ts` (CR log-session prominence, admin People/Academics/Campus/System traversal incl. Attendance Reviews).
4. Existing suites must stay green: auth-lifecycle, attendance-barometer, dashboard-schedule (adapted selectors allowed only where IA legitimately changed), homework-submissions, subject-isolation, typography-contrast.
5. Gates per task: targeted spec → full suite at integration; `npx tsc --noEmit`; `npm run lint`.

Seed addition (teacher lane): one ungraded `status='submitted'` submission row in `scripts/seed-e2e.ts` so the Grading badge has real data to display.

## 10. Execution Waves

- **Wave 1 (sequential foundation):** types + role trees + badges + AppShell/DesktopSidebar/ShellTopbar/MobileBottomNav/NavBadge + rewire all 4 layouts + delete legacy nav components + write/red navigation specs + make responsive spec green.
- **Wave 2 (parallel lanes, disjoint file ownership):**
  - A: `/today` command center (+ submission-detail breadcrumbs)
  - B: subject workspace URL-tabs + ContextHeader + Breadcrumbs component
  - C: teacher surfaces + teacher-portal.spec + seed ungraded row
  - D: CR dashboard prominence + admin nav completion + cr-admin-nav.spec
- **Wave 3 (integration):** full suite + typecheck + lint + cross review + fixes.
