# Survey & Technical Design Report: Academic Domain, Student Views, Database Schema Extensions & E2E Testing

## 1. Observation

Direct examination of the codebase and workspace revealed the following structural and architectural facts:

1. **Database Schema & Constraints (`src/db/schema.ts`)**:
   - Currently defines tables: `teachers` (lines 7-20), `subjects` (lines 22-31), `students` (lines 33-44), `weeklyRoutine` (lines 46-68), `classSessions` (lines 70-86), `lectureLogs` (lines 88-100), `attendance` (lines 102-118), `homework` (lines 120-143), `notices` (lines 145-159), `events` (lines 161-179), `courseUnits` (lines 183-198), `courseChapters` (lines 200-215), and `courseMaterials` (lines 217-228).
   - Enforces SQLite `CHECK` constraints (e.g. line 66: `dayOfWeek BETWEEN 0 AND 6`, line 117: `status IN ('present', 'absent', 'late', 'excused')`, line 142: `status IN ('active', 'completed', 'archived')`) and composite unique constraints (e.g. line 115: `unq_attendance_session_student` on `(classSessionId, studentId)`).
   - Foreign key cascading is used extensively (`onDelete: "cascade"` for subjects -> weeklyRoutine, classSessions, homework, courseUnits; classSessions -> lectureLogs, attendance).
   - **Missing tables required for R1, R2, R3, R4**:
     - `users` (auth identity, password hash, role enum, `mustChangePassword`, `isActive`).
     - `student_profiles` (decoupling auth user from academic student records, or linking `userId` to `students`).
     - `enrollments` (student to subject mapping with composite unique key and cascade deletes).
     - `assignment_submissions` (student submission drafts, uploaded files, grades, feedback).
     - `exams` and `exam_results` (internal 40-mark assessment and terminal exams).
     - `resources` (subject/chapter files and reference links).
     - `study_tasks` (student personal tasks).
     - `notifications` (system and academic notifications).
     - `attendance_correction_requests` (student dispute/correction ticket flow).

2. **Existing Student Dashboard & Views**:
   - **Dashboard (`src/app/(student)/page.tsx`)**:
     - Uses `resolveCurrentStudent()` (lines 12, 34-51 of `src/lib/auth.ts`) which relies on `DEMO_STUDENT_ID` or takes the first student alphabetically.
     - Calculates timezone in NPT (`Asia/Kathmandu`) on lines 25-28.
     - Calculates attendance on lines 64-67 as `Math.round((presentClasses / totalClasses) * 100)`.
     - Displays Today's Schedule with "NOW" badge on lines 193-197.
     - Displays pending assignments and attendance gauge (`AttendanceGauge`).
   - **Today View (`src/app/(student)/today/page.tsx`)**:
     - Implements a 7-day week selector with NPT date parsing (lines 26-80).
     - Categorizes classes into `upcoming`, `ongoing`, `completed` based on `currentNptTime` and session logging status (lines 114-135).
   - **Attendance View (`src/app/(student)/attendance/page.tsx`)**:
     - Hardcodes safety buffer formula on line 77: `Math.max(0, Math.floor((presentClasses - (0.80 * totalClasses)) / 0.80))`.
     - Lacks a centralized, unit-tested domain service, What-If projection calculator, and the "Report Incorrect Attendance" correction request flow.
   - **Homework View (`src/app/(student)/homework/page.tsx`)**:
     - Shows `active`, `completed`, `archived` tabs, but does not support submission workflow, draft saving, UploadThing file uploads, grading review, or `Due Soon` / `Overdue` filtering.
   - **Subjects View (`/subjects` & `/subjects/[id]`)**:
     - Currently, `/admin/subjects` and `/admin/subjects/[id]` exist (lines 1-115 in `src/app/(admin)/admin/subjects/[id]/page.tsx`), but student-facing `/subjects` and `/subjects/[id]` routes do not exist.
     - Student route currently lacks data isolation checking for subject enrollment.

3. **Authentication & Role Infrastructure (`src/lib/auth.ts`)**:
   - Lines 6-15 read `APP_ROLE` cookie or environment variable.
   - Lacks real session-based user authentication, password hashing (`bcrypt`/`argon2` or Web Crypto `PBKDF2`), password expiration check, and user-to-student resolution.

4. **File Storage (`src/app/api/uploadthing/core.ts`)**:
   - UploadThing router is present with `courseMaterial` endpoint, accepting `pdf` (max 16MB) and `image` (max 4MB). Needs an `assignmentSubmission` endpoint for student file uploads (pdf, zip, docx, code).

5. **Database Seeding (`scripts/` and `src/db/`)**:
   - `src/db/seed.ts` does not yet exist. Current verification is performed through `scripts/verify-db.ts` and `scripts/verify-session-transaction.ts`.

