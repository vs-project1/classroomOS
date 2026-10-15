# Implementation Plan: Attendance, Upload/Download, Weekly Routine & UI/UX Hardening

## Phase 1: Database Migration & Schema Fix for `resources`
- [ ] In `scripts/maintenance/migrate-schema-sync.ts`:
  - Check `PRAGMA foreign_key_list(resources)` for `uploaded_by`.
  - Recreate `resources` table if `uploaded_by` references `teachers(id)`, updating it to `users(id) ON DELETE SET NULL`.
  - Migrate any existing rows mapping `uploaded_by` from `teachers.id` to `users.id`.
- [ ] Run `npm run db:sync` and verify `PRAGMA foreign_key_list(resources)`.
- [ ] Seed sample resources in `src/db/seed.ts` for Semester 2 subjects.

## Phase 2: Taking Attendance Responsive Redesign & Role Sync
- [ ] In `src/app/(cr)/cr/take-attendance/page.tsx`:
  - Accept `section?: string` in `searchParams`.
  - Determine `userRole: user.role`.
  - Fetch available sections for the semester so multi-section batches can be switched.
  - Pass `userRole`, `section`, and `availableSections` to `DailyAttendanceClient`.
- [ ] In `src/app/(cr)/cr/take-attendance/client-page.tsx`:
  - Add contextual back button:
    - If `TEACHER`: link to `/teacher/attendance` (`Back to Attendance Dashboard`).
    - If `ADMIN`: link to `/admin/attendance` (`Back to Attendance Dashboard`).
    - If `CR`: link to `/cr` (`Back to CR Dashboard`).
  - Fix roll number wrapping: add `whitespace-nowrap font-mono shrink-0` to the roll number badge.
  - Add responsive mobile card layout for taking attendance:
    - On mobile (`sm:hidden`): render student cards with name, roll number, and 4 touch-friendly segmented status buttons (`Present`, `Absent`, `Late`, `Excused`).
    - On desktop (`hidden sm:table`): keep the refined table view.
  - Fix sticky bottom action bar:
    - Change `bottom-4` to `bottom-20 md:bottom-4 z-30` so it clears `MobileBottomNav` on mobile screens.
  - Fix search input squashing: wrap toolbar items with `min-w-0 flex-1` and ensure search bar has `min-w-[260px]`.
  - Add Section switcher pill / indicator.

## Phase 3: Resources & Uploads UI Polish
- [ ] In `src/features/subjects/components/tabs/resources-tab.tsx`:
  - Remove debug note: replace `"Browse by Units → Chapters. Uses relations courseUnits → courseChapters → resources. Read-only."` with clean, student-friendly copy.
- [ ] Verify `createResourceAction` in `src/features/resources/actions/resources.ts` succeeds with `uploadedBy: user.id`.
- [ ] Test resource upload in Playwright as Teacher and verify it appears in both `/teacher/resources` and `/subjects/[slug]?tab=resources`.

## Phase 4: Weekly Routine & Timeline River Refactor
- [ ] In `src/components/timetable/timeline-river.tsx`:
  - Refactor layout so the time markers and period pills align naturally:
    - Remove artificial static 52px hour gutter.
    - Render a connected vertical timeline where each node shows:
      - Period badge & exact time range (`6:25 AM – 7:15 AM`, duration).
      - Subject card with code, room, teacher name, status badge, and action button.
    - Support morning classes starting at 6:25 AM without clipping or offset error.
- [ ] In `src/app/(student)/today/page.tsx`:
  - Remove redundant subtitle repetition (`2083 Aswin 29 • Today` appearing twice consecutively).
- [ ] In `src/components/timetable/routine-view.tsx`:
  - In "Cards" view, set `min-w-[170px]` on day columns with `overflow-x-auto` to prevent day headers and titles from being truncated into `Mathemati...` and `THURSDAY • TO`.

## Phase 5: Verification & Pre-Commit Audit
- [ ] Run `npx tsc --noEmit` and confirm 0 errors.
- [ ] Run `npm run db:verify` and confirm 25/25 passing.
- [ ] Execute Playwright browser verification:
  - Capture screenshot of mobile attendance view (`390x844`).
  - Capture screenshot of desktop attendance view.
  - Capture screenshot of Teacher resource creation & library.
  - Capture screenshot of `/today` timeline stream.
  - Capture screenshot of `/routine` cards view.
- [ ] Invoke subagent verifiers: `CRVerifier`, `TeacherVerifier`, `StudentVerifier`.
- [ ] Update `LEARNINGS.md` with root causes and permanent countermeasures.
