# Project: Classroom OS — UI/UX & Responsive Navigation Refinement

## Architecture
- **Framework**: Next.js 15+ App Router, React 19, Tailwind CSS v4, Radix/Base-UI via shadcn.
- **Layout Model**:
  - Desktop (>= 768px): Rigid vertical sticky sidebar (`w-64 bg-sidebar shrink-0 sticky top-0 h-screen`) + isolated scrolling main content.
  - Mobile (< 768px): Dual-tier sticky topbar (`StudentTopbar` at `top-0 h-16` + `MobileNavbar` at `top-16 z-20`) + full menu hamburger Sheet drawer (`StudentMobileMenuTrigger`).
- **Color & Contrast Token Strategy**:
  - Light mode: Deep slate and indigo surfaces (`#1E1B4B` sidebar, `#F0F4FF` page background, `#334155` muted-foreground).
  - Dark mode: Dark slate/navy surfaces (`#070B14` sidebar, `#0B0F19` page background, `#94A3B8` muted-foreground).
  - High-contrast badge tokens with explicit light and dark classes (`dark:text-...`, `dark:bg-...`, `dark:border-...`).

## Feature Inventory
| # | Feature | Description | Milestone | Source |
|---|---------|-------------|-----------|--------|
| 1 | Responsive Desktop Sidebar | Rigid `w-64 bg-sidebar` sticky on left with 0 CLS | M1 | ORIGINAL_REQUEST §R1 |
| 2 | Mobile Sticky Topbar + Pill Bar | Horizontal link pill strip with correct labels ("Assignments", "Logs") | M1 | ORIGINAL_REQUEST §R1 |
| 3 | Mobile Full Menu Sheet Drawer | Accessible hamburger drawer for full navigation & metadata | M1 | ORIGINAL_REQUEST §R1 |
| 4 | Admin Route Isolation | Fix cross-domain links in admin pages to point strictly to `/admin/*` | M1 | Survey Finding |
| 5 | Design System & StatusChip Contrast | Full dual-theme styling for StatusChip & TabsTrigger with >=4.5:1 contrast | M2 | ORIGINAL_REQUEST §R2 |
| 6 | Micro-Typography Elimination | Replace `text-[10px]` & `text-[11px]` across badges, avatars, and headers | M2 | ORIGINAL_REQUEST §R2 |
| 7 | Student Views UX Modernization | Polish all 9 student views (`/`, `/today`, `/routine`, `/subjects`, etc.) | M3 | ORIGINAL_REQUEST §R3 |
| 8 | Admin Views UX Modernization | Polish all 8 admin views (`/admin`, `/admin/accounts`, `/admin/students`, etc.) | M3 | ORIGINAL_REQUEST §R3 |
| 9 | Responsive Layout Validation | Test at 375px (Mobile), 768px (Tablet), 1024px (Laptop), 1440px (Desktop) | M4 | ORIGINAL_REQUEST Criteria |
| 10 | 100% Playwright Test Suite Pass | Comprehensive E2E test verification with 0 errors | M4 | ORIGINAL_REQUEST Criteria |

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| 1 | Navigation & Layout Architecture | `src/components/student/mobile-navbar.tsx`, `student-topbar.tsx`, `student-sidebar.tsx`, `app-sidebar.tsx`, `src/app/(admin)/admin/layout.tsx`, `src/app/(student)/layout.tsx`, admin page links | none | IN_PROGRESS |
| 2 | Design System & Contrast Hardening | `src/components/student/status-chip.tsx`, `src/components/ui/tabs.tsx`, `attendance/what-if-calculator.tsx`, `homework/status-actions.tsx`, `admin/homework/status-actions.tsx` | M1 | PLANNED |
| 3 | Student & Admin Views UX Modernization | Typography, avatars, table headers, hover states, `cursor-pointer`, and padding across all 17 student & admin pages | M2 | PLANNED |
| 4 | E2E Responsive Suite & Full Verification | Responsive specs, contrast checks, `npx tsc --noEmit` & 100% `npx playwright test` | M3 | PLANNED |

## Code Layout & Exclusive Ownership
- **Milestone 1**: Owns `src/components/student/mobile-navbar.tsx`, `student-topbar.tsx`, `student-sidebar.tsx`, `app-sidebar.tsx`, `src/app/(admin)/admin/layout.tsx`, `src/app/(student)/layout.tsx`, and admin page quick links in `src/app/(admin)/admin/page.tsx`, `src/app/(admin)/admin/homework/page.tsx`, `src/app/(admin)/admin/notices/page.tsx`, `src/app/(admin)/admin/events/page.tsx`, `src/app/(admin)/admin/subjects/page.tsx`.
- **Milestone 2**: Owns `src/components/student/status-chip.tsx`, `src/components/ui/tabs.tsx`, `src/app/(student)/attendance/what-if-calculator.tsx`, `src/app/(student)/homework/status-actions.tsx`, `src/app/(admin)/admin/homework/status-actions.tsx`.
- **Milestone 3**: Owns `src/app/(student)/**/page.tsx`, `src/app/(student)/today/day-strip-selector.tsx`, `src/app/(admin)/admin/**/page.tsx`, `src/app/(admin)/admin/accounts/kpi-summary-cards.tsx`, `src/app/(admin)/admin/accounts/accounts-client-console.tsx`.
- **Milestone 4**: Owns `playwright.config.ts`, `tests/e2e/responsive-navigation.spec.ts`, `tests/e2e/typography-contrast.spec.ts`.
