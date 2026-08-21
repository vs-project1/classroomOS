# Navigation & IA Refactor — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or executing-plans to implement this task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace feature-dumped navigation with four role-specific navigation models (student/teacher/CR/admin), a subject workspace, a Today command center, and role-correct mobile navigation — preserving all working functionality.

**Architecture:** Server-side role-aware `AppShell` used by all four route-group layouts; typed nav trees per role; server-resolved badge counts; URL-tabbed subject workspace; single shared `/today` page with role-conditional sections.

**Tech Stack:** Next.js 16.2.10 App Router (Turbopack; async `params`/`searchParams`), React 19, Tailwind v4, Drizzle + libSQL, lucide-react icons, Playwright e2e (port 3001, isolated `local.test.db`).

**Spec:** `docs/superpowers/specs/2026-08-22-navigation-ia-design.md`

## Global Constraints

- NO git commits by any agent. Edit files only.
- Await `params`/`searchParams`/`cookies()` everywhere (Next 16: sync access removed).
- Do not modify: `src/lib/auth/**`, `src/db/schema.ts`, any `actions.ts`, `src/proxy.ts`, uploadthing config.
- Every new DB query filters strictly by the authenticated user's scope.
- Verification gates: `npx tsc --noEmit` · `npm run lint` · `npm run test:e2e -- <spec>`.
- Icons: `lucide-react`; UI primitives from `src/components/ui/*`; `cn()` from `@/lib/utils`.
- Existing visual language: rounded-xl items, active = `bg-primary text-white`, sidebar token classes (`bg-sidebar`, `text-sidebar-foreground`, etc.).

---

### Task 1 (Wave 1 — Foundation): Nav model, AppShell, primitives, layouts

**Files:**
- Create: `src/lib/navigation/types.ts`, `src/lib/navigation/student.ts`, `src/lib/navigation/teacher.ts`, `src/lib/navigation/cr.ts`, `src/lib/navigation/admin.ts`, `src/lib/navigation/index.ts`, `src/lib/navigation/badges.ts`
- Create: `src/components/shell/app-shell.tsx`, `desktop-sidebar.tsx`, `shell-topbar.tsx`, `mobile-bottom-nav.tsx`, `nav-badge.tsx`
- Modify: `src/app/(student)/layout.tsx`, `src/app/(teacher)/teacher/layout.tsx`, `src/app/(cr)/cr/layout.tsx`, `src/app/(admin)/admin/layout.tsx`
- Create test: `tests/e2e/navigation-roles.spec.ts`
- Rewrite: `tests/e2e/responsive-navigation.spec.ts`
- Delete: `src/components/student/{student-sidebar,student-topbar,mobile-navbar,mobile-bottom-nav}.tsx`, `src/components/teacher/{teacher-sidebar,teacher-topbar}.tsx`, `src/components/cr/{cr-sidebar,cr-topbar}.tsx`, `src/components/app-sidebar.tsx`, old `src/lib/navigation.ts` (superseded by module)

**Interfaces produced (consumed by Wave 2):**
```ts
// src/lib/navigation
export type UserRole = "STUDENT" | "TEACHER" | "CR" | "ADMIN";
export type NavBadgeKey = "assignmentsDue" | "pendingGrading";
export type NavItem  = { label: string; href?: string; icon: LucideIcon; badgeKey?: NavBadgeKey; activePatterns?: string[] };
export type NavSection = { title?: string; items: NavItem[] };
export function isNavActive(pathname: string | null, href: string): boolean;
export function getNavigationForRole(role: UserRole): { portalLabel: string; sections: NavSection[] };
export type NavBadges = Partial<Record<NavBadgeKey, number>>;
export async function getNavBadges(): Promise<NavBadges>;
```

```tsx
// src/components/shell/app-shell.tsx (server component)
export function AppShell({ user, subjects, badges, children }: {
  user: { role: UserRole; firstName?: string };   // shape from requireAuth result + resolved names as available
  subjects: SidebarSubject[];
  badges: NavBadges;
  children: React.ReactNode;
});
```

Layout pattern (all four layouts identical except guard):
```tsx
const user = await requireAuth(["STUDENT", "TEACHER", "CR", "ADMIN"]); // per-layout role set unchanged
const [subjects, badges] = await Promise.all([getSubjectsForSidebar(), getNavBadges()]);
return <AppShell user={user} subjects={subjects} badges={badges}>{children}</AppShell>;
```

Nav trees: exactly as spec §3.1–3.4. Mobile bottom tabs + More sheets: spec §4 table.

