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

---

## 🔄 Self-Improving Turn Protocol (Mandatory for All Agents)

Before completing any task or claiming success, you MUST:
1. **Check Cross-Role Sync:** Does this change affect CR, Student, Teacher, or Admin? Are their views synchronized?
2. **Run Strict Typecheck:** Execute `npx tsc --noEmit`. Zero TypeScript errors allowed.
3. **Log Learnings:** If a bug or design flaw was fixed, append the finding to this `LEARNINGS.md` file.
