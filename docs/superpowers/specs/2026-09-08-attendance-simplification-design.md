# Technical Design: ClassroomOS Attendance Simplification & Unification

**Date:** 2026-09-08  
**Status:** Approved by User & Role Verifiers (`StudentVerifier`, `CRVerifier`, `TeacherVerifier`)  
**Scope:** Sub-Project 1 — Attendance System Unification & Cross-Role Sync  

---

## 1. Executive Summary

ClassroomOS previously implemented a fragmented dual-layer attendance system: administrative daily attendance (`daily_sessions` and `daily_attendance`) alongside per-period lecture attendance (`attendance` linked to `class_sessions`). This architecture caused the following issues:
1. **Student 0% Calculation Bug:** Students marked present in daily attendance saw 0% on their dashboard and `/attendance` because queries checked only empty lecture records.
2. **Duplicate Operational Friction:** Teachers and CRs logging a 45-minute lecture session were forced to review and submit a 50+ student attendance checklist for every period.
3. **Confusing Terminology:** Users encountered conflicting terms: "Morning Roll Call", "Roll Call", and "Subject Attendance".

### The Solution
* Establish **Daily Attendance** as the **sole, canonical source of truth** across the entire application.
* **Remove subject-wise attendance** completely.
* Decouple lecture logging (`class_sessions` and `lecture_logs`) from student attendance checklists, streamlining lecture logging into pure academic record-keeping (topics covered, notes, homework).
* Standardize all user-facing copy to clean, unified **"Attendance"**.
* Update dispute resolution (`attendance_correction_requests`) to link directly to daily attendance.
* Systematically eliminate all dead code and orphaned components per project rules.

---

## 2. Architecture & Data Model Alignment

```
┌─────────────────────────────────────────────────────────────┐
│                      CANONICAL ATTENDANCE                   │
├──────────────────────────┐       ┌──────────────────────────┤
│      daily_sessions      │       │     daily_attendance     │
│──────────────────────────│       │──────────────────────────│
│ • id (PK)                │ 1───* │ • id (PK)                │
│ • date (UTC midnight)    │       │ • daily_session_id (FK)  │
│ • semester (e.g. "4")    │       │ • student_id (FK)        │
│ • marked_by (user FK)    │       │ • status (P/A/L/E)       │
│ • unique(date, semester) │       │ • unique(session,student)│
└──────────────────────────┘       └─────────────┬────────────┘
                                                 │ 1
                                                 │
                                                 │ *
                                   ┌─────────────┴────────────┐
                                   │  attendance_corrections  │
                                   │──────────────────────────│
                                   │ • id (PK)                │
                                   │ • attendance_id (FK)     │
                                   │ • student_id (FK)        │
                                   │ • requested_status       │
                                   │ • reason                 │
                                   │ • status (P/A/R)         │
                                   │ • reviewed_by (teacher)  │
                                   └──────────────────────────┘
```

### Academic Lecture Sessions (Decoupled)
* **`class_sessions` & `lecture_logs`**: Focus purely on curriculum logging:
  * `subjectId`, `routineId`, `sessionDate`, `startTime`, `endTime`
  * `topicsCovered`, `homework`, `notes`
* **Zero Attendance Roster:** Logging a lecture does not insert rows into any attendance table.

---

## 3. Role-by-Role Specifications

### 3.1 Student Experience
1. **Student Dashboard (`/`):**
   * Top Arc Gauge and metrics strictly query `daily_attendance` joined with `daily_sessions`.
   * Metric: `"X of Y Days Attended (Z%)"`.
   * Zero state: When total days $= 0$, displays $100\%$ with *"No attendance logged yet"*.
2. **Student Attendance Hub (`/attendance`):**
   * **Overall Attendance Barometer:** Gauge with status badge (`SAFE` $\ge 80\%$, `CAUTION` $75-79\%$, `DANGER` $< 75\%$) and missable/recovery day buffers.
   * **What-If Simulator:** Sliders for "Future Days to Attend" and "Future Days to Miss".
   * **Chronological Attendance History Ledger:** Reverse chronological list with Bikram Sambat date (`formatNepaliDate`), English date, day of week, status badge (`Present`, `Late`, `Excused`, `Absent`), and inline "Dispute" CTA on absent/late days.