---

## 2. Logic Chain & Technical Specifications

### A. TU 80% Attendance Barometer Domain Service & What-If Calculator

#### 1. Mathematical Formulation
Tribhuvan University (TU) Institute of Science and Technology (IOST) and Faculty of Humanities & Social Sciences (FOHSS - BCA) strictly mandate **80% minimum attendance** in theory and practical sessions to qualify for semester final examinations.

Let:
- $T \in \mathbb{N}_0$ be the **total conducted class sessions** for a given subject (or aggregated across all subjects).
- $A \in \mathbb{N}_0$ be the **total attended class sessions** where attendance status is `'present'` (with $0 \le A \le T$).
- $P$ be the current attendance percentage:
  $$P = \begin{cases} 100.0 & \text{if } T = 0 \\ \frac{A}{T} \times 100 & \text{if } T > 0 \end{cases}$$

#### 2. Status Categorization
- **`SAFE`**: $P \ge 80.0\%$ (Meets or exceeds TU requirement).
- **`CAUTION`**: $75.0\% \le P < 80.0\%$ (Borderline; slight absence will cause disqualification).
- **`DANGER`**: $P < 75.0\%$ (Disqualified from TU board examination unless recovered).

#### 3. Safety Buffer Calculation ($P \ge 80\%$)
Determines the maximum number of consecutive future classes $M \in \mathbb{N}_0$ a student can afford to miss while maintaining $P \ge 80.0\%$:
$$\frac{A}{T + M} \ge 0.80 \iff A \ge 0.80(T + M) \iff 0.80 M \le A - 0.80 T \iff M \le \frac{A - 0.80 T}{0.80} = 1.25 A - T$$
$$M_{\text{max}} = \max\left(0, \lfloor 1.25 A - T \rfloor\right)$$

*Example*: $T = 20, A = 18$ ($90\%$). $M_{\text{max}} = \lfloor 1.25(18) - 20 \rfloor = \lfloor 22.5 - 20 \rfloor = 2$ classes.
If they miss 2 classes: $A = 18, T = 22 \implies 18/22 = 81.8\% \ge 80\%$.

#### 4. Recovery Target Calculation ($P < 80\%$)
Determines the minimum number of consecutive future classes $C \in \mathbb{N}_0$ a student must attend (without missing any) to reach $P \ge 80.0\%$:
$$\frac{A + C}{T + C} \ge 0.80 \iff A + C \ge 0.80 T + 0.80 C \iff 0.20 C \ge 0.80 T - A \iff C \ge \frac{0.80 T - A}{0.20} = 4 T - 5 A$$
$$C_{\text{min}} = \max\left(0, \lceil 4 T - 5 A \rceil\right) = \max\left(0, 4 T - 5 A\right)$$

*Example*: $T = 20, A = 14$ ($70\%$). $C_{\text{min}} = 4(20) - 5(14) = 80 - 70 = 10$ classes.
If they attend 10 consecutive classes: $A' = 24, T' = 30 \implies 24/30 = 80.0\%$.

#### 5. Interactive "What-If" Projection Calculator
Given student simulation parameters:
- $a_{\text{plan}} \in \mathbb{N}_0$ (classes student plans to attend)
- $m_{\text{plan}} \in \mathbb{N}_0$ (classes student plans to miss)

Projected metrics:
- $T_{\text{proj}} = T + a_{\text{plan}} + m_{\text{plan}}$
- $A_{\text{proj}} = A + a_{\text{plan}}$
- $P_{\text{proj}} = \begin{cases} 100.0 & \text{if } T_{\text{proj}} = 0 \\ \frac{A_{\text{proj}}}{T_{\text{proj}}} \times 100 & \text{if } T_{\text{proj}} > 0 \end{cases}$
- $\Delta P = P_{\text{proj}} - P$
- Projected Category: `SAFE` ($P_{\text{proj}} \ge 80\%$), `CAUTION` ($75\% \le P_{\text{proj}} < 80\%$), `DANGER` ($P_{\text{proj}} < 75\%$).

