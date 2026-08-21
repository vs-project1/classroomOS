## 2026-08-15T12:37:21Z
Analyze requirements and architecture for R2, R3, R4, and Testing:
1. TU 80% attendance barometer domain service & "What-If" projection calculator:
   - Logic: (Attended classes / Total conducted classes), projection for upcoming classes needed to reach 80% threshold, SAFE (>=80%), CAUTION (75-80%), DANGER (<75%).
2. Primary Student Views:
   - Dashboard (`/`): Time-based greeting (Asia/Kathmandu), current live class ("NOW" badge based on routine/session time), next classes, attendance overview card, assignment overview card, pinned notices.
   - Today (`/today`): 7-day selector, timeline of classes categorized by server time (UPCOMING, ONGOING, COMPLETED).
   - Subjects (`/subjects` & `/subjects/[id]`): Grid of enrolled subjects. Detail page tabs: Syllabus progress, Sessions, Assignments, Resources. Data isolation for non-enrolled subjects.
   - Attendance (`/attendance`): Overall barometer, subject-wise breakdown, attendance history, "Report Incorrect Attendance" correction request flow.
   - Homework / Assignments (`/homework`): Tabs for Active, Due Soon, Overdue, Submitted, Graded. Submission flow with drafts/retries and UploadThing file integration.
3. Database schema extensions:
   - `users`, `student_profiles`, `enrollments`, `assignment_submissions`, `exams`, `exam_results`, `resources`, `study_tasks`, `notifications`, `attendance_correction_requests`.
   - Relationships, SQLite CHECK constraints, cascade deletes.
4. Seeding script (`src/db/seed.ts`): comprehensive mock data for all roles, subjects, sessions, enrollments, assignments, submissions, attendance.
5. Playwright E2E testing strategy across the core flows.