3. **Missed Classes Catch-Up Journal (`/missed`):**
   * For each date marked `Absent` or `Late`, lists academic lecture logs from that date (topics covered, notes, assigned homework) so students can catch up.

### 3.2 Class Representative (CR) Experience
1. **Taking Attendance (`/cr/take-attendance`):**
   * Renders cohort roster with one-tap status toggles (defaults to `Present`).
   * **Cohort Isolation:** Strictly enforces CR's assigned semester. Eliminates the institution-wide roster leak fallback query.
   * Mobile-optimized cards with $\ge 44\text{px}$ touch targets.
2. **Attendance Overview (`/cr/attendance`):**
   * Implements dedicated `/cr/attendance/page.tsx` rendering monthly matrix and ledger (resolving the 404).
3. **Session Logging (`/cr/log-session`):**
   * Strips attendance roster checklist; CR logs subject lecture notes in $< 15$ seconds.

### 3.3 Teacher Experience
1. **Lecture Logging (`/teacher/lecture-logs` & `SessionForm`):**
   * Removes 50+ student attendance checklist from `SessionForm`. Teachers record topics, homework, and notes without duplicate roll-call overhead.
2. **Teacher Attendance Hub (`/teacher/attendance`):**
   * Displays teacher's assigned semesters with student counts and today's attendance status.
   * Links to semester roster (`/teacher/attendance/roster?semester=...`) with red highlights for students $< 80\%$.
3. **Teacher Dashboard (`/teacher`):**
   * Completes the previously unrendered `pendingGrading` counter and adds a unified "Pending Items" card (pending grading + pending attendance disputes).

### 3.4 Dispute Resolution Pipeline
* `attendanceCorrectionRequests` foreign key points to `daily_attendance.id`.
* Reviewed by Teachers teaching that semester or Admins.
* Atomic status update (`status = 'pending'`) protects against concurrent reviews.

---

## 4. Mathematical Engine & Formulae

$$\text{Attended} = \text{Present} + \text{Late}$$

$$\text{Effective Total} = \max(\text{Attended}, \text{Total Marked Days} - \text{Excused})$$

$$\text{Percentage} = \begin{cases} 
100\% & \text{if Effective Total} = 0 \\
\text{round}\left(\frac{\text{Attended}}{\text{Effective Total}} \times 100\right) & \text{otherwise}
\end{cases}$$

$$\text{Missable Days to 80\%} = \max\left(0, \left\lfloor \frac{\text{Attended} - 0.8 \times \text{Effective Total}}{0.8} \right\rfloor\right)$$

$$\text{Days to Recover 80\%} = \max\left(0, \left\lceil \frac{0.8 \times \text{Effective Total} - \text{Attended}}{0.2} \right\rceil\right)$$

---

## 5. Dead Code & Orphaned Component Elimination

Per Rule 6 in `AGENTS.md` and Rule 3 in `LEARNINGS.md`:
1. Remove "Class Attendance Roster" JSX block, states, and props from `SessionForm`.
2. Remove `tx.insert(attendance)` from `createSessionAction`.
3. Delete unused subject-wise attendance components and obsolete types.
4. Eliminate the global fallback query in `TakeDailyAttendancePage`.
5. Remove all "Roll Call" / "Morning Roll Call" string occurrences across all UI layers.

---

## 6. Verification & Testing Plan

1. **Typecheck:** Execute `npx tsc --noEmit` and ensure a 0-error exit code.
2. **Role Verification:** Validate Student (`/`, `/attendance`, `/missed`), CR (`/cr/take-attendance`, `/cr/attendance`, `/cr/log-session`), Teacher (`/teacher`, `/teacher/attendance`, `/teacher/lecture-logs`), and Admin (`/admin/attendance`).
3. **Security Audit:** Confirm CR cannot take attendance for unassigned semesters, and global roster fallback is deleted.
