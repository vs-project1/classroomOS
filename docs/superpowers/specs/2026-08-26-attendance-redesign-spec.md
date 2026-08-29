# Daily Attendance & Session Logging Redesign

## Overview
Separate the concept of "Attendance" into two distinct workflows: Daily Morning Roll Call (handled once per day by CRs) and Class Session Logging (handled per class by Teachers/CRs).

## 1. Database Schema Additions
To avoid modifying the strictly subject-bound `classSessions` table, we will introduce two new tables for daily attendance tracking:
- `daily_sessions`: Tracks the occurrence of a morning roll call.
  - `id`: string (PK)
  - `date`: timestamp
  - `semester`: string (e.g., "2nd Semester")
  - `marked_by`: string (FK to `users.id`)
- `daily_attendance`: Tracks individual student status for a daily session.
  - `id`: string (PK)
  - `daily_session_id`: string (FK to `daily_sessions.id`)
  - `student_id`: string (FK to `students.id`)
  - `status`: string ('present', 'absent', 'late', 'excused')

## 2. Workflows & UI
### Daily Morning Roll Call
- **Route:** `/cr/take-attendance`
- **Access:** CRs only.
- **Functionality:** Fetch all students matching the CR's semester. Allow the CR to mark Present/Absent for the whole day. Saves to `daily_sessions` and `daily_attendance`.

### Subject Session Logging
- **Route:** Rename existing attendance flow back to `/cr/log-session` and `/teacher/log-session`.
- **Functionality:** Select a subject, enter topics covered and notes (saving to `lecture_logs`). Optionally multi-select students who were absent from this specific lecture (saving to `attendance`).

## 3. Monthly View Dashboard
- **Route:** `/admin/attendance/monthly` and `/cr/attendance/monthly`.
- **Functionality:** View daily attendance aggregated by Nepali Month (e.g., Jestha 2083). Displays a table of students and their present/absent counts for the selected month.

## 4. Student Dashboard
- **Route:** `/attendance` (Student View)
- **Functionality:** Read from `daily_attendance` to show overall daily presence. Also read from `attendance` to list any specific subject classes missed.
