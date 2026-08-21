# Technical Exploration Report: Student Dashboard, Today Timeline & Subjects Workspace

**Author**: `m3_exp_2` (Milestone 3 Explorer 2)  
**Date**: 2026-08-17  
**Scope**: F11 (Student Dashboard), F12 (Student Today Timeline), F13 (Subjects Workspace), F14 (Strict Subject Data Isolation), Attendance Barometer domain integration, and E2E test alignment.  
**Working Directory**: `D:\CLASSROOM OS\.agents\m3_exp_2`

---

## 1. Observation

### 1.1 Existing Codebase & Routing Inventory
1. **Student Dashboard (`src/app/(student)/page.tsx`)**:
   - Lines 12-22: Resolves student via `resolveCurrentStudent()` (`src/lib/auth/index.ts:41-66`), but does not yet directly utilize session-based `getCurrentUser()` (`src/lib/auth/session.ts:221-281`).
   - Lines 24-29: Determines Nepal Standard Time (`Asia/Kathmandu`) using `Intl.DateTimeFormat`.
   - Lines 32-60: Queries `weeklyRoutine`, `homework`, `notices`, and `attendance`.
   - Lines 64-68: Inline attendance percentage calculation `Math.round((presentClasses / totalClasses) * 100)` rather than invoking the centralized domain service `src/lib/attendance.ts`.
   - Lines 118: Renders greeting `h1` (`{greeting}, {firstName}`), matching POM `this.greetingHeader = page.locator("h1, h2").filter({ hasText: /Good (Morning|Afternoon|Evening)/i })`.
   - Lines 193-197: Renders `<span className="... animate-pulse">NOW</span>` for active classes.
   - Lines 283-295: Renders `<AttendanceGauge percentage={attendancePercentage} threshold={80}>`.

2. **Student Today Timeline (`src/app/(student)/today/page.tsx`)**:
   - Lines 26-60: Calculates NPT date and supports `?date=YYYY-MM-DD` query param.
   - Lines 72-79: Computes 7-day strip (Sunday through Saturday).
   - Lines 167-191: Renders day links using `<Link className="...">`, but lacks `data-testid="day-strip-btn"`. In `tests/fixtures/pom/today.page.ts:13`, `this.daySelectorButtons` queries `[data-testid='day-strip-btn'], button`.
   - Lines 114-135: Computes `status = "upcoming" | "ongoing" | "completed"`, but lines 202-261 **do not render explicit text badges** for `UPCOMING`, `ONGOING`, or `COMPLETED`. In `tests/e2e/dashboard-schedule.spec.ts:67-77`, `TC-SPEC-DASH-08` verifies `todayPage.upcomingBadges.or(todayPage.ongoingBadges).or(todayPage.completedBadges)`.

3. **Student Subjects Workspace (`src/app/(student)/subjects/`)**:
   - **Missing Directory**: `src/app/(student)/subjects/` does not currently exist.
   - Required routes:
     - `src/app/(student)/subjects/page.tsx`: Enrolled subjects grid for logged-in student.
     - `src/app/(student)/subjects/[id]/page.tsx`: Subject detail workspace with 4 tabs (Syllabus, Sessions, Assignments, Resources).
   - `src/components/student/student-sidebar.tsx:9-18`: `studentNavItems` lacks an entry for `"Subjects"` (`/subjects`).

4. **Database Schema & Relations (`src/db/schema.ts`)**:
   - `enrollments` (lines 280-297): Composite unique on `(student_id, subject_id)`, indexed by `student_id` and `subject_id`.
   - `courseUnits` (lines 183-198) & `courseChapters` (lines 200-215) & `courseMaterials` (lines 217-228): Structured hierarchy for Syllabus progress.
   - `classSessions` (lines 70-86) & `lectureLogs` (lines 88-100) & `attendance` (lines 102-118): Historical lecture log data.
   - `homework` (lines 120-143) & `assignmentSubmissions` (lines 300-333): Assignments per subject and student submissions.
   - `resources` (lines 390-414): Downloadable materials linked to `subject_id` and optional `chapter_id`.

5. **Test Specifications & Fixtures**:
   - `tests/e2e/dashboard-schedule.spec.ts`: Tests NPT greeting (TC-DASH-01), attendance gauge (TC-DASH-02), timetable (TC-DASH-03), assignments card (TC-DASH-04), pinned notices (TC-DASH-05), 7-day strip (TC-DASH-06), day navigation (TC-DASH-07), status tags (TC-DASH-08), live highlight (TC-DASH-09).
   - `tests/e2e/subject-isolation.spec.ts`: Tests subjects grid (TC-SUBJ-01), 4-tab detail view (TC-SUBJ-02), tab switching (TC-SUBJ-03), unauthorized enrollment isolation (TC-SUBJ-04: un-enrolled CSIT student accessing BCA DSA subject gets 404/403/redirect), non-existent subject 404 (TC-SUBJ-05), foreign submission URL isolation (TC-SUBJ-06).
   - `scripts/seed-e2e.ts:40-276`: Currently misses inserting rows into the `enrollments` table for test students (`sp_student_001` vs `sp_unauthorized_001`), which is required for isolation tests to pass.