- [ ] Step 1: Write failing `tests/e2e/navigation-roles.spec.ts` asserting: student sidebar shows Home/Today then ACADEMICS/CLASS/CAMPUS sections (no giant subject list); teacher on shared `/today` sees Teacher chrome (no Student items); admin never sees student items; CR sees Log Session; active state: visiting `/subjects/[seed-slug]` activates My Subjects; mobile (<768px) has fixed bottom nav w/ Home·Today·Subjects·More and no horizontally scrolling pill bar. Run → FAIL.
- [ ] Step 2: Build types/trees/`isNavActive`/badge queries/AppShell/primitives; rewire 4 layouts; delete legacy components; update all imports referencing deleted files (`grep -r "student-sidebar\|teacher-sidebar\|cr-sidebar\|app-sidebar\|mobile-navbar\|lib/navigation\"`).
- [ ] Step 3: Rewrite `responsive-navigation.spec.ts` for bottom-nav + drawer IA. Run both specs → PASS. Run `npx tsc --noEmit` + `npm run lint` → clean.

### Task 2 (Wave 2A): Today command center + submission breadcrumbs

**Files:** Modify `src/app/(student)/today/page.tsx`; Create `src/app/(student)/today/queries.ts`; Modify `src/app/(student)/today/day-strip-selector.tsx` only if needed; Modify `src/app/(student)/homework/submissions/[id]/page.tsx` (breadcrumbs); Test additions in `tests/e2e/dashboard-schedule.spec.ts`.

Consumes: `isNavActive` not needed here; uses existing auth helpers + db. Sections per spec §6. Keep existing day-strip behavior (tests assert it).

- [ ] Step 1: Failing assertions in dashboard-schedule.spec.ts: greeting text present; current-or-next-class card renders subject name/time/status chip; Deadlines card lists unsubmitted due-soon homework (seed data) with link into `/homework`; teacher persona viewing `/today` sees Needs-attention grading link instead of student deadline card.
- [ ] Step 2: Implement queries + sections; add breadcrumbs to submission detail (`Assignments / Submission`). Specs PASS.

### Task 3 (Wave 2B): Subject workspace URL tabs + ContextHeader + Breadcrumbs

**Files:** Modify `src/app/(student)/subjects/[slug]/page.tsx` (await searchParams; conditional render of existing tab bodies); Modify supporting client components under `src/app/(student)/subjects/[slug]/` only as needed; Create `src/components/shell/context-header.tsx`, `src/components/shell/breadcrumbs.tsx`; adapt `tests/e2e/subject-isolation.spec.ts` selectors if needed.

Tab contract: `?tab=overview|syllabus|classes|assignments|resources`, default `overview`. ContextHeader: back link ← My Subjects, subject name, tab Links preserving slug, active tab styled like sidebar active item. Breadcrumbs above header: `My Subjects / {name}`.

- [ ] Step 1: Failing assertions: visiting `/subjects/dbms?tab=assignments` highlights Assignments tab link and renders assignment list without JS tab clicks; breadcrumb shows subject name; back link href `/subjects`.
- [ ] Step 2: Implement; run subject-isolation + typography-contrast specs → PASS.

### Task 4 (Wave 2C): Teacher surfaces + badge seed + teacher spec

**Files:** Modify `src/app/(teacher)/teacher/page.tsx` (quick links incl. Grading w/ count); Create `tests/e2e/teacher-portal.spec.ts`; Modify `scripts/seed-e2e.ts` (+1 ungraded submitted submission row, idempotent upsert style matching file conventions).

- [ ] Step 1: Seed row first; failing spec: teacher home shows Grading quick-link with count ≥1; `/today` as teacher shows teacher chrome; grading page reachable from sidebar WORK section; badge pill visible on Grading nav item.
- [ ] Step 2: Implement home changes; spec PASS.

### Task 5 (Wave 2D): CR dashboard prominence + admin nav completion + CR/admin spec

**Files:** Modify `src/app/(cr)/cr/page.tsx` (Today-summary strip: X classes / Y logged / Z remaining + primary buttons Log Session / Take Attendance / View Sessions); Verify admin nav already includes Attendance Reviews via Task 1 tree (fix only if gaps); Create `tests/e2e/cr-admin-nav.spec.ts`. Counts derive from existing session/attendance tables via co-located read queries in the page file's folder.

- [ ] Step 1: Failing spec: CR sidebar order (Log Session before Attendance); dashboard strip renders counts; admin traversal People→Academics→Campus→System incl. `/admin/attendance`.
- [ ] Step 2: Implement; spec PASS.

### Task 6 (Wave 3 — Integration)

- [ ] Full `npm run test:e2e` → all suites pass (auth-lifecycle, attendance-barometer, dashboard-schedule, homework-submissions, responsive-navigation, subject-isolation, typography-contrast, navigation-roles, teacher-portal, cr-admin-nav).
- [ ] `npx tsc --noEmit` clean · `npm run lint` clean.
- [ ] Cross-role manual matrix spot-check per spec §23 (correct layout/sidebar/active/mobile/auth per route).
