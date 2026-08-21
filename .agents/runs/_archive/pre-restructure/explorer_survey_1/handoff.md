# Handoff Report — Layout & Navigation Investigation

## 1. Observation

Direct code observations with exact file paths and line numbers:

1. **Root Layout & CSS Themes**:
   - `src/app/layout.tsx` (lines 35-43): Configures fonts (`--font-inter`, `--font-fira-sans`, `--font-fira-code`), `suppressHydrationWarning` on `<html>`, `h-full`, and `body className="min-h-full flex flex-col bg-background text-foreground"`.
   - `src/app/globals.css` (lines 84-93, 123-132): Defines high-contrast deep indigo sidebar tokens for light mode (`--sidebar: #1E1B4B`, `--sidebar-foreground: #F8FAFC`, `--sidebar-primary: #818CF8`) and dark mode (`--sidebar: #070B14`, `--sidebar-foreground: #C7D2FE`, `--sidebar-primary: #818CF8`).

2. **Desktop Sidebar Implementation (>= 768px)**:
   - `src/components/student/student-sidebar.tsx` (lines 79-85):
     ```tsx
     export function StudentSidebar() {
       return (
         <aside className="hidden md:flex flex-col w-64 bg-sidebar border-r border-sidebar-border h-screen sticky top-0 shrink-0 text-sidebar-foreground z-20">
           <SidebarNav />
         </aside>
       );
     }
     ```
   - `src/components/app-sidebar.tsx` (lines 81-87):
     ```tsx
     export function AppSidebar() {
       return (
         <aside className="hidden md:flex flex-col w-64 bg-sidebar border-r border-sidebar-border h-screen sticky top-0 shrink-0 text-sidebar-foreground z-20">
           <AppSidebarNav />
         </aside>
       );
     }
     ```
   - Both sidebars allocate a static `w-64` (256px) width, `shrink-0`, and `sticky top-0 h-screen`, preventing initial load layout shift.

3. **Mobile Navigation Implementation (< 768px)**:
   - `src/app/(student)/layout.tsx` (lines 10-21):
     ```tsx
     <div className="flex h-screen overflow-hidden">
       <StudentSidebar />
       <div className="flex-1 flex flex-col relative w-full overflow-y-auto">
         <StudentTopbar />
         <MobileNavbar />
         <main className="flex-1 p-4 md:p-6 pb-8 w-full max-w-7xl mx-auto">
           {children}
         </main>
       </div>
     </div>
     ```
   - `src/components/student/student-topbar.tsx` (line 8): `sticky top-0 z-10 h-16`. Contains `StudentMobileMenuTrigger`, brand icon/text, `ThemeToggle`, and `Avatar`.
   - `src/components/student/mobile-navbar.tsx` (line 23): `sticky top-16 z-20 w-full bg-card/90 backdrop-blur-md border-b border-border px-3 py-2 overflow-x-auto no-scrollbar`. Contains 8 link pills.
   - `src/components/student/mobile-bottom-nav.tsx` (line 19): Contains unused `MobileBottomNav` with `fixed bottom-0`. It is unmounted.

4. **Terminology Mismatch & Missing Link in `MobileNavbar`**:
   - `src/components/student/mobile-navbar.tsx` (lines 8-17):
     ```tsx
     const mobileNavItems = [
       { title: "Home", url: "/", icon: Home },
       { title: "Subjects", url: "/subjects", icon: GraduationCap },
       { title: "Today", url: "/today", icon: Clock },
       { title: "Routine", url: "/routine", icon: CalendarRange },
       { title: "Attendance", url: "/attendance", icon: CheckCircle },
       { title: "Homework", url: "/homework", icon: Book },
       { title: "Notices", url: "/notices", icon: Bell },
       { title: "Events", url: "/events", icon: CalendarDays },
     ];
     ```
     - Uses label `"Homework"` instead of `"Assignments"` (violates Rule 5 in `AGENTS.md`).
     - Lacks `{ title: "Logs", url: "/lecture-logs", icon: FileText }`, which exists in `StudentSidebar`.

5. **Cross-Domain Routing Inconsistencies in Admin Pages**:
   - `src/app/(admin)/admin/page.tsx`:
     - Line 93: `<Link href="/notices"...>` -> points to student `/notices` instead of `/admin/notices`.
     - Line 97: `<Link href="/homework"...>` -> points to student `/homework` instead of `/admin/homework`.
     - Line 209: `<Link href="/notices"...>` -> points to student `/notices`.
     - Line 231: `<Link href="/events"...>` -> points to student `/events`.
   - `src/app/(admin)/admin/homework/page.tsx` line 104: `<Link href="/homework/new">` -> points to student `/homework/new` instead of `/admin/homework/new`.
   - `src/app/(admin)/admin/notices/page.tsx` lines 98, 120: `<Link href="/notices/new">` -> points to student `/notices/new` instead of `/admin/notices/new`.
   - `src/app/(admin)/admin/events/page.tsx` line 121: `<Link href="/events/new">` -> points to student `/events/new` instead of `/admin/events/new`.
   - `src/app/(admin)/admin/subjects/page.tsx` lines 86, 104: `<Link href={`/subjects/${subject.id}`}>` -> points to student `/subjects/[id]` instead of `/admin/subjects/[id]`.