---

## 2. Logic Chain

### 2.1 Architecture of Student Dashboard (`/`)
1. **Authentication & Identity Flow**:
   - Server Component `StudentDashboard()` calls `getCurrentUser()` from `@/lib/auth/session`.
   - If user is null, unauthenticated, or deactivated, `requireAuth(["STUDENT", "CR"])` handles redirection to `/login`.
   - Extracts student profile (`studentProfileId`) and resolves the corresponding `students` table record (`student.id`).
2. **NPT Timezone Normalization**:
   - Always query server date in `Asia/Kathmandu` (UTC+5:45).
   - Day of week (0 = Sunday to 6 = Saturday) determines today's routine slot query:
     `db.query.weeklyRoutine.findMany({ where: eq(weeklyRoutine.dayOfWeek, nptDayOfWeek) })`.
   - Current time string (`HH:mm`) compares against `routine.startTime` and `routine.endTime` to flag active session (`isCurrent = startTime <= nptTime && endTime >= nptTime`).
3. **Domain Integration**:
   - Pass attendance count to `calculateAttendanceMetrics(attendedCount, totalCount, breakdown, 80)` from `src/lib/attendance.ts`.
   - Render `<AttendanceGauge>` with returned percentage, threshold 80%, and status category (`SAFE`, `CAUTION`, `DANGER`).

### 2.2 Architecture of Today Schedule Timeline (`/today`)
1. **7-Day Strip Navigation**:
   - Compute the Sunday-Saturday or Monday-Sunday 7-day window containing selected date.
   - Render day items with `data-testid="day-strip-btn"` to satisfy Playwright POM `todayPage.daySelectorButtons`.
2. **Status Categorization**:
   - Compare `routine.startTime` and `routine.endTime` against NPT server time:
     - `COMPLETED`: Selected date is in the past, or current time > `routine.endTime`, or session already logged in `class_sessions`.
     - `ONGOING`: Selected date is today and `startTime <= currentNptTime <= endTime`.
     - `UPCOMING`: Selected date is in the future, or current time < `routine.startTime`.
   - Render distinct `<Badge>` with exact text labels: `UPCOMING` (outline/secondary), `ONGOING` (primary with pulse dot), `COMPLETED` (muted/emerald).

### 2.3 Architecture of Subjects Workspace (`/subjects` & `/subjects/[id]`)
1. **Enrolled Subjects Grid (`src/app/(student)/subjects/page.tsx`)**:
   - Resolves student `studentId`.
   - Queries `enrollments` table:
     ```typescript
     const userEnrollments = await db.query.enrollments.findMany({
       where: eq(enrollments.studentId, studentId),
       with: {
         subject: {
           with: {
             teacher: true,
             courseUnits: { with: { courseChapters: true } },
             homework: { where: eq(homework.status, "active") },
             resources: true,
           }
         }
       }
     });
     ```
   - Renders cards with `data-testid="subject-card"`, subject code (e.g. `CACS201`), subject name, teacher name, active assignments count, resource count, and link to `/subjects/[id]`.

2. **Subject Detail Workspace (`src/app/(student)/subjects/[id]/page.tsx`)**:
   - Route signature: `export default async function SubjectDetailPage({ params }: { params: Promise<{ id: string }> })`.
   - **Strict Data Isolation & Authorization**:
     ```typescript
     const { id: subjectId } = await params;
     const user = await requireAuth(["STUDENT", "CR", "ADMIN", "TEACHER"]);
     
     // 1. Verify subject exists
     const subject = await db.query.subjects.findFirst({
       where: eq(subjects.id, subjectId),
       with: { teacher: true }
     });
     if (!subject) {
       notFound(); // Returns 404
     }
     
     // 2. Strict enrollment check for students
     if (user.role === "STUDENT" || user.role === "CR") {
       const student = await resolveCurrentStudent();
       if (!student) notFound();
       
       const isEnrolled = await db.query.enrollments.findFirst({
         where: and(
           eq(enrollments.studentId, student.id),
           eq(enrollments.subjectId, subjectId)
         )
       });
       
       if (!isEnrolled) {
         // Return 403 Forbidden Access Denied or notFound()
         return <AccessDeniedView subjectCode={subject.code} />;
       }
     }
     ```
   - **4 Tab Layout** (using Base UI `Tabs` from `@/components/ui/tabs`):
     - **Tab 1: Syllabus Progress** (`tabSyllabus`):
       - Lists `courseUnits` and child `courseChapters`.
       - Displays chapter topic titles, hours, and materials attachments.
       - Shows unit completion progress bar.
     - **Tab 2: Sessions & Lecture Logs** (`tabSessions`):
       - Lists `classSessions` joined with `lectureLogs` and student `attendance`.
       - Renders cards with clear text "Topics Covered", "Session", lecture notes, and student attendance badge (Present/Absent).
     - **Tab 3: Assignments** (`tabAssignments`):
       - Lists `homework` for this subject, showing title, due date, status, and submission button.
     - **Tab 4: Resources** (`tabResources`):
       - Lists `resources` with file type icon, size, upload date, and download button with text "Materials", "Download", "Slides".

