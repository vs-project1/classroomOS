# Layout & Responsive Navigation Architectural Survey

## 1. Executive Summary

This investigation surveys the layout and navigation implementation of Classroom OS across both Student and Admin spaces. The goal is to evaluate responsive behaviors at Desktop (`>= 768px`) and Mobile (`< 768px`) breakpoints, prevent layout shifts and content occlusion, assess the Sheet drawer and horizontal pill bar navigation, and verify consistency across student and admin layouts per the project guidelines in `AGENTS.md` and `ORIGINAL_REQUEST.md`.

---

## 2. Codebase Inventory & Structural Overview

### 2.1 Root Layout (`src/app/layout.tsx`) & CSS Variables (`src/app/globals.css`)
- **Root Layout (`src/app/layout.tsx`)**:
  - Sets up Google Fonts: `Inter` (`--font-inter`), `Fira_Sans` (`--font-fira-sans`), and `Fira_Code` (`--font-fira-code`).
  - Sets `suppressHydrationWarning` on `<html>` (satisfying Rule 5 to protect against browser extensions crashing React 19 hydration).
  - Configures `html` (`h-full font-sans antialiased`) and `body` (`min-h-full flex flex-col bg-background text-foreground`).
- **Sidebar CSS Theme Variables (`src/app/globals.css`)**:
  - **Light Mode**:
    - `--sidebar`: `#1E1B4B` (Deep Indigo)
    - `--sidebar-foreground`: `#F8FAFC` (High-contrast Slate White)
    - `--sidebar-primary`: `#818CF8`
    - `--sidebar-accent`: `#312E81`
    - `--sidebar-border`: `#3730A3`
  - **Dark Mode**:
    - `--sidebar`: `#070B14` (Ultra-Deep Midnight)
    - `--sidebar-foreground`: `#C7D2FE` (Soft High-Contrast Indigo)
    - `--sidebar-primary`: `#818CF8`
    - `--sidebar-accent`: `#1E1B4B`
    - `--sidebar-border`: `#1E293B`

---

### 2.2 Student Layout (`src/app/(student)/layout.tsx`)
```tsx
export default function StudentLayout({ children }: { children: React.ReactNode }) {
  return (
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
  );
}
```
- **Desktop (`>= 768px`)**:
  - `<StudentSidebar />` is visible (`hidden md:flex flex-col w-64 bg-sidebar border-r border-sidebar-border h-screen sticky top-0 shrink-0 text-sidebar-foreground z-20`).
  - `<StudentTopbar />` is sticky at `top-0` (`h-16`, `z-10`). On desktop, it displays `ThemeToggle` and student avatar on the right; mobile triggers and logos are hidden via `md:hidden`.
  - `<MobileNavbar />` is completely hidden via `md:hidden`.
  - `<main>` provides comfortable breathing room (`p-4 md:p-6 pb-8 max-w-7xl mx-auto`).
- **Mobile (`< 768px`)**:
  - `<StudentSidebar />` is hidden (`hidden md:flex`).
  - `<StudentTopbar />` is sticky at `top-0` (`h-16`, `z-10`) and displays:
    - `<StudentMobileMenuTrigger />` (hamburger "Menu" button that opens the full `Sheet` sidebar drawer).
    - "Classroom OS" brand icon and text.
    - `<ThemeToggle />` and `<Avatar />`.
  - `<MobileNavbar />` is sticky at `top-16` (`z-20`) with `bg-card/90 backdrop-blur-md border-b border-border px-3 py-2 overflow-x-auto no-scrollbar`.
    - Contains horizontal pill links for 1-tap navigation across core student views.
  - Page content starts naturally below the sticky headers and scrolls cleanly within the inner `overflow-y-auto` container.

---

### 2.3 Admin Layout (`src/app/(admin)/admin/layout.tsx`)
```tsx
export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen overflow-hidden">
      <AppSidebar />
      <div className="flex-1 flex flex-col relative w-full overflow-y-auto">
        <header className="h-16 border-b border-border/40 bg-background/80 backdrop-blur-md flex items-center justify-between px-4 md:px-8 sticky top-0 z-10 md:hidden">
          <div className="flex items-center gap-3">
            <AdminMobileMenuTrigger />
            <span className="font-bold text-base text-primary">Admin Console</span>
          </div>
          <ThemeToggle />
        </header>
        <div className="hidden md:flex justify-end p-4 absolute top-0 right-0 z-20">
          <ThemeToggle />
        </div>
        <div role="region" aria-label="Admin Content" className="flex-1 p-4 md:p-6 w-full max-w-7xl mx-auto">
          {children}
        </div>
      </div>
    </div>
  );
}
```
- **Desktop (`>= 768px`)**:
  - `<AppSidebar />` is visible (`hidden md:flex flex-col w-64 bg-sidebar border-r border-sidebar-border h-screen sticky top-0 shrink-0 text-sidebar-foreground z-20`).
  - The mobile `<header>` is hidden (`md:hidden`).
  - `<ThemeToggle />` is positioned via `hidden md:flex justify-end p-4 absolute top-0 right-0 z-20`.
