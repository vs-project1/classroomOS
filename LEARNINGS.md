# Classroom OS — Self-Evolving System Learnings & Invariants Log

This file is a permanent, evolving knowledge base. Every agent working on Classroom OS MUST read and update this document when discovering bug patterns, domain conventions, or architecture invariants.

---

## 🏛️ Domain Architecture & Core Invariants

### 1. Unified Single Canonical Daily Attendance & Nepal Handwritten Homework Architecture
* **Single Source of Truth (`daily_sessions` & `daily_attendance`):**
  * Tables: `daily_sessions` (date, semester, markedBy) & `daily_attendance` (daily_session_id, student_id, status).
  * Unique constraint: `(date, semester)`.
  * Date must ALWAYS be normalized to UTC midnight representing start-of-day in Nepal Time (`Asia/Kathmandu`).
  * Used for: College-level records, monthly matrix ledger, student dashboard arc gauges, TU 80% eligibility barometer, and teacher semester rosters.
  * Terminology: Strictly "Attendance" (never "Roll Call", "Morning Roll Call", or "Subject-wise Attendance").
* **Decoupled Academic Lecture Logs (`class_sessions` & `lecture_logs`):**
  * Tables: `class_sessions` (subject_id, session_date, start_time, end_time) & `lecture_logs` (class_session_id, topics_covered, homework_assigned, notes).
  * Used for: Subject syllabus tracking, lecture notes, homework assignment records, and student catch-up journals.
  * Completely decoupled from student attendance: teachers and CRs log class topics and homework without taking or maintaining per-lecture attendance rosters.
* **Handwritten Homework Model (Nepal Context):**
  * Physical notebooks are the standard in Nepali college classrooms. ClassroomOS eliminates digital file uploads (`Dropzone`), online submissions, and grading rubrics.
  * Homework is tracked as a physical notebook diary (`Mark as Done in Notebook` / `Completed in Notebook`).
  * Pending dispute counters replace pending grading counters in teacher navigation and dashboard.
* **Attendance Correction (Dispute) Flow:**
  * Disputes (`attendance_correction_requests`) reference `dailyAttendance.id` directly.
  * Teachers reviewing disputes in their taught semester can approve or reject disputes, updating `dailyAttendance.status`.
* **Student Catch-up Journal (`/missed`):**
  * Queries absent/late days from `daily_attendance` and cross-references `class_sessions` and `lecture_logs` to show students exactly what was taught and assigned in their notebooks on those days.

### 2. Semester Representation Standard
* `student_profiles.semester`: Integer (e.g. `1`, `2`, `4`).
* `students.semester`: Ordinal Text (e.g. `"1st Semester"`, `"2nd Semester"`, `"4th Semester"`).
* `subjects.semester`: Roman Numeral (e.g. `"I"`, `"II"`, `"IV"`).
* **Rule:** Never compare `students.semester` directly to `subjects.semester`. Always use the canonical converter in `src/lib/utils/roman.ts` (`toRoman()`).

### 3. Date & Timezone Normalization (NPT - Asia/Kathmandu)
* Never call raw `new Date().toISOString()` or `new Date().getTime()` without timezone coercion for daily records.
* Always normalize calendar days via:
  ```ts
  const ymd = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kathmandu", ... }).format(date);
  const normalizedDate = new Date(`${ymd}T00:00:00Z`);
  ```
* Display dates using `formatNepaliDate(date, 'YYYY MMMM DD')` (Bikram Sambat) alongside Gregorian strings.

### 4. Base UI & React Controlled Component Invariants
* **Never pass dynamic runtime values directly to `defaultValue`** (e.g., `defaultValue={getNepaliTimeString()}` in component bodies).
* `@base-ui/react` flags this as switching between controlled/uncontrolled states on re-render.
* **Rule:** Wrap initial default values in `useMemo(() => ..., [])` or use controlled `value` with `onChange`.

---

## 🚫 Brutal Mistakes Log & Prevention Countermeasures

