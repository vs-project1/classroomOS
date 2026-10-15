# Open-Source Audit Findings: Moodle LMS (moodle/moodle 6.0dev)

> **Evaluated Repository:** [`moodle/moodle`](https://github.com/moodle/moodle) (Cloned & Inspected: Branch `6.0dev`, Build 20261013)  
> **Compared Against:** [Classroom OS](file:///d:/CLASSROOM%20OS) (`CLASSROOM OS`)  
> **Target Focus:** Architectural design, Attendance tracking, Homework & File/Google Drive sharing, Advantages, Disadvantages, and Actionable Lessons.

---

## 1. System Overview & Core Philosophy

| Dimension | **Moodle LMS** (`moodle/moodle`) | **Classroom OS** (`CLASSROOM OS`) |
| :--- | :--- | :--- |
| **Primary Domain** | Asynchronous Virtual Learning Environment (VLE / LMS) | Synchronous In-Person College Operations (SIS + Companion) |
| **Tech Stack** | PHP 8.2+ Monolith, XMLDB, ADODB/PDO, Mustache templates, AMD/ESM | Next.js 16 App Router, React 19, TypeScript, Drizzle ORM, LibSQL/SQLite |
| **Core Entity Anchor** | The **Course** (`mdl_course`) | The **Cohort Semester & Daily Routine** (`weekly_routine`, `daily_sessions`) |
| **Student Submission Philosophy** | 100% digital artifacts (PDF/Doc uploads, online rich text) | Physical student notebook tracker (`Completed in notebook`) + digital link fallback |

---

## 2. Common Features & Implementation Differences

### 2.1 User & Identity Management
* **Moodle (`/public/user`, `/public/auth`):** Dynamic, tree-structured Capability Access Control (`accesslib.php`). Custom roles in `mdl_role` hold hundreds of capabilities evaluated at context levels (`System -> Category -> Course -> Activity`).
* **Classroom OS ([`src/lib/auth/rbac.ts`](file:///d:/CLASSROOM%20OS/src/lib/auth/rbac.ts)):** Fixed 4-role static enum (`ADMIN`, `TEACHER`, `CR`, `STUDENT`) with explicit boolean capabilities in `ROLE_PERMISSIONS`. Verified server-side via `requireAuth()`.

### 2.2 Course Hierarchy & Syllabus
* **Moodle (`/public/course`, `/public/course/format`):** `mdl_course` divided into sections (`mdl_course_sections`) supporting arbitrary activity modules and formats (`topics`, `weeks`, `social`).
* **Classroom OS ([`src/db/schema.ts#L203-L237`](file:///d:/CLASSROOM%20OS/src/db/schema.ts#L203-L237)):** Structured university model: `subjects` $\rightarrow$ `course_units` $\rightarrow$ `course_chapters` with a `covered_at` timestamp for real-time syllabus tracking.

### 2.3 Attendance Architecture
* **Moodle (`/mod/attendance`):** Not in core (community plugin). Attendance is **course-siloed**. If students attend 5 lectures on Monday, 5 separate teachers must log into 5 different course modules to take roll call. Status points roll directly into the course gradebook.
* **Classroom OS ([`src/db/schema.ts#L905-L949`](file:///d:/CLASSROOM%20OS/src/db/schema.ts#L905-L949)):** A single **canonical daily attendance ledger** (`daily_sessions` & `daily_attendance`), decoupled from lecture logs. Takes 30 seconds for the entire day, calculates the Tribhuvan University 80% exam eligibility rule, supports student Class Representative (`CR`) entry, and includes a formal dispute queue (`attendance_correction_requests`).

### 2.4 Homework & Google Drive Integration
* **Moodle (`/public/mod/assign`, `/public/repository/googledocs`):**
  * Submissions in `mdl_assign_submission` require digital files or online text.
  * Connects to Google Drive via an OAuth2 Service Account (`repository_googledocs/lib.php`).
  * Supports `FILE_INTERNAL` (downloads a snapshot into `moodledata/filedir`) and `FILE_CONTROLLED_LINK` (automatically changes Google Drive permissions to read-only upon submission so students cannot edit work after the deadline).
* **Classroom OS ([`src/features/assignments/actions/assignments.ts`](file:///d:/CLASSROOM%20OS/src/features/assignments/actions/assignments.ts)):**
  * First-class support for **physical student notebooks** (`toggleHomeworkCompletionAction`) allowing teachers to verify handwritten homework in class without digital scans.
  * For digital submissions, stores raw URL strings in `fileUrl`. This introduces vulnerabilities: private links throw 403 errors, students can edit Google Docs post-deadline, and broken links cannot be tracked.

---

## 3. What Moodle Has That Classroom OS Lacks
1. **Automated Quizzing & Question Bank (`mod_quiz`, `question/type/*`):** 15+ question types (MCQ, Cloze, calculation, drag-and-drop) with randomized pools, timed attempts, and automated grading.
2. **Activity Completion & Conditional Release (`completion/`, `availability/`):** Automated prerequisite unlocking (e.g. Unit 2 unlocks only if Quiz 1 score $\ge 80\%$).
3. **Course Archiving & Restore (`backup/`):** Zipped `.mbz` course package export/import to duplicate courses across semesters.
4. **Bulk Data Portability:** Seamless CSV user onboarding (`admin/tool/uploaduser`) and Excel gradebook export/import.
5. **Interoperability Standards:** Native support for LTI 1.3, SCORM packages, and interactive H5P modules.

---

## 4. What Classroom OS Has That Moodle Lacks
1. **Weekly Routine Noticeboard Timetable:** Dynamic period detection, recess divider, double-period merging (`col-span-2`), and responsive mobile `TimelineRiver`. Moodle has no concept of physical classroom periods.
2. **Single Canonical Daily Roll Call:** 1 daily entry for the cohort with statutory 80% TU exam eligibility tracking.
3. **Class Representative (CR) Role:** Student peer roll call and lecture logging when teachers are delayed.
4. **Physical Notebook Homework Workflow:** Eliminates digital upload friction for handwritten homework.
5. **Missed Day Catch-Up Journal:** Unified feed showing absent students what topics were taught and what homework was assigned on days they were away.
6. **Centralized Telegram Bot Automation:** 05:30 morning routine briefs, 20:00 evening homework recaps, and one-click timetable diff broadcasting.
7. **Bikram Sambat (BS) Localization:** Dual-calendar formatting (`nepali-datetime`) and NPT timezone normalization.
8. **Sub-100ms SPA/RSC Speed:** Instant client navigation via Next.js 16 and React 19 vs. Moodle's multi-second PHP page reloads.

---

## 5. Key Lessons for Classroom OS
* **Adopt:** Google Drive snapshotting (`FILE_INTERNAL` style) to lock digital homework at the deadline.
* **Adopt:** Formative practice quizzes for university board exam preparation.
* **Avoid:** Course-siloed attendance (never break our single daily roll call).
* **Avoid:** Mandatory digital upload rubrics that alienate physical paper-based classrooms.
* **Avoid:** Monolithic multi-tier plugin abstractions and XMLDB schemas.