6. **TypeScript Compilation Status**:
   - Ran `npx tsc --noEmit` -> exited with code `0` (0 compilation errors).

---

## 2. Logic Chain

1. *From Observation 1 & 2*: The desktop layout is structured with an outer viewport container (`flex h-screen overflow-hidden`) and two flex children: a rigid sidebar (`hidden md:flex w-64 bg-sidebar shrink-0 sticky top-0 h-screen`) and an isolated scrolling content viewport (`flex-1 overflow-y-auto`). Because `w-64` is fixed and not dynamically toggled on initial render, no cumulative layout shift (CLS) occurs on desktop viewports (>= 768px).
2. *From Observation 3*: On mobile (< 768px), `StudentSidebar` is hidden. Navigation is divided into two clear layers:
   - Layer 1 (`StudentTopbar`, `sticky top-0 z-10 h-16` + `MobileNavbar`, `sticky top-16 z-20`, ~45px height): The topbar height (64px) matches the pill bar offset (`top-16`), meaning the two headers stack consecutively without overlap. Page content starts immediately below `~109px` in the normal document flow and scrolls underneath the backdrop-blurred headers without being occluded.
   - Layer 2 (`StudentMobileMenuTrigger`, Sheet drawer): Sliding drawer accessible from topbar hamburger button for secondary navigation, branding, and academic metadata.
3. *From Observation 3*: `MobileBottomNav` is unmounted. Leaving it unmounted avoids collisions with mobile keyboards, safe areas, and bottom-fixed controls like `RoleSwitcher` (`fixed bottom-4 right-4 z-50`).
4. *From Observation 4*: `MobileNavbar` uses `"Homework"` rather than `"Assignments"`, which violates project Rule 5 ("UI strictly uses the term 'Assignments'"). Furthermore, `/lecture-logs` is present in `StudentSidebar` but missing from `MobileNavbar`.
5. *From Observation 5*: Several admin views link directly to student routes (`/notices`, `/homework`, `/events`, `/subjects/[id]`, `/notices/new`, etc.) instead of the `/admin/*` management routes. When an administrator clicks these links, they get routed out of the admin layout into the student layout.

---

## 3. Caveats

- **No Caveats**: All layout files (`src/app/layout.tsx`, `src/app/(admin)/admin/layout.tsx`, `src/app/(student)/layout.tsx`, `src/app/(auth)/layout.tsx`), navigation components (`src/components/app-sidebar.tsx`, `src/components/student/student-sidebar.tsx`, `src/components/student/student-topbar.tsx`, `src/components/student/mobile-navbar.tsx`, `src/components/student/mobile-bottom-nav.tsx`), sheet dialogs (`src/components/ui/sheet.tsx`), and all student/admin pages were directly inspected.

---

## 4. Conclusion

The layout and responsive navigation architecture is sound and well-engineered, with clear separation of desktop sticky sidebar (`hidden md:flex w-64 bg-sidebar`) and mobile dual-tier navigation (sticky topbar + horizontal pill bar + hamburger Sheet drawer).

To finalize the UI/UX refinement track:
1. **Fix Terminology & Items in `MobileNavbar`**: Rename `"Homework"` to `"Assignments"` in `src/components/student/mobile-navbar.tsx` and add `"Logs"` (`/lecture-logs`).
2. **Fix Admin Routing Isolation**: Update links in `src/app/(admin)/admin/page.tsx`, `src/app/(admin)/admin/homework/page.tsx`, `src/app/(admin)/admin/notices/page.tsx`, `src/app/(admin)/admin/events/page.tsx`, and `src/app/(admin)/admin/subjects/page.tsx` to point strictly to `/admin/*` routes.
3. **Admin Topbar Refinement**: Align the desktop `ThemeToggle` positioning in `AdminLayout` to prevent potential occlusion of top-right action buttons on admin pages.

---

## 5. Verification Method

To independently verify the observations and recommendations:
1. **TypeScript Typecheck**:
   ```powershell
   npx tsc --noEmit
   ```
2. **Files to Inspect**:
   - `src/app/(student)/layout.tsx`
   - `src/app/(admin)/admin/layout.tsx`
   - `src/components/student/student-sidebar.tsx`
   - `src/components/student/mobile-navbar.tsx`
   - `src/components/app-sidebar.tsx`
   - `src/app/(admin)/admin/page.tsx`
   - `src/app/(admin)/admin/homework/page.tsx`
   - `src/app/(admin)/admin/notices/page.tsx`
   - `src/app/(admin)/admin/events/page.tsx`
   - `src/app/(admin)/admin/subjects/page.tsx`
3. **Invalidation Conditions**:
   - If `MobileNavbar` is shown on desktop (>=768px), or desktop sidebar is visible on mobile (<768px).
   - If clicking an admin dashboard quick action navigates to a non-admin route (`/notices` vs `/admin/notices`).
   - If `npx tsc --noEmit` fails.