### 2.4 Attendance Domain Service (`src/lib/attendance.ts`)
Must be created to centralize TU 80% calculation across Dashboard, Attendance Hub, and Subjects:
- $\text{percentage} = \text{total} > 0 ? \frac{\text{attended}}{\text{total}} \times 100 : 100$
- $\text{missableSessions} = \max(0, \lfloor 1.25A - T \rfloor)$
- $\text{classesNeededToRecover} = \max(0, \lceil 4T - 5A \rceil)$
- $\text{category} = \text{percentage} \ge 80 ? \text{"SAFE"} : (\text{percentage} \ge 70 ? \text{"CAUTION"} : \text{"DANGER"})$

---

## 3. Caveats
1. **Async Params in Next.js 16 / React 19**:
   - `params` and `searchParams` in Next.js 16 App Router are Promises. Always use `const { id } = await params;` and `const { date } = await searchParams;`.
2. **Student Identity Mapping**:
   - The system links `users` -> `studentProfiles` (1:1 by `userId`) and `studentProfiles.rollNumber` -> `students.rollNumber`. In `scripts/seed-e2e.ts`, `students.id` is sometimes matching `studentProfile.id` (`sp_student_001`). Resolving student by matching both `email` and `rollNumber` ensures 100% reliability.
3. **Teacher / Admin Access to Subjects**:
   - If an Admin or Teacher navigates to `/subjects/[id]`, they should bypass student enrollment check and view the full workspace.
4. **E2E Seeding Requirement**:
   - `scripts/seed-e2e.ts` must insert `enrollments` records for `sp_student_001` (BCA subjects `subj_dsa_001`, `subj_dbms_001`, `subj_wt_001`) and `sp_unauthorized_001` (`subj_restricted_001`) so `TC-SPEC-SUBJ-01` and `TC-SPEC-SUBJ-04` pass reliably.

---

## 4. Conclusion & Recommendations

1. **Dashboard (`src/app/(student)/page.tsx`)**:
   - Integrate `src/lib/attendance.ts` domain service for attendance metrics.
   - Maintain NPT timezone accuracy and ensure all POM test IDs/locators (`live-class-card`, `upcoming-classes`, `active-assignments-card`, `pinned-notices`) are present.
2. **Today Timeline (`src/app/(student)/today/page.tsx`)**:
   - Add `data-testid="day-strip-btn"` to 7-day strip selector items.
   - Add explicit uppercase status badges (`UPCOMING`, `ONGOING`, `COMPLETED`) to each timeline class item.
3. **Subjects Workspace (`src/app/(student)/subjects/`)**:
   - Create `src/app/(student)/subjects/page.tsx` displaying enrolled subject cards (`data-testid="subject-card"`).
   - Create `src/app/(student)/subjects/[id]/page.tsx` with strict enrollment authorization check, returning 404/403 for un-enrolled students, and rendering 4 distinct tabs (Syllabus, Sessions, Assignments, Resources).
   - Add `"Subjects"` link to `src/components/student/student-sidebar.tsx`.
4. **Attendance Domain (`src/lib/attendance.ts`)**:
   - Implement `calculateAttendanceMetrics` and `projectAttendance` matching `PROJECT.md` interface contracts.
5. **E2E Seed Script (`scripts/seed-e2e.ts`)**:
   - Add enrollment seeding loop mapping `sp_student_001` to BCA subjects and `sp_unauthorized_001` to CSIT subject.

---

## 5. Verification Method

### 5.1 Playwright E2E Verification Commands
```powershell
# 1. Verify TypeScript compiles cleanly with 0 errors
npx tsc --noEmit

# 2. Run Dashboard & Today Schedule E2E test suite
npx playwright test tests/e2e/dashboard-schedule.spec.ts

# 3. Run Subjects & Data Isolation E2E test suite
npx playwright test tests/e2e/subject-isolation.spec.ts
```

### 5.2 Specific Test Invalidation Conditions
- **TC-SPEC-DASH-06 fails** if day selector items in `/today` do not have `data-testid="day-strip-btn"` or are not buttons/links matching weekday names.
- **TC-SPEC-DASH-08 fails** if session cards in `/today` do not render text containing `UPCOMING`, `ONGOING`, or `COMPLETED`.
- **TC-SPEC-SUBJ-01 fails** if `/subjects` returns 0 subject cards or cards do not match `[data-testid='subject-card']` or subject code patterns.
- **TC-SPEC-SUBJ-02/03 fails** if `/subjects/[id]` is missing tabs with text "Syllabus", "Sessions", "Assignments", "Resources", or if tab content lacks "Topics Covered" or "Materials".
- **TC-SPEC-SUBJ-04 fails** if an un-enrolled student accesses `/subjects/subj_dsa_001` and the server renders student notes instead of returning 404 or 403 / Access Denied.