#### 6. Domain Service API Architecture (`src/lib/attendance.ts`)
```typescript
export type AttendanceStatusCategory = "SAFE" | "CAUTION" | "DANGER";

export interface AttendanceMetrics {
  totalSessions: number;
  attendedSessions: number;
  absentSessions: number;
  lateSessions: number;
  excusedSessions: number;
  percentage: number;
  category: AttendanceStatusCategory;
  missableSessions: number;     // When >= 80%
  classesNeededToRecover: number; // When < 80%
  threshold: number;             // Default 80
}

export interface AttendanceProjectionInput {
  attended: number;
  total: number;
  plannedAttended: number;
  plannedMissed: number;
  threshold?: number;
}

export interface AttendanceProjectionResult {
  currentPercentage: number;
  currentCategory: AttendanceStatusCategory;
  projectedAttended: number;
  projectedTotal: number;
  projectedPercentage: number;
  projectedCategory: AttendanceStatusCategory;
  percentageDelta: number;
  missableSessions: number;
  classesNeededToRecover: number;
}

export function calculateAttendanceMetrics(
  attended: number,
  total: number,
  breakdown?: { late?: number; excused?: number; absent?: number },
  threshold = 80
): AttendanceMetrics {
  const safeTotal = Math.max(0, total);
  const safeAttended = Math.min(safeTotal, Math.max(0, attended));
  
  if (safeTotal === 0) {
    return {
      totalSessions: 0,
      attendedSessions: 0,
      absentSessions: 0,
      lateSessions: 0,
      excusedSessions: 0,
      percentage: 100,
      category: "SAFE",
      missableSessions: 0,
      classesNeededToRecover: 0,
      threshold,
    };
  }

  const rawPercentage = (safeAttended / safeTotal) * 100;
  const percentage = Math.round(rawPercentage * 10) / 10; // 1 decimal place

  let category: AttendanceStatusCategory = "SAFE";
  if (percentage < 75) {
    category = "DANGER";
  } else if (percentage < threshold) {
    category = "CAUTION";
  }

  const missableSessions = Math.max(0, Math.floor((safeAttended - (threshold / 100) * safeTotal) / (threshold / 100)));
  const classesNeededToRecover = Math.max(0, Math.ceil(((threshold / 100) * safeTotal - safeAttended) / (1 - threshold / 100)));

  return {
    totalSessions: safeTotal,
    attendedSessions: safeAttended,
    absentSessions: breakdown?.absent ?? (safeTotal - safeAttended),
    lateSessions: breakdown?.late ?? 0,
    excusedSessions: breakdown?.excused ?? 0,
    percentage,
    category,
    missableSessions,
    classesNeededToRecover,
    threshold,
  };
}
```

---

### B. Primary Student Views Architecture

#### 1. Dashboard (`/`)
- **Server Execution & Timezone**:
  - Evaluate current time in `Asia/Kathmandu` (NPT) via `Intl.DateTimeFormat`.
  - Greeting logic:
    - 04:00 – 11:59: "Good morning"
    - 12:00 – 16:59: "Good afternoon"
    - 17:00 – 03:59: "Good evening"
- **Live Class Card ("NOW" badge)**:
  - Query `weeklyRoutine` where `dayOfWeek === nptDayOfWeek` ordered by `startTime`.
  - If `routine.startTime <= nptTime <= routine.endTime`:
    - Mark with glowing `"NOW"` badge.
    - Show room, teacher, subject name, and live status.
- **Next Classes & Schedule**:
  - List remaining classes for today with relative countdown ("Starts in 25 min").
  - If all classes ended, show "Classes for today have ended."
- **Attendance Barometer Card**:
  - Visual circular gauge with percentage.
  - Badge with `SAFE` (green), `CAUTION` (amber), `DANGER` (red).
  - Safety buffer message: `+X Missable Sessions` or `Need X classes to reach 80%`.
  - Direct CTA to `/attendance`.
- **Assignment Overview Card**:
  - Count of `Active`, `Due Soon` (< 48 hours), `Overdue`.
  - Top 3 urgent deadlines with direct link to submission.
- **Pinned Notice Board**:
  - Up to 3 active notices, prioritizing pinned notices (`isPinned = true`).

#### 2. Today View (`/today`)
- **7-Day Selector Strip**:
  - Shows current week from Sunday to Saturday.
  - Active date highlighted.
  - Quick navigation: Prev Day, Today (NPT), Next Day.
- **Class Timeline Categorization**:
  - `UPCOMING`: Time slot is in the future.
  - `ONGOING`: Current NPT time falls between `startTime` and `endTime`.
  - `COMPLETED`: Time slot has passed or a `classSession` record exists.
- **Role-Aware Actions**:
  - Student: "View Log" (links to `/sessions/[id]`) if logged, else "Not logged".
  - CR/Teacher: "Log Session" button initiating session creation.

#### 3. Subjects View (`/subjects` & `/subjects/[id]`)
- **Index (`/subjects`)**:
  - **Data Isolation**: Query `enrollments` for `currentStudent.id`. Only render enrolled subjects.
  - Grid card elements: Subject Name, Code, Credit Hours, Teacher Name & Avatar, Subject Attendance Gauge (e.g. 85%), Active Assignments count.
