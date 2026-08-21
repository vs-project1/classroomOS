## 2026-08-18T14:43:00Z
Implement Milestone 3: Student & Admin Views UX Modernization:
1. Eliminate all remaining instances of arbitrary micro-fonts (`text-[10px]`, `text-[11px]`) and upgrade them to readable scales (`text-xs font-semibold`/`font-bold` or `text-sm font-medium`):
   - In `src/app/(student)/page.tsx` (live class NOW badge, upcoming classes, notice metadata, greeting subhead)
   - In `src/app/(student)/today/page.tsx` & `src/app/(student)/today/day-strip-selector.tsx` (timeline status badges ONGOING/COMPLETED/UPCOMING, teacher avatars, room numbers)
   - In `src/app/(student)/routine/page.tsx` (routine time headers, room numbers, teacher tags)
   - In `src/app/(student)/subjects/page.tsx` & `src/app/(student)/subjects/[id]/page.tsx` (subject chips, unit counts, syllabus materials)
   - In `src/app/(student)/attendance/page.tsx` (lecture count summaries, category labels)
   - In `src/app/(student)/homework/page.tsx` & `src/app/(student)/homework/homework-client-workspace.tsx` (due dates, submission statuses)
   - In `src/app/(student)/notices/page.tsx` (pinned alert badge, date stamps)
   - In `src/app/(student)/events/page.tsx` (event type badges, date chips)
   - In `src/app/(student)/sessions/page.tsx` (session log placeholders)
   - In `src/components/student/student-sidebar.tsx` & `src/components/app-sidebar.tsx` (menu section labels, subtitle metadata)
   - In `src/app/(admin)/admin/page.tsx` (dashboard card headers, quick action typography)
   - In `src/app/(admin)/admin/accounts/page.tsx`, `accounts-client-console.tsx`, `kpi-summary-cards.tsx` (KPI subheaders, table headers, role badges)
   - In `src/app/(admin)/admin/homework/page.tsx` (queue table headers, badges)
   - In `src/app/(admin)/admin/notices/page.tsx` (notice cards, pinned tags)
   - In `src/app/(admin)/admin/events/page.tsx` (event cards, format time with formatTime12h)
   - In `src/app/(admin)/admin/teachers/page.tsx` (faculty badges, semester chips)
   - In `src/app/(admin)/admin/students/page.tsx` (table header font-size, faculty and semester badges)
   - In `src/app/(admin)/admin/subjects/page.tsx` & `src/app/(admin)/admin/subjects/[id]/page.tsx` (Lab Included badge, teacher avatar initial sizing)
2. Interactive Polish:
   - Ensure all clickable items (buttons, links, interactive cards, tabs, action triggers) have `cursor-pointer` and clear hover/active states (`hover:bg-...`, `hover:border-...`, `transition-colors` / `transition-all`).
   - Ensure consistent border radius (`rounded-lg` / `rounded-xl`).
   - Preserve all `data-testid` attributes intact.
3. Verification:
   - Run `npx tsc --noEmit` to verify 0 TypeScript errors.
   - Run `npm run db:verify` to verify database integrity.
4. Write your handoff report to `D:\CLASSROOM OS\.agents\worker_m3\handoff.md`.