- **Mobile (`< 768px`)**:
  - `<AppSidebar />` is hidden.
  - Mobile `<header>` is visible (`sticky top-0 z-10 h-16`), showing `<AdminMobileMenuTrigger />` ("Menu" button with Sheet drawer) + "Admin Console" title + `<ThemeToggle />`.

---

## 3. Responsive Navigation Architecture Analysis

### 3.1 Desktop Sidebar (>= 768px)
1. **Zero Layout Shift**:
   - The outer container has `flex h-screen overflow-hidden`.
   - The sidebar has `w-64` (256px), `shrink-0`, and `sticky top-0 h-screen`.
   - The main content area has `flex-1 overflow-y-auto`.
   - The sidebar width is statically allocated upon initial render; there are no collapsible icon-only transitions or hydration shifts on load.
2. **High-Contrast Theming**:
   - Both `AppSidebar` and `StudentSidebar` use deep indigo backgrounds (`--sidebar: #1E1B4B` / `#070B14`) with light foreground text (`--sidebar-foreground: #F8FAFC` / `#C7D2FE`).
   - Active navigation items feature solid primary background (`bg-primary text-white font-semibold shadow-sm shadow-primary/30`), exceeding the 4.5:1 WCAG contrast threshold.
   - Hover states use `hover:bg-sidebar-accent hover:text-sidebar-foreground`.

### 3.2 Mobile Navigation (< 768px)
1. **Dual-Tier Navigation Paradigm**:
   - **Tier 1 (Fast Horizontal Pill Bar - `MobileNavbar`)**: Sticky horizontal scrolling pills below topbar (`sticky top-16 z-20`). Provides 1-tap switching between primary views.
   - **Tier 2 (Full Menu Drawer - `StudentMobileMenuTrigger` & `AdminMobileMenuTrigger`)**: Left-sliding `Sheet` containing the full sidebar hierarchy, branding, and role badges.
2. **Sticky Header Geometry & Content Occlusion**:
   - `StudentTopbar`: `h-16` (64px) at `top: 0` (`z-10`).
   - `MobileNavbar`: Height `~45px` (padding `py-2` + pill `py-1.5` + text + borders) at `top: 4rem / top-16` (`z-20`).
   - Total sticky header block: `~109px`.
   - Because the main content element `<main>` is placed in standard document flow directly beneath `<MobileNavbar>` inside the scrolling container, initial content is rendered below the sticky headers. As the user scrolls down, content slides beneath the `backdrop-blur-md` headers smoothly without any static occlusion or cut-off.
3. **Orphaned Component Assessment (`MobileBottomNav`)**:
   - `src/components/student/mobile-bottom-nav.tsx` contains an unused `MobileBottomNav` component fixed at `bottom-0`.
   - It is NOT mounted in `StudentLayout`.
   - The top-stacked `MobileNavbar` + `StudentMobileMenuTrigger` is superior because:
     - It avoids screen-bottom conflicts with mobile virtual keyboards and floating action tools like `RoleSwitcher` (`fixed bottom-4 right-4 z-50`).
     - It avoids iOS bottom home indicator safe-area overlap.
     - `MobileBottomNav` should remain unmounted or be marked deprecated.

---

## 4. Discrepancies & Navigation Inconsistencies

### 4.1 Inconsistency Matrix: Navigation Links

| Destination | Student Sidebar (`StudentSidebar`) | Mobile Pill Bar (`MobileNavbar`) | Admin Sidebar (`AppSidebar`) | Status / Issue |
|---|---|---|---|---|
| Dashboard | Dashboard (`/`) | Home (`/`) | Dashboard (`/admin`) | Consistent |
| Subjects | Subjects (`/subjects`) | Subjects (`/subjects`) | Subjects (`/admin/subjects`) | Consistent |
| Today's Schedule | Today's Schedule (`/today`) | Today (`/today`) | N/A | Consistent |
| Weekly Routine | Weekly Routine (`/routine`) | Routine (`/routine`) | N/A | Consistent |
| Attendance | Attendance (`/attendance`) | Attendance (`/attendance`) | N/A | Consistent |
| Lecture Logs | Lecture Logs (`/lecture-logs`) | **MISSING** | N/A | ⚠️ Missing from `MobileNavbar` |
| Assignments | Assignments (`/homework`) | **Homework** (`/homework`) | Assignments (`/admin/homework`) | ⚠️ Terminology mismatch (Rule 5) |
| Notice Board | Notice Board (`/notices`) | Notices (`/notices`) | Notice Board (`/admin/notices`) | Consistent |
| Events & Calendar | Events & Calendar (`/events`) | Events (`/events`) | Events & Calendar (`/admin/events`) | Consistent |
| Accounts & RBAC | N/A | N/A | Accounts & Auth (`/admin/accounts`) | Admin-only |
| Teachers | N/A | N/A | Teachers (`/admin/teachers`) | Admin-only |
| Students | N/A | N/A | Students (`/admin/students`) | Admin-only |

