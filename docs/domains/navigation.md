# Domain Brief: Navigation (Role-Aware AppShell)

## Purpose
Single role-aware application shell. The session user's **role — not the URL — decides which
chrome renders**, so shared routes (`/today`, `/subjects`, `/attendance`, `/lecture-logs`) always
show correct navigation (app-shell.tsx:15-19). Design source:
`docs/superpowers/specs/2026-08-22-navigation-ia-design.md`.

## Key files
| File | Role |
|---|---|
| `src/lib/navigation/types.ts` | Typed model: `UserRole` (:3), `NavBadgeKey` (:5), `NavItem.activePatterns` (:13), `isNavActive` (:44-48), `isNavItemActive` (:50-55) |
| `src/lib/navigation/{student,teacher,cr,admin}.ts` | One typed tree per role |
| `src/lib/navigation/index.ts` | `getNavigationForRole(role)` switch (:8-19); unknown → STUDENT tree |
| `src/lib/navigation/badges.ts` | Server-scoped badge counts (:14-28) |
| `src/components/shell/app-shell.tsx` | Composes sidebar/topbar/bottom-nav (:20-30) |
| `src/components/shell/nav-content.tsx` | Shared renderer, `variant="sidebar"\|"drawer"` (NEW, uncommitted) |
| `src/components/shell/desktop-sidebar.tsx` | `<aside>` wrapper → `NavContent variant="sidebar"` (:13-18) |
| `src/components/shell/shell-topbar.tsx` | Sticky top bar + hamburger drawer (:33-83) |
| `src/components/shell/mobile-bottom-nav.tsx` | Bottom tab bar + "More" sheet (:22-124) |
| `src/components/shell/nav-badge.tsx` | Count pill (:19-40) |
| `src/components/shell/context-header.tsx` | Level-2 entity header + URL tabs (:29-91) |
| `src/components/shell/breadcrumbs.tsx` | Server-rendered crumb strip (:13-45) |

## Active-state matcher
`isNavActive(pathname, href)` (types.ts:44-48): `/` matches exactly `/`; anything else matches
itself or descendants at a segment boundary — `/subjects` activates on `/subjects/dbms`, NOT on
`/subjects-extra`. `isNavItemActive` (:50-55) adds per-item `activePatterns`. All three chrome
surfaces must use it; inline `startsWith` duplicates are being removed (nav-content.tsx:105).

## Badge semantics (server-scoped, badges.ts)
| Key | Who | Query scope |
|---|---|---|
| `assignmentsDue` | STUDENT, CR (:19-21) | active homework in the student's **enrolled** subjects, `dueDate > now`, no own submission with status submitted/graded/late (:34-53) |
| `pendingGrading` | TEACHER (:22-23) | submissions joined via `subjects.teacherId === user.teacherId`, status submitted/late (:62-67) |
| — | ADMIN (:24-26) | `{}` — no academic-participation counts |

Dedup: `getCurrentUser` is wrapped in React `cache()` (src/lib/auth/session.ts:229) and so is
`resolveCurrentStudent` (src/lib/auth/index.ts:43). Layouts trigger it ≥3×/request
(`requireAuth` + `getSubjectsForSidebar` + `getNavBadges`) — cache() collapses these to one
resolution per server render. Do NOT remove the wrappers.

## Layout requireAuth matrix
| Layout | Allowed roles | Evidence |
|---|---|---|
| `(student)/layout.tsx` | STUDENT, CR, TEACHER, ADMIN (shared surface) | :14 |
| `(teacher)/teacher/layout.tsx` | TEACHER, ADMIN | :14 |
| `(cr)/cr/layout.tsx` | CR, ADMIN | :14 |
| `(admin)/admin/layout.tsx` | ADMIN | :14 |

All four: `force-dynamic` (:6) + `Promise.all([getSubjectsForSidebar(), getNavBadges()])` (:15).
`requireAuth` redirects unauthenticated→`/login`, deactivated→`?error=deactivated`,
`mustChangePassword`→`/change-password`, wrong-role→role home (src/lib/auth/session.ts:307-335).

## Component responsibilities
| Component | Responsibility | Notes |
|---|---|---|
| app-shell | Layout composition; passes `user.role` down | Topbar receives `badges` too (:25) |
| nav-content | Full nav rendering for sidebar + hamburger drawer | Teacher footer shows "N Assigned Subject(s)" (:74-77); sr-only count text next to label (:122-126) |
| shell-topbar | Brand, theme toggle, sign-out form, avatar initials (:11-21) | Drawer = `variant="drawer"` (:50) |
| mobile-bottom-nav | `data-testid="mobile-bottom-nav"` (:33); tabs from `mobileTabs`; "More" sheet lists items not in tab set (:26-29) | Sign Out lives in the sheet (:109-117) |
| nav-badge | Renders nothing at 0/undefined (:26); caps "9+" (:37); `aria-hidden` pill + `data-slot="nav-badge"` test hook (:28-29) | `variant="sidebar"` uses `bg-white/10 text-indigo-300` because primary-on-tint drops to ~2.3:1 on the sidebar composite #1E1B4B/#070B14 (:5-10) |
| context-header | Breadcrumbs + back link (`data-testid="context-back-link"`) + title/meta/actions + URL-driven section tabs | Used by subject detail |
| breadcrumbs | Explicit crumb arrays only, "no path magic" (:9-12); last crumb `aria-current="page"` (:34) | |

## URL-tab contract: `/subjects/[slug]`
Tabs are query-param driven, not routes: `SUBJECT_TABS = overview\|syllabus\|classes\|assignments\|resources`
(src/app/(student)/subjects/[slug]/page.tsx:83); missing/invalid `?tab` falls back to `overview`
(:94-96); tab hrefs are `/subjects/${slug}?tab=${key}` (:251) rendered through ContextHeader with
`tabTestIdPrefix="subject-tab"` (:239-240).

## Today command center (shared `/today`)
Role sections inside one page (src/app/(student)/today/page.tsx): Deadlines card for
STUDENT/CR only (`isClassMember` :102, section :433-467); teacher "Needs your attention" grading
card when `pendingGrading > 0` (:470-481); Log Session button suppressed for STUDENT (:234).

## Invariants & sharp edges
1. **Navigation renders destinations only — it is NEVER a security boundary.** Chrome is chosen by
   role for UX; enforcement lives in layouts, page-level checks, actions, and `proxy.ts`.
   Non-admin hitting an admin link gets redirected by the gate, not trusted.
2. `Notifications` nav items (student.ts:34, cr.ts:27) target a route that exists only as
   uncommitted work (`src/app/(student)/notifications/`) — verify before citing as shipped.
3. The `(student)` grid page still falls back to the full subject catalog — see ownership.md gap.

## Changelog
- 2026-08-21: IA refactor replaced per-role sidebars/pill bar with AppShell + typed trees
  (commit d814ff0); URL tabs + ContextHeader (60452e0).
- 2026-08-22: ownership/a11y batch (3ff8178): NavBadge contrast variant, sr-only counts;
  NavContent extraction landed as working-tree changes (uncommitted at time of writing).