- **Detail (`/subjects/[id]`)**:
  - **Authorization Guard**: Check `enrollments` table. If `studentId` does not have an enrollment record for `id` (and role is not ADMIN/TEACHER), trigger Next.js `notFound()` or return 403 Forbidden.
  - **Tab 1: Syllabus Progress**:
    - Hierarchical tree: `courseUnits` $\rightarrow$ `courseChapters` $\rightarrow$ `courseMaterials`.
    - Total chapter completion indicator.
  - **Tab 2: Sessions & Lecture Logs**:
    - Chronological list of logged sessions for this subject.
    - Topics covered, teacher notes, homework assigned, session date and time.
  - **Tab 3: Assignments**:
    - List of assignments linked to this subject.
    - Student's personal submission status (`Draft`, `Submitted`, `Graded`, `Missing`).
  - **Tab 4: Resources**:
    - Course slides, past questions, syllabus PDFs, lab manuals.
    - Download link, file type badge, file size, upload timestamp.

#### 4. Attendance View (`/attendance`)
- **Overall Barometer**:
  - Large SVG/Canvas Gauge with color-coded safety ring.
  - Summary metrics: Attended count, Total count, Missable classes / Classes required to reach 80%.
- **Interactive "What-If" Calculator**:
  - Sliders / number inputs:
    - "Classes you plan to attend (+A)"
    - "Classes you plan to miss (+M)"
  - Real-time reactive computation of projected percentage and projected SAFE/CAUTION/DANGER status.
- **Subject-Wise Breakdown Matrix**:
  - Table: Subject Name & Code, Attended, Total, Percentage Progress Bar, Status Badge.
- **Attendance History Log**:
  - Table of all individual session attendances with date, subject, slot, status (`present`, `absent`, `late`, `excused`).
  - Row Action: **"Report Incorrect Attendance"** button.
- **"Report Incorrect Attendance" Flow**:
  - Dialog modal with pre-selected Session ID and Subject.
  - Form Fields:
    - Requested Status (`present` or `excused`).
    - Reason / Explanation (Zod validated: min 10 characters).
    - Evidence / Note.
  - Server Action: inserts into `attendance_correction_requests` with status `'pending'`.
  - Updates UI with pending dispute badge on the corresponding record.

#### 5. Homework / Assignments (`/homework`)
- **Clear Conceptual Distinction**:
  - **Daily Homework**: Recorded in `lectureLogs.homework` (informal recap / reading).
  - **Assignments**: Managed in `homework` and `assignment_submissions` tables (compulsory evaluated tasks).
- **Tabs**:
  1. `Active` (all open assignments).
  2. `Due Soon` (due in $\le 48$ hours).
  3. `Overdue` (due date passed without submission).
  4. `Submitted` (submitted by student, awaiting grading).
  5. `Graded` (reviewed with score and feedback).
- **Submission Workflow**:
  - Open assignment modal / drawer.
  - Draft state: Student can save text notes / solution as `draft` without submitting.
  - File Attachment: Upload file via UploadThing (PDF, ZIP, DOCX, Code, max 16MB).
  - Submit action: Changes status to `'submitted'`, sets `submittedAt = new Date()`.
  - Resubmission / retry allowed before due date if enabled.
  - Graded state display: Displays obtained marks, max marks, teacher feedback notes, and evaluation timestamp.

---

### C. Database Schema Extensions (`src/db/schema.ts`)

Here is the exact schema extension design conforming to radical simplicity, SQLite `CHECK` constraints, composite unique keys, and cascading foreign keys:

