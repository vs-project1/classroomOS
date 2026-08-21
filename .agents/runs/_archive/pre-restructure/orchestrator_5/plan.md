# Master Plan — UI/UX & Responsive Navigation Refinement

## Objectives
1. Responsive Navigation Architecture (R1):
   - Desktop (>= 768px): Rigid vertical sticky sidebar (`w-64 bg-sidebar`).
   - Mobile (< 768px): Horizontal navigation bar with link pills + mobile hamburger sheet drawer for full menu. Zero overlap or obstruction.
2. High-Contrast Typography & Visual Polish (R2):
   - Strict contrast ratios: >=4.5:1 body, >=3:1 headings across Light and Dark themes.
   - Upgrade tiny fonts (`text-[10px]`, `text-[11px]`, `text-xs`) to legible typography (`text-sm`/`text-base` font-medium/semibold).
   - Upgrade washed-out text styles and muted colors to rich contrast slate (`#334155` / `#1E293B`).
3. Comprehensive Page UX Audit & Alignment (R3):
   - Audit all 9 student views (`/`, `/today`, `/routine`, `/subjects`, `/subjects/[id]`, `/attendance`, `/homework`, `/notices`, `/events`).
   - Audit all admin views (`/admin`, `/admin/accounts`, `/admin/homework`, `/admin/notices`, `/admin/events`, `/admin/teachers`, `/admin/students`, `/admin/subjects`).
   - Consistent hover states, `cursor-pointer`, border radii, zero layout shifts.
4. Testing & Verification:
   - `npx tsc --noEmit` completes with 0 compilation errors.
   - Responsive layout checks at 375px, 768px, 1024px, 1440px.
   - 0 low-contrast text violations.
   - 100% pass on Playwright E2E test suite (`npx playwright test`).

## Survey Phase (Step 0)
Dispatch 3 parallel Explorers:
- Explorer 1 (Navigation & Layouts Architecture): Audit current layouts, sidebars, mobile headers, sheet drawer components, routing layout hierarchy.
- Explorer 2 (Design System, Typography & Contrast Audit): Audit CSS variables, Tailwind configuration, color palette, text sizing classes across student and admin components, contrast violations.
- Explorer 3 (Views & Testing Infrastructure): Audit all 9 student views, admin views, existing Playwright tests and test harness, and type check status.
