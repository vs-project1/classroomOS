# Specification: Attendance, Upload/Download, Weekly Routine & UI/UX Hardening

## 1. Problem Statement & Audit Findings

During exhaustive Playwright browser testing and adversarial audit across CR, Teacher, Student, and Admin portals, critical bugs and usability flaws were uncovered:

### A. Taking Attendance Deficiencies
1. **Mobile Unusability & Button Clipping**: On mobile viewports (e.g., iPhone 390x844), the table layout in `DailyAttendanceClient` fails to adapt. The four action buttons (`Present`, `Absent`, `Late`, `Excused`) overflow horizontally off-screen, completely unreachable without awkward swiping.
2. **Roll Number Badge Word Wrapping**: Student roll numbers (e.g., `2025-BCA-001`) wrap into 2 or 3 lines (`2025-` / `BCA-` / `001`) due to missing `whitespace-nowrap font-mono`.
3. **Mobile Sticky Action Bar Collision**: The sticky action bar (`bottom-4 z-20`) in `DailyAttendanceClient` collides with and renders underneath `MobileBottomNav` (`fixed bottom-0 z-40`), obscuring status summaries and the submit button.
4. **Role Desync in Back Links**: The back button on `/cr/take-attendance` unconditionally links to `/cr` (`← Back to CR Dashboard`). Teachers navigating from `/teacher/attendance` get trapped or redirected to `/teacher` on clicking Back.
5. **Multi-Section Inaccessibility**: `TakeDailyAttendancePage` defaults `section` strictly to `student?.section || "A"`. Teachers and Admins have no student profile, so they are locked to Section A and cannot select Section B. The UI lacks a Section indicator and switcher.
6. **Search Input Squashing**: In desktop viewports, the search input placeholder is squashed into `Search stu...` because the 6 filter pill buttons occupy excessive horizontal flex space.

### B. Uploading & Downloading Failures
1. **Fatal Foreign Key Mismatch in `resources`**: The SQLite table on disk has `FOREIGN KEY (uploaded_by) REFERENCES teachers(id)`. However, `src/db/schema.ts` and `createResourceAction` supply `user.id` (`users.id`). Whenever a teacher or admin attempts to add a resource, SQLite throws `SQLITE_CONSTRAINT: FOREIGN KEY constraint failed`, crashing all resource uploads across the entire application.
2. **Developer Debug Notes Leaked to Production UI**: In `src/features/subjects/components/tabs/resources-tab.tsx` line 98, internal debug text is displayed directly to students: `"Browse by Units → Chapters. Uses relations courseUnits → courseChapters → resources. Read-only."`
3. **Empty Resource Seed**: The seed script seeds 0 resources, leaving the entire 3-tier resource workspace empty and untestable in development.

### C. Weekly Routine & Timeline River Issues
1. **Severe Timeline Coordinate Desync on `/today`**: `TimelineRiver` renders a static hour gutter (7 AM to 4 PM, 52px rows), while the right-hand class cards are stacked with `space-y-3`. Consequently, early morning classes (7:15 AM, 8:05 AM) are displayed alongside `10 AM`, `12 PM`, and `2 PM`! Furthermore, BCA classes start at 6:25 AM, which falls outside the 7 AM start bound.
2. **Repetitive Header Copy on `/today`**: The page renders `Good evening, [Name]! 2083 Aswin 29 • Today` immediately followed by `Today's Schedule: 2083 Aswin 29 • Today`.
3. **Weekly Routine Cards View Truncation**: In `/routine` "Cards" view, 7 days are squeezed side-by-side into ~120px columns without minimum widths or horizontal scrolling, causing severe truncation of day headers (`THURSDAY • TO`) and subject titles (`Mathemati...`, `Discrete...`).

---

## 2. Technical Architecture & Solutions

### A. Taking Attendance Architecture
1. **Responsive Dual-Mode Roster**:
   - On desktop (`sm:table`), maintain a polished table with `whitespace-nowrap` on roll numbers, proper column sizing, and non-wrapping buttons.
   - On mobile (`sm:hidden`), render responsive student attendance cards:
     - Header: Avatar, Name, and Roll Number badge.
     - Controls: Full-width segmented status buttons (`Present`, `Absent`, `Late`, `Excused`) sized for touch thumbs.
2. **Mobile Sticky Action Bar Clearance**:
   - Style the sticky bottom bar with `bottom-20 md:bottom-4 z-30` so it comfortably clears the 56px `MobileBottomNav` on mobile screens.
3. **Contextual Role Back Navigation**:
   - In `TakeDailyAttendancePage`, pass `userRole: user.role` to `DailyAttendanceClient`.
   - If `TEACHER`, link to `/teacher/attendance` (`← Back to Faculty Attendance`).
   - If `ADMIN`, link to `/admin/attendance` (`← Back to Admin Attendance`).
   - If `CR`, link to `/cr` (`← Back to CR Dashboard`).
4. **Section Parameter Support**:
   - Read `searchParams.section` in `TakeDailyAttendancePage`.
   - Render a Section switcher / badge (`Section A` | `Section B`) when multiple sections exist.
5. **Search & Filter Bar Layout**:
   - Wrap the filter pills and search bar cleanly so the search input maintains `min-w-[240px]` and never truncates its placeholder.

### B. Resources & Uploading Architecture
1. **Recreate `resources` Table in `migrate-schema-sync.ts`**:
   - Recreate `resources` table so `uploaded_by` references `users(id) ON DELETE SET NULL`.
   - Map existing records `uploaded_by` from `teachers.id` to `users.id` via `teachers.user_id`.
2. **Clean UI Copy**:
   - Replace internal debug notes in `resources-tab.tsx` with clean user-facing copy: `"Browse lecture slides, syllabus notes, and study materials organized by units and chapters."`
3. **Seed Comprehensive Resources**:
   - Seed realistic syllabus resources across Discrete Structure, Computer Fundamentals, and Principles of Management.

### C. Weekly Routine & Timeline River Architecture
1. **Re-architect Timeline River**:
   - Replace static decoupled hour gutter with a coherent chronological class stream:
     - Left indicator: Period badge (`Period 1`, `Period 2`) with exact time range (`6:25 AM – 7:15 AM`, `50m duration`) and connected vertical timeline spine.
     - Center/Right: Subject card, teacher avatar/name, room, status pill, and action button.
   - This eliminates misalignment while supporting classes starting at 6:25 AM and variable duration blocks.
2. **Fix Routine Cards View**:
   - Add `min-w-[180px]` per day column with a smooth horizontal scroll container, preventing title truncation and header clipping.
3. **Clean Header on `/today`**:
   - Remove redundant subtitle repetition.

---

## 3. Verification Matrix
- **Typecheck**: `npx tsc --noEmit` must pass with 0 errors.
- **Database Suite**: `npm run db:verify` 25/25 tests passing.
- **Subagent Verification**:
  - `CRVerifier`: Verify CR roll call on desktop and mobile viewports.
  - `TeacherVerifier`: Verify Teacher resource upload, section selection, and back link.
  - `StudentVerifier`: Verify student timeline river and resource downloads.
- **Live Playwright Audit**: Capture before/after screenshots of:
  - Mobile take attendance view (`390x844`)
  - Desktop take attendance view
  - Teacher resources upload & library
  - Today timeline stream
  - Weekly routine cards view