```typescript
// 1. User Identity & Authentication
export const users = sqliteTable("users", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  role: text("role").notNull().default("STUDENT"),
  mustChangePassword: integer("must_change_password", { mode: "boolean" }).notNull().default(true),
  isActive: integer("is_active", { mode: "boolean" }).notNull().default(true),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull().default(sql`(unixepoch())`),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull().default(sql`(unixepoch())`),
}, (table) => [
  index("idx_users_email").on(table.email),
  index("idx_users_role").on(table.role),
  check("chk_users_role", sql`${table.role} IN ('ADMIN', 'TEACHER', 'CR', 'STUDENT')`),
]);

// 2. Student Profiles (Decoupled from Auth)
export const studentProfiles = sqliteTable("student_profiles", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().unique().references(() => users.id, { onDelete: "cascade" }),
  rollNumber: text("roll_number").notNull().unique(),
  faculty: text("faculty").notNull().default("BCA"),
  semester: text("semester").notNull().default("1st Semester"),
  section: text("section").notNull().default("A"),
  batchYear: text("batch_year").notNull().default("2024"),
  phone: text("phone"),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull().default(sql`(unixepoch())`),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull().default(sql`(unixepoch())`),
}, (table) => [
  index("idx_student_profiles_roll").on(table.rollNumber),
  index("idx_student_profiles_faculty_sem").on(table.faculty, table.semester),
]);

// 3. Subject Enrollments
export const enrollments = sqliteTable("enrollments", {
  id: text("id").primaryKey(),
  studentId: text("student_id").notNull().references(() => students.id, { onDelete: "cascade" }),
  subjectId: text("subject_id").notNull().references(() => subjects.id, { onDelete: "cascade" }),
  semester: text("semester").notNull().default("1st Semester"),
  enrolledAt: integer("enrolled_at", { mode: "timestamp" }).notNull().default(sql`(unixepoch())`),
}, (table) => [
  unique("unq_enrollment_student_subject").on(table.studentId, table.subjectId),
  index("idx_enrollments_student").on(table.studentId),
  index("idx_enrollments_subject").on(table.subjectId),
]);

// 4. Assignment Submissions
export const assignmentSubmissions = sqliteTable("assignment_submissions", {
  id: text("id").primaryKey(),
  homeworkId: text("homework_id").notNull().references(() => homework.id, { onDelete: "cascade" }),
  studentId: text("student_id").notNull().references(() => students.id, { onDelete: "cascade" }),
  content: text("content"),
  fileUrl: text("file_url"),
  fileName: text("file_name"),
  fileSize: integer("file_size"),
  status: text("status").notNull().default("draft"),
  submittedAt: integer("submitted_at", { mode: "timestamp" }),
  grade: text("grade"),
  score: integer("score"),
  feedback: text("feedback"),
  gradedBy: text("graded_by").references(() => users.id, { onDelete: "set null" }),
  gradedAt: integer("graded_at", { mode: "timestamp" }),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull().default(sql`(unixepoch())`),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull().default(sql`(unixepoch())`),
}, (table) => [
  unique("unq_submission_homework_student").on(table.homeworkId, table.studentId),
  index("idx_submissions_homework").on(table.homeworkId),
  index("idx_submissions_student").on(table.studentId),
  index("idx_submissions_status").on(table.status),
  check("chk_submission_status", sql`${table.status} IN ('draft', 'submitted', 'graded', 'late')`),
]);

// 5. Exams & Internal Assessments (40-mark TU internal evaluation)
export const exams = sqliteTable("exams", {
  id: text("id").primaryKey(),
  subjectId: text("subject_id").notNull().references(() => subjects.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  examType: text("exam_type").notNull().default("unit_test"),
  totalMarks: integer("total_marks").notNull().default(40),
  passMarks: integer("pass_marks").notNull().default(16),
  examDate: integer("exam_date", { mode: "timestamp" }).notNull(),
  startTime: text("start_time"),
  endTime: text("end_time"),
  room: text("room"),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull().default(sql`(unixepoch())`),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull().default(sql`(unixepoch())`),
}, (table) => [
  index("idx_exams_subject_date").on(table.subjectId, table.examDate),
  check("chk_exam_type", sql`${table.examType} IN ('unit_test', 'midterm', 'pre_board', 'practical', 'final')`),
]);

// 6. Exam Results
export const examResults = sqliteTable("exam_results", {
  id: text("id").primaryKey(),
  examId: text("exam_id").notNull().references(() => exams.id, { onDelete: "cascade" }),
  studentId: text("student_id").notNull().references(() => students.id, { onDelete: "cascade" }),
  obtainedMarks: integer("obtained_marks").notNull(),
  isAbsent: integer("is_absent", { mode: "boolean" }).notNull().default(false),
  remarks: text("remarks"),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull().default(sql`(unixepoch())`),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull().default(sql`(unixepoch())`),
}, (table) => [
  unique("unq_exam_results_exam_student").on(table.examId, table.studentId),
  index("idx_exam_results_student").on(table.studentId),
]);

// 7. Subject Resources & References
export const resources = sqliteTable("resources", {
  id: text("id").primaryKey(),
  subjectId: text("subject_id").notNull().references(() => subjects.id, { onDelete: "cascade" }),
  chapterId: text("chapter_id").references(() => courseChapters.id, { onDelete: "set null" }),
  title: text("title").notNull(),
  description: text("description"),
  fileUrl: text("file_url").notNull(),
  fileType: text("file_type").notNull().default("pdf"),
  fileSize: integer("file_size"),
  uploadedBy: text("uploaded_by").references(() => users.id, { onDelete: "set null" }),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull().default(sql`(unixepoch())`),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull().default(sql`(unixepoch())`),
}, (table) => [
  index("idx_resources_subject").on(table.subjectId),
  index("idx_resources_chapter").on(table.chapterId),
]);

// 8. Student Personal Study Tasks
export const studyTasks = sqliteTable("study_tasks", {
  id: text("id").primaryKey(),
  studentId: text("student_id").notNull().references(() => students.id, { onDelete: "cascade" }),
  subjectId: text("subject_id").references(() => subjects.id, { onDelete: "set null" }),
  title: text("title").notNull(),
  description: text("description"),
  dueDate: integer("due_date", { mode: "timestamp" }),
  status: text("status").notNull().default("pending"),
  priority: text("priority").notNull().default("medium"),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull().default(sql`(unixepoch())`),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull().default(sql`(unixepoch())`),
}, (table) => [
  index("idx_study_tasks_student_status").on(table.studentId, table.status),
  check("chk_study_tasks_status", sql`${table.status} IN ('pending', 'in_progress', 'completed')`),
  check("chk_study_tasks_priority", sql`${table.priority} IN ('low', 'medium', 'high')`),
]);

// 9. Notifications
export const notifications = sqliteTable("notifications", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  message: text("message").notNull(),
  type: text("type").notNull().default("system"),
  link: text("link"),
  isRead: integer("is_read", { mode: "boolean" }).notNull().default(false),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull().default(sql`(unixepoch())`),
}, (table) => [
  index("idx_notifications_user_read").on(table.userId, table.isRead),
  check("chk_notifications_type", sql`${table.type} IN ('system', 'assignment', 'attendance', 'notice', 'exam', 'correction_request')`),
]);

// 10. Attendance Correction Requests
export const attendanceCorrectionRequests = sqliteTable("attendance_correction_requests", {
  id: text("id").primaryKey(),
  attendanceId: text("attendance_id").notNull().references(() => attendance.id, { onDelete: "cascade" }),
  studentId: text("student_id").notNull().references(() => students.id, { onDelete: "cascade" }),
  requestedStatus: text("requested_status").notNull().default("present"),
  reason: text("reason").notNull(),
  status: text("status").notNull().default("pending"),
  reviewedBy: text("reviewed_by").references(() => users.id, { onDelete: "set null" }),
  reviewNote: text("review_note"),
  reviewedAt: integer("reviewed_at", { mode: "timestamp" }),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull().default(sql`(unixepoch())`),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull().default(sql`(unixepoch())`),
}, (table) => [
  index("idx_att_correction_student").on(table.studentId),
  index("idx_att_correction_status").on(table.status),
  check("chk_att_correction_req_status", sql`${table.requestedStatus} IN ('present', 'excused')`),
  check("chk_att_correction_status", sql`${table.status} IN ('pending', 'approved', 'rejected')`),
]);
```