| # | Mistake / Bug Pattern | Root Cause | Mandatory Countermeasure |
| :--- | :--- | :--- | :--- |
| **01** | Taking roll call for a day didn't update Student Dashboard | Student dashboard and `/attendance` were hardcoded to only query `attendance` (lecture sessions) instead of `daily_attendance`. | Always verify cross-role presentation. If an action records data, audit the receiving role's queries immediately. |
| **02** | Hardcoded date prevented backdating attendance | `TakeDailyAttendancePage` used `new Date()` without a date picker. | All administrative data-entry interfaces must support an explicit, interactive date picker with auto-lookup of existing entries. |
| **03** | Submitting attendance on a saved date crashed with Unique Constraint | Server action tried to insert duplicate `daily_sessions` rather than updating existing records. | All daily ledger actions must be idempotent (Upsert / Delete-then-insert within transaction). |
| **04** | Windows CRLF string replacement truncated top imports | `replace_file_content` line math broke on CRLF files in Windows. | Use PowerShell here-strings or node scripts for multi-line edits. Always run `npx tsc --noEmit` before completing. |
| **05** | Empty roster bug due to string format mismatch | Querying `"4th Semester"` when seed inserted `"4th"` or vice-versa. | Use centralized normalization helpers and test against both seed and live database fixtures. |
| **06** | Shared widget link routed CR out of CR layout | `RecentResourcesWidget` hardcoded `href="/resources"` instead of accepting a parameterizable `href` / `viewAllHref` prop. | Always parameterize navigation links in shared cross-role dashboard components so each role maintains its active layout context. |
| **07** | Resource queries missed student fallback semester | `getStudentAccessibleSubjectIds` checked `studentProfiles.semester` but skipped `students.semester` ordinal string column. | Check both `studentProfiles.semester` and `students.semester` with string normalization when building fallback queries. |
| **08** | Teacher uploads didn't immediately refresh Student/CR Library Hubs | Server action `createResourceAction` revalidated `/teacher/resources` and `/subjects` but omitted `/resources` and `/cr/resources`. | Always include all consumer role paths in `revalidatePath` calls when an action mutates shared multi-role resources. |
| **09** | Session query failed with `LibSQLPreparedQuery` runtime error | SQLite `local.db` database was uninitialized / empty (0 tables created) before running session queries. | Run `npx drizzle-kit push` and `npm run db:seed` when initializing local database files or before starting dev server. |
| **10** | Full date-time string passed to routine slot status check marked all classes as Done | `nptTime` passed as `"2083 Bhadra 16, 08:21 AM"` evaluated `"2083..." > "09:30"` as true, marking all today slots completed. | `nptTime` for time-slot comparison must be formatted in 24-hour `"HH:mm"` time format (`new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Kathmandu", hour: "2-digit", minute: "2-digit", hour12: false }).format(new Date())`). |
| **11** | RoutineCard compact prop ignored in Weekly Grid view | `RoutineCard` accepted `compact` prop but didn't implement conditional layout/padding, causing text overflow in 7-column grid. | Explicitly implement compact styling (reduced padding, smaller typography, omitted notes) when building card components meant for dense multi-column grids. |
| **12** | Routine mutation server actions omitted Teacher and Admin portal revalidation | `saveRoutine` and `deleteRoutine` revalidated `/routine` but omitted `/teacher/routine` and `/admin/routine`. | Always include all consumer role paths (`/routine`, `/teacher/routine`, `/admin/routine`, `/today`, `/`) in `revalidatePath` calls when an action mutates shared timetable data. |
| **13** | Google Drive URLs rendered as generic download links | Google Slides and Google Drive URLs require URL parsing to extract `fileId` and build iframe embed URLs (`/embed` or `/preview`). | Always use `parseGoogleDriveUrl()` from `src/lib/google-drive.ts` when rendering resource previews across Teacher, Student, and CR roles. |
| **14** | Form submit button permanently disabled in newly added form mode | `canSubmit` evaluated `mode === "link"` instead of accounting for new `mode === "gdrive"`, keeping `canSubmit` false when uploading URL-based resources. | When adding new tab modes to a form, explicitly update `canSubmit` validation rules (e.g. `mode === "upload" ? Boolean(file) : Boolean(linkUrl.trim())`). |
| **15** | Seeded subjects defaulted to Semester I | `subjectsData` in `seed.ts` did not pass explicit `semester` properties, causing Drizzle to default all subjects to `"I"`. | Always specify explicit Roman numeral `semester` values (`"I"` through `"VIII"`) when populating subjects in database seed scripts. |
| **16** | Admin Account Edit didn't update Student/Teacher Name | Server actions `updateAccountAction` and `editUserAccountAction` queried `students`/`teachers` by `.where(eq(email, data.email))` matching the *new* submitted email on un-updated records, returning 0 rows. | Always query existing records by primary key `userId`, `studentProfiles.rollNumber`, or original email prior to updating, and update `users`, `studentProfiles`, and `students`/`teachers` atomically in a single transaction. |
| **17** | Semester badge string interpolation prepended "Sem" to already descriptive strings (e.g., "SEM 2ND SEMESTER") | UI badges mapped `teacher.semesters` using hardcoded \`Sem \${s}\` and CSS `uppercase`, resulting in duplicated semantic prefixes. | Use conditional string checks (`s.toUpperCase().includes('SEM') ? s : ...`) or pre-normalized getters when rendering text from variable database string columns. |
| **18** | Orphaned components and dead code left behind following consolidated feature refactoring | Migrating student homework to `HomeworkClientWorkspace` left `status-actions.tsx` orphaned, while refactoring capability checks left dead `can.ts` in `lib/authorization/`. | When replacing components or refactoring domain engines, immediately remove obsolete predecessor files, check for empty folders, and run `knip` or reference tracing before completing. |
| **19** | Admin Today's Schedule lacked semester segregation across 8 BCA cohorts | Admin dashboard rendered a single flat list of today's schedule for all classes, causing confusing mixed views when multiple cohorts operate on the same day. | Provide normalized semester filtering tabs (`All`, `Sem I` to `Sem VIII`) with live class count badges, semester pill indicators on cards, and shallow URL synchronization (`?semester=...`) so administrators can audit each cohort independently without full page reloads. |
| **20** | Unscheduled session logging and bundled attendance caused friction and runtime crashes on undefined props | Session logging forced teachers to take full-class attendance alongside lecture notes, allowed teachers to log sessions on unscheduled days, and crashed when `routineSlots` prop was omitted or undefined. | Decouple attendance taking to dedicated roll call routes (`/cr/take-attendance`), provide defensive default props (`routineSlots = []`), guard against undefined array operations, and strictly enforce on client and server that `TEACHER` users can only log sessions for subjects scheduled on that day of week in `weeklyRoutine`. |
| **21** | Back-to-back timetable periods caused duplicate session friction and DB unique constraint failure | Seeded timetables frequently schedule double periods of the same subject (e.g., discrete math period 1: 06:25–07:15 and period 2: 07:15–08:05). Logging them separately violated `unique("unq_class_session_subject_date")` and forced teachers to re-type identical lecture logs. | Merge adjacent timetable slots (`lastBlock.subjectId === slot.subjectId && lastBlock.endTime === slot.startTime`) into a unified `MergedClassBlock` spanning the full duration (`periodCount >= 2`) with locked routine timings passed via hidden form inputs. |
| **22** | SQLite runtime error `no such column: user_id` after adding schema foreign keys | Adding `userId: text("user_id")` to `students` and `teachers` in `src/db/schema.ts` without executing a database schema migration left the underlying SQLite tables missing the column on disk. | Always run an automated migration script (`ALTER TABLE ... ADD COLUMN ...`) and backfill foreign keys across existing records whenever schema columns are added or changed before running queries in runtime. |
| **23** | Route security gaps in `(student)` route group allowed regular students to access admin creation forms | `/notices/new`, `/events/new`, `/routine/new`, and `/routine/[id]/edit` were mounted under the `(student)` route group without page-level `requireAuth` calls, allowing students to access admin/teacher creation forms directly. | Apply defense-in-depth authorization: every creation or edit page under shared or client route groups must call `await requireAuth([...allowedRoles])` at the top of the server component, matching the server action's permission guards. |
| **24** | Dual-Layer Attendance pipeline disconnected: logged sessions never created `attendance` records | `createSession` server action recorded lecture logs and class sessions but never batch-inserted records into the `attendance` table, leaving student barometer gauges, teacher rosters, and dispute dialogs empty at 0%. | Ensure lecture logging atomically inserts student attendance records (`attendance` table) inside the database transaction, cross-referencing morning roll call (`daily_attendance`) to flag absentees, and synchronizing consumer paths via `revalidatePath`. |
| **25** | Telegram API unescaped HTML payload failures and multi-cohort token sprawl | Creating 8 separate bot tokens creates maintenance chaos, and raw user strings in messages break Telegram HTML parsing if `<` or `&` characters are unescaped. | Use a single central bot token with semester-to-chat mapping, escape HTML inputs (`escapeHtml`), and respect the 2-day weekend (Sat & Sun off) by suppressing morning alarms and using Sunday 8 PM as the official week kickoff briefing. |
| **26** | Profile page container lacked horizontal centering and card grid density | `max-w-3xl` container omitted `mx-auto w-full`, causing all profile cards to hug the left edge on desktop screens with 50% void on the right, while full-width row items created awkward whitespace gaps. | Always center constrained page wrappers (`max-w-4xl mx-auto w-full`), render key-value details in responsive 2-column tiles (`grid sm:grid-cols-2 gap-4`), and adapt titles to the signed-in role (Admin vs Student vs Teacher). |
| **27** | Routine edits blared indiscriminately or desynced Telegram cohorts | Sending automated messages on every micro-edit annoys students, while omitting manual broadcast leaves students with stale timetables. | Implement dual-state change detection via `last_routine_modified_at` vs `last_routine_published_at` on `semester_telegram_configs`. When edits/deletions occur, record modified timestamp without auto-spamming. Activate prominent `[ Publish Changes to Telegram ]` banners with `isUpdate` notice headers, clearing the banner immediately upon successful broadcast. |
| **28** | Production 500 error on `/admin` after deploying new schema features | Adding new schema tables (`telegram_settings`, `semester_telegram_configs`, `telegram_broadcast_logs`) and foreign keys (`students.user_id`, `teachers.user_id`) without running migrations against the remote production database (Turso) caused Next.js Server Components to throw unhandled `no such table` / `no such column` exceptions. | Ensure production builds hook into automated schema synchronization (`pnpm run build` runs `scripts/maintenance/migrate-schema-sync.ts`), and commit generated Drizzle migration files (`drizzle/0014_*.sql`) so production databases are always kept in sync. |
| **29** | Student dispute submission desynced after schema FK repointing to `dailyAttendance` | Changing `attendanceCorrectionRequests.attendanceId` foreign key to `dailyAttendance.id` left `submitAttendanceCorrectionAction` querying the legacy `attendance` table and attempting to join `classSessions.subjectId` for teacher notifications. | Align dispute server actions with `dailyAttendance`, locate the linked `dailySessions.semester`, and notify teachers who teach subjects in that cohort's semester. |
| **30** | SQLite `FOREIGN KEY constraint failed` when inserting attendance correction requests | SQLite enforces foreign keys declared on table creation on disk. When schema changed `attendance_correction_requests.attendanceId` to `dailyAttendance`, the table on disk still referenced `attendance(id)`. | Add table recreation with foreign key repointing to `daily_attendance` inside `scripts/maintenance/migrate-schema-sync.ts` and run `npm run db:sync` automatically during build. |
| **31** | Cross-cohort routine and homework leakage | Querying day-of-week timetable slots and homework without filtering by student cohort subjects caused students in Semester II to see subjects and homework from other semesters. | Timetable and homework queries must always filter at the database level using `inArray(weeklyRoutine.subjectId, allowedSubjectIds)`, failing closed with `[]` if the student cohort cannot be resolved. |
| **32** | Digital file upload and grading queue mismatch with Nepal educational context | Applying digital LMS file submission and rubric grading patterns in an environment where colleges use physical handwritten notebooks created friction and unnecessary UI overhead. | Align assignments with local classroom realities: students track homework in a handwritten notebook diary (`Mark as Done in Notebook` / `Completed in Notebook`), and pending disputes replace online grading queues in teacher navigation. |
| **33** | Raw multi-table Drizzle queries in presentation Server Components (`page.tsx`) | Writing complex 4-way joins, aggregations, and business logic directly in Next.js `page.tsx` files violated DAL architecture, bloated presentation files, and caused duplicate query patterns across roles. | Presentation server components must remain thin. Encapsulate all database queries and aggregations in dedicated feature query modules (`src/features/<feature>/queries.ts`) with typed return contracts. |

---

## 🔄 Self-Improving Turn Protocol (Mandatory for All Agents)

Before completing any task or claiming success, you MUST:
1. **Check Cross-Role Sync:** Does this change affect CR, Student, Teacher, or Admin? Are their views synchronized?
2. **Run Strict Typecheck:** Execute `npx tsc --noEmit`. Zero TypeScript errors allowed.
3. **Eliminate Dead Code & Orphaned Artifacts:** After every implementation, systematically inspect and delete any unreferenced components, dead helper functions, obsolete types, or commented-out code blocks.
4. **Log Learnings:** If a bug or design flaw was fixed, append the finding to this `LEARNINGS.md` file.