### 4.2 Detailed Findings:

1. **Terminology Mismatch in `MobileNavbar` (Violation of AGENTS.md Rule 5)**:
   - Rule 5 explicitly states: *"The UI strictly uses the term 'Assignments' for these (even if the underlying database table is currently named `homework`)."*
   - In `src/components/student/mobile-navbar.tsx` (line 14):
     `{ title: "Homework", url: "/homework", icon: Book }`
   - In `StudentSidebar` (line 16):
     `{ title: "Assignments", url: "/homework", icon: Book }`
   - **Fix**: Update `MobileNavbar` title to `"Assignments"`.

2. **Missing Navigation Link in `MobileNavbar`**:
   - `Lecture Logs` (`/lecture-logs`) is in `StudentSidebar` (desktop and mobile drawer), but absent from `MobileNavbar`.
   - **Fix**: Add `{ title: "Logs", url: "/lecture-logs", icon: FileText }` to `MobileNavbar`.

3. **Admin Dashboard Cross-Domain Links Bug (`src/app/(admin)/admin/page.tsx`)**:
   - In `src/app/(admin)/admin/page.tsx`, quick action cards and section footer links mistakenly navigate to student routes rather than the corresponding admin management pages:
     - Line 89: `<Link href="/sessions/new"...>` (links to student `/sessions/new`)
     - Line 93: `<Link href="/notices"...>` (should be `/admin/notices`)
     - Line 97: `<Link href="/homework"...>` (should be `/admin/homework`)
     - Line 101: `<Link href="/routine"...>` (links to student `/routine`)
     - Line 209: `<Link href="/notices"...>` (should be `/admin/notices`)
     - Line 231: `<Link href="/events"...>` (should be `/admin/events`)
   - When an administrator clicks "Post Notice", "Create Assignment", or "View Calendar" from the Admin Dashboard, they are redirected out of the admin panel into the student portal.

4. **Admin Subpages Cross-Domain Links**:
   - `src/app/(admin)/admin/homework/page.tsx` line 104:
     `<Link href="/homework/new">` -> points to `/homework/new` instead of `/admin/homework/new`.
   - `src/app/(admin)/admin/notices/page.tsx` line 98 & line 120:
     `<Link href="/notices/new">` -> points to `/notices/new` instead of `/admin/notices/new`.
   - `src/app/(admin)/admin/events/page.tsx` line 121:
     `<Link href="/events/new">` -> points to `/events/new` instead of `/admin/events/new`.
   - `src/app/(admin)/admin/subjects/page.tsx` line 86 & line 104:
     `<Link href={`/subjects/${subject.id}`}>` -> points to student `/subjects/[id]` instead of `/admin/subjects/[id]`.

5. **Admin Desktop Header / ThemeToggle Positioning**:
   - In `src/app/(admin)/admin/layout.tsx`:
     `<div className="hidden md:flex justify-end p-4 absolute top-0 right-0 z-20"><ThemeToggle /></div>`
   - Using `absolute top-0 right-0` can collide with page-level header actions on admin pages that utilize the top-right corner (e.g. "Add Student", "Publish Notice"). A standardized sticky topbar or embedding the theme toggle inside the sidebar footer/topbar is cleaner.

---

## 5. Sheet / Drawer Primitive UX Recommendations

- In `StudentMobileMenuTrigger` and `AdminMobileMenuTrigger`, `Sheet` from `@base-ui/react/dialog` is used.
- When an item inside `SidebarNav` or `AppSidebarNav` is clicked on mobile, the link navigation occurs.
- To ensure optimal mobile UX and prevent the Sheet drawer from remaining open after navigation, each `<Link>` inside the sheet can trigger drawer close, or wrap nav links with `<SheetClose render={<Link ... />}>` / pass an `onNavigate` handler to close the sheet.

---

## 6. Architectural Recommendations Summary

1. **Synchronize Navigation Items & Terminology**:
   - Update `mobileNavItems` in `src/components/student/mobile-navbar.tsx` to include `Assignments` (replacing `Homework`) and add `Lecture Logs` (`/lecture-logs`).
2. **Correct Admin Routing Isolation**:
   - Update all cross-links in `src/app/(admin)/admin/page.tsx`, `src/app/(admin)/admin/homework/page.tsx`, `src/app/(admin)/admin/notices/page.tsx`, `src/app/(admin)/admin/events/page.tsx`, and `src/app/(admin)/admin/subjects/page.tsx` to route strictly to `/admin/*`.
3. **Preserve Dual-Tier Navigation for Students**:
   - Maintain desktop sticky sidebar (`hidden md:flex w-64 bg-sidebar`) and mobile horizontal pill bar (`sticky top-16 z-20`) + hamburger `Sheet` drawer.
4. **Deprecate Unused `MobileBottomNav`**:
   - Keep `MobileBottomNav` removed from layouts to prevent bottom UI occlusion and keyboard collision.