---

### D. Comprehensive Seeding Script Strategy (`src/db/seed.ts`)

The seed script will populate a realistic academic semester (e.g. TU BCA 4th Semester):

1. **Users & Credentials**:
   - `admin@classroom.os` (Role: ADMIN, Password: `AdminPassword123!`, mustChangePassword: false)
   - `rajesh.shrestha@classroom.os` (Role: TEACHER, DBMS)
   - `sunita.sharma@classroom.os` (Role: TEACHER, Operating Systems)
   - `bishal.thapa@classroom.os` (Role: TEACHER, Web Technology II)
   - `anjali.adhikari@classroom.os` (Role: TEACHER, Numerical Methods)
   - `aarav.joshi.cr@classroom.os` (Role: CR, Password: `TempPassword123!`, mustChangePassword: true)
   - 8 Student Accounts (`bipana@...`, `rohan@...`, `sneha@...`, `niraj@...`, `puja@...`, `dipen@...`, `kriti@...`, `kiran@...`).

2. **Subjects & Faculty Assignments**:
   - `CACS251`: Database Management System (Prof. Rajesh Shrestha)
   - `CACS252`: Operating Systems (Er. Sunita Sharma)
   - `CACS253`: Web Technology II (Dr. Bishal Thapa)
   - `CACS254`: Numerical Methods (Ms. Anjali Adhikari)
   - `CACS255`: Software Engineering (Prof. Rajesh Shrestha)

3. **Routine**:
   - 5 slots/day across Sunday to Thursday (07:00–08:30, 08:45–10:15, 10:30–12:00).

4. **Class Sessions & Lecture Logs**:
   - 3 past weeks (15 teaching days), totaling 45 conducted sessions with realistic topic notes (e.g., "BCNF Decomposition", "Deadlock Prevention Banker's Algorithm", "React Hooks & Virtual DOM", "Newton-Raphson Method").

