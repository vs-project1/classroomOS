# Classroom OS — Self-Evolving System Learnings & Invariants Log

This file is a permanent, evolving knowledge base. Every agent working on Classroom OS MUST read and update this document when discovering bug patterns, domain conventions, or architecture invariants.

---

## 🏛️ Domain Architecture & Core Invariants

### 1. Dual-Layer Attendance Architecture
* **Layer 1 (Administrative Morning Roll Call):**
  * Tables: `daily_sessions` (date, semester, markedBy) & `daily_attendance` (daily_session_id, student_id, status).
  * Unique constraint: `(date, semester)`.
  * Date must ALWAYS be normalized to UTC midnight representing start-of-day in Nepal Time (`Asia/Kathmandu`).
  * Used for: College-level records, monthly matrix ledger, student dashboard arc gauges, and overall eligibility streaks.
* **Layer 2 (Academic Lecture Logs):**
  * Tables: `class_sessions` (subject_id, session_date, start_time, topicsCovered) & `attendance` (class_session_id, student_id, status).
  * Used for: Subject syllabus progress, per-lecture attendance history, homework assignment logs, and dispute reviews.
* **Synchronization Bridge:**
  * When logging a lecture session (`/cr/log-session` or `/teacher/log-session`), the UI must cross-reference `daily_attendance` to flag students marked absent in morning roll call.

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

---

## 🔄 Self-Improving Turn Protocol (Mandatory for All Agents)

Before completing any task or claiming success, you MUST:
1. **Check Cross-Role Sync:** Does this change affect CR, Student, Teacher, or Admin? Are their views synchronized?
2. **Run Strict Typecheck:** Execute `npx tsc --noEmit`. Zero TypeScript errors allowed.
3. **Log Learnings:** If a bug or design flaw was fixed, append the finding to this `LEARNINGS.md` file.