5. **Diverse Attendance Distributions**:
   - **Student 1 (Aarav Joshi - CR)**: 42/45 attended ($93.3\%$) $\rightarrow$ **SAFE ZONE** (+6 missable).
   - **Student 2 (Bipana Adhikari)**: 38/45 attended ($84.4\%$) $\rightarrow$ **SAFE ZONE** (+2 missable).
   - **Student 3 (Rohan Shrestha)**: 35/45 attended ($77.8\%$) $\rightarrow$ **CAUTION ZONE** (Needs 5 classes to reach 80%).
   - **Student 4 (Sneha Sharma)**: 28/45 attended ($62.2\%$) $\rightarrow$ **DANGER ZONE** (Needs 34 classes to reach 80%).
   - **Student 5 (Niraj Karki)**: 40/45 attended ($88.9\%$) $\rightarrow$ **SAFE ZONE**.
   - **Student 6 (Puja KC)**: 34/45 attended ($75.6\%$) $\rightarrow$ **CAUTION ZONE**.
   - **Student 7 (Dipen Tamang)**: 24/45 attended ($53.3\%$) $\rightarrow$ **DANGER ZONE**.
   - **Student 8 (Kriti Maharjan)**: 45/45 attended ($100.0\%$) $\rightarrow$ **PERFECT ATTENDANCE**.

6. **Assignments & Submissions**:
   - 6 Assignments across subjects:
     - Assignment 1: "ER Diagram & SQL Schema for Hospital Management" (DBMS, Overdue)
     - Assignment 2: "Process Scheduling Simulation in C/C++" (OS, Due Soon)
     - Assignment 3: "Full-stack Next.js Blog with SQLite" (Web Tech, Active)
     - Assignment 4: "Numerical Integration using Simpson's 1/3 Rule" (Numerical Methods, Graded)
     - Assignment 5: "Software Requirement Specification (SRS) Document" (Software Eng, Graded)
     - Assignment 6: "Query Optimization & Indexing Lab Report" (DBMS, Active)
   - Submissions across statuses: Drafts, Submitted, Graded (with scores and feedback comments).

7. **Notices, Events, Course Materials, and Correction Requests**:
   - 1 Pinned Notice: "TU BCA 4th Semester Board Examination Form Deadline".
   - 2 Active Notices: "Upcoming Hackathon 2026", "Guest Lecture on Cloud Infrastructure".
   - 2 Events: "Pre-Board Exam Week", "Sports Week 2026".
   - Units, Chapters, and Resources with downloadable PDFs and sample slides.
   - Attendance Correction Requests: 1 Pending, 1 Approved, 1 Rejected.

---

### E. Playwright E2E Testing Strategy

The end-to-end testing suite will be configured with `@playwright/test` and organized into 5 dedicated spec files:

```
tests/e2e/
├── auth-lifecycle.spec.ts
├── dashboard-schedule.spec.ts
├── attendance-barometer.spec.ts
├── homework-submissions.spec.ts
└── subject-isolation.spec.ts
```

#### Test Flow Specifications:

1. **`auth-lifecycle.spec.ts`**:
   - **Scenario 1: Admin Creates Account**:
     - Admin logs in with `admin@classroom.os` / `AdminPassword123!`.
     - Navigates to `/admin/accounts` (or `/admin/students`).
     - Submits new student form (Name: "Pooja Test", Email: "pooja.test@classroom.os", Roll: "2024-BCA-99").
     - Asserts temporary password is generated and displayed.
   - **Scenario 2: First-Time Login & Forced Password Change**:
     - Student logs in with temporary password.
     - System automatically redirects to `/change-password` (blocking dashboard access).
     - Student enters old password + new strong password ("SecureStudentPass2026!").
     - Submits form $\rightarrow$ redirects to `/` with success toast.
     - Database asserts `mustChangePassword === false`.

2. **`dashboard-schedule.spec.ts`**:
   - **Scenario: Greeting, Live Class & Timetable Navigation**:
     - Student logs in and lands on `/`.
     - Asserts greeting corresponds to current server time in `Asia/Kathmandu`.
     - Checks live schedule widget: verifies "NOW" badge renders if current time matches routine slot.
     - Clicks "Full Routine" link $\rightarrow$ navigates to `/routine`.
     - Navigates to `/today` $\rightarrow$ verifies 7-day strip, clicks through Monday/Tuesday tabs, checks `UPCOMING`, `ONGOING`, `COMPLETED` tags.

3. **`attendance-barometer.spec.ts`**:
   - **Scenario: Barometer, What-If Projections & Correction Request**:
     - Log in as Caution-Zone student (e.g. `rohan@classroom.os`, 77.8%).
     - Navigates to `/attendance`.
     - Asserts Barometer displays `77.8%` with `CAUTION` badge and "Need 5 classes to reach 80%".
     - Adjusts What-If calculator sliders (+10 attended, 0 missed) $\rightarrow$ asserts projected display dynamically updates to `81.8%` with `SAFE` badge.
     - Clicks "Report Incorrect Attendance" on an absent session record.
     - Fills dialog: Requested Status = `present`, Reason = "Attended in computer lab, roll taken while resolving router issue."
     - Submits dialog $\rightarrow$ asserts success toast and "Correction Request Pending" badge appears.

4. **`homework-submissions.spec.ts`**:
   - **Scenario: Tab Filtering, Drafts & Submission**:
     - Log in as student.
     - Navigates to `/homework`.
     - Clicks `Active`, `Due Soon`, `Overdue`, `Submitted`, `Graded` tabs $\rightarrow$ asserts corresponding items filter correctly.
     - Opens active assignment "Process Scheduling Simulation".
     - Types text answer into solution area, clicks "Save Draft" $\rightarrow$ asserts toast "Draft saved".
     - Reloads page $\rightarrow$ verifies draft content persists.
     - Attaches file and clicks "Submit Assignment" $\rightarrow$ verifies status chip updates to `Submitted`.

5. **`subject-isolation.spec.ts`**:
   - **Scenario: Enrolled Access vs Non-Enrolled Access Control**:
     - Log in as Student A (enrolled in Subjects 1, 2, 3; NOT enrolled in Subject 99).
     - Navigates to `/subjects` $\rightarrow$ asserts only Subjects 1, 2, 3 are displayed in grid.
     - Clicks Subject 1 $\rightarrow$ asserts `/subjects/subj_1` opens with Syllabus, Sessions, Assignments, and Resources tabs functioning.
     - Directly types URL `/subjects/subj_99` in browser address bar.
     - Asserts server returns 404 / 403 Forbidden page, preventing unauthorized data leakage.

---

## 3. Caveats

1. **Authentication Mode**: The current prototype relies on `APP_ROLE` cookies and `DEMO_STUDENT_ID` fallback in `src/lib/auth.ts`. Full implementation of R1 (session cookie + password hash + auth middleware) will precede the UI routes to ensure `getCurrentUser()` returns the authenticated user record.
2. **UploadThing In Offline / Local CI Environments**: UploadThing requires network access to the UploadThing service and valid `UPLOADTHING_TOKEN` / secret. In Playwright E2E tests, file upload server actions should support a mock or direct file payload to run deterministically in hermetic CI environments without requiring live third-party network calls.
3. **Database Driver**: The database is powered by `@libsql/client` / Turso SQLite. SQLite CHECK constraints and CASCADE foreign keys are enforced by the engine, provided foreign key enforcement (`PRAGMA foreign_keys = ON;`) is enabled on connections.

---

## 4. Conclusion

1. The mathematical formulation for the TU 80% Attendance Barometer is deterministic and straightforward:
   - Missable buffer: $\lfloor 1.25 A - T \rfloor$.
   - Recovery needed: $4 T - 5 A$.
   - Categorization: `SAFE` ($\ge 80\%$), `CAUTION` ($75\text{--}80\%$), `DANGER` ($< 75\%$).
2. The 10 new database schema tables (`users`, `student_profiles`, `enrollments`, `assignment_submissions`, `exams`, `exam_results`, `resources`, `study_tasks`, `notifications`, `attendance_correction_requests`) integrate cleanly with the existing `teachers`, `subjects`, `weeklyRoutine`, `classSessions`, `lectureLogs`, and `attendance` tables while maintaining strict SQLite database-level integrity.
3. Student Views (`/`, `/today`, `/subjects`, `/subjects/[id]`, `/attendance`, `/homework`) have clear architectural blueprints that respect NPT (`Asia/Kathmandu`) timezone formatting, strict server-side authorization, and responsive Shadcn UI standards.
4. The comprehensive seed script (`src/db/seed.ts`) will provide rich mock data for all 4 roles, 5 subjects, 45 sessions, diverse attendance zones, and multi-state assignment submissions.
5. The Playwright E2E testing architecture covers all required acceptance criteria including admin provisioning, student password onboarding, timetable navigation, attendance correction, and assignment submission.

---

## 5. Verification Method

To verify the findings and subsequent implementations:

1. **TypeScript Typecheck**:
   ```bash
   npx tsc --noEmit
   ```
   *Expected output*: 0 errors.

2. **Database Schema Verification**:
   ```bash
   npm run db:verify
   ```
   *Expected output*: All schema relations, CHECK constraints, and cascading deletes execute and pass.

3. **Database Migration & Seeding**:
   ```bash
   npm run db:generate
   npm run db:migrate
   npx tsx --env-file=.env.local src/db/seed.ts
   ```
   *Expected output*: All tables created, constraints active, and realistic mock dataset populated without referential errors.

4. **Playwright E2E Suite Execution**:
   ```bash
   npx playwright test
   ```
   *Expected output*: All spec suites (`auth-lifecycle`, `dashboard-schedule`, `attendance-barometer`, `homework-submissions`, `subject-isolation`) pass.
