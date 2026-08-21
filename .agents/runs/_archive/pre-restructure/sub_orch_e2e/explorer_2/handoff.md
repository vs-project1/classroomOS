# 4-Tier Test Strategy & Specification Report (Classroom OS)

## 1. Observation
- **Authoritative Specifications Inspected**:
  - `ORIGINAL_REQUEST.md`: R1 (Auth & Security), R2 (Core Domain & Data Isolation), R3 (Primary Student Views), R4 (Database & Infrastructure), Acceptance Criteria (Playwright E2E tests, zero-trust isolation, seeder).
  - `PROJECT.md`: Architecture overview, Feature inventory F1-F21, Interface contracts (`src/lib/auth/`, `src/lib/attendance.ts`, `src/app/api/uploadthing/`), and Code layout.
  - `SCOPE.md` (sub_orch_e2e): 5 Target Spec Files (`auth-lifecycle.spec.ts`, `dashboard-schedule.spec.ts`, `attendance-barometer.spec.ts`, `homework-submissions.spec.ts`, `subject-isolation.spec.ts`), Deterministic test users (`admin@classroom.edu.np`, `student@classroom.edu.np`, `newstudent@classroom.edu.np`, `unauthorized@classroom.edu.np`).
  - Codebase Schema & Implementation (`src/db/schema.ts`, `src/app/(student)/page.tsx`, `src/app/(student)/attendance/page.tsx`, `src/app/(student)/today/page.tsx`, `src/app/(student)/homework/page.tsx`, `src/lib/time.ts`, `src/lib/auth.ts`).
- **Domain Constraints**:
  - TU 80% Attendance: Mandatory threshold 80.0%. Safety Buffer $B = \max(0, \lfloor 1.25A - T \rfloor)$, Recovery Target $R = \max(0, 4T - 5A)$.
  - Timezone: `Asia/Kathmandu` (NPT, UTC+5:45) for all date formatting, greetings, and timeline status calculations.
  - Opaque-Box Boundary: Tests interact exclusively with rendered DOM, navigation URLs, HTTP cookies, and API endpoints.

---

## 2. Logic Chain: 4-Tier Test Architecture

```
┌────────────────────────────────────────────────────────────────────────┐
│               Tier 4: Real-World Application Scenarios                 │
│   (Multi-persona, end-to-end user journeys: Onboarding, Daily Routine, │
│    Attendance Recovery & Dispute, Assignment Grading, Adversarial Run) │
├────────────────────────────────────────────────────────────────────────┤
│               Tier 3: Cross-Feature Combinations (Pairwise)            │
│   (Session -> Homework Spawn, Attendance Log -> Barometer/What-If,     │
│    Admin Password Reset -> Quarantine Flow, Upload -> Submission)      │
├────────────────────────────────────────────────────────────────────────┤
│               Tier 2: Boundary & Corner Cases (BVA & Negative)         │
│   (Limit values: 79.4% vs 80%, Overdue boundaries, 16MB file limits,   │
│    Empty states, Tampered IDs, Malformed inputs, Strict 403/404)       │
├────────────────────────────────────────────────────────────────────────┤
│               Tier 1: Feature Coverage (Happy Paths)                   │
│   (Nominal execution of F1-F19 features: >=5 test cases per feature)   │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 3. Tier 1: Feature Coverage Matrix (F1 to F19)
*Every feature has >=5 explicit test cases covering typical inputs and expected positive behaviors.*

| TC ID | Feature | Description | Inputs | Expected Output | Discovered Via |
|---|---|---|---|---|---|
| **TC-F1-01** | F1: DB Schema | Student profile entity creation with valid foreign key | Valid `users.id`, valid roll number, faculty 'BCA', semester 4 | Record inserted successfully in `student_profiles` | `schema.ts` |
| **TC-F1-02** | F1: DB Schema | Enrollment linking student to active subject | Valid `student_id`, valid `subject_id`, semester 4 | Record inserted in `enrollments` table | `schema.ts` |
| **TC-F1-03** | F1: DB Schema | Assignment submission insertion | Valid `homework_id`, `student_id`, status 'submitted', valid URL | Record created in `assignment_submissions` | `schema.ts` |
| **TC-F1-04** | F1: DB Schema | Exam and result recording | Valid `subject_id`, examType 'midterm', totalMarks 50, passMarks 20 | Record created in `exams` and `exam_results` | `schema.ts` |
| **TC-F1-05** | F1: DB Schema | Attendance correction request creation | Valid `attendance_id`, requestedStatus 'present', valid reason | Record created with status 'pending' | `schema.ts` |
| **TC-F2-01** | F2: DB Verification | Foreign key cascading delete on subject | Delete subject with related sessions and homework | All child sessions, routine, and homework cascade-deleted | `verify-db.ts` |
| **TC-F2-02** | F2: DB Verification | CHECK constraint rejection on invalid role | Insert user with role = 'SUPERUSER' | SQLite CHECK constraint violation error thrown | `verify-db.ts` |
| **TC-F2-03** | F2: DB Verification | Unique constraint rejection on duplicate rollNumber | Insert two student profiles with same rollNumber | SQLite UNIQUE constraint violation error thrown | `verify-db.ts` |
| **TC-F2-04** | F2: DB Verification | Composite unique rejection on enrollment | Insert duplicate (studentId, subjectId) pair | SQLite UNIQUE constraint violation thrown | `verify-db.ts` |
| **TC-F2-05** | F2: DB Verification | Time order check constraint validation | Insert weekly routine where `startTime >= endTime` | SQLite CHECK constraint rejection | `verify-db.ts` |
| **TC-F3-01** | F3: DB Seeder | Default Admin account provisioned | Query user `admin@classroom.edu.np` | Role is ADMIN, `mustChangePassword = 0`, password valid | `seed.ts` |
| **TC-F3-02** | F3: DB Seeder | Safe attendance zone student seeded | Query student `student@classroom.edu.np` | Overall attendance >= 80%, has enrolled subjects | `seed.ts` |
| **TC-F3-03** | F3: DB Seeder | At-risk student seeded in Danger zone | Query at-risk student account | Attendance < 70%, shows DANGER category | `seed.ts` |
| **TC-F3-04** | F3: DB Seeder | 45 historical sessions seeded across routine | Query `class_sessions` count | 45 sessions linked to subjects with attendance logs | `seed.ts` |
| **TC-F3-05** | F3: DB Seeder | Active, Due Soon, and Overdue assignments seeded | Query `homework` table | Assignments in each temporal status present | `seed.ts` |
| **TC-F4-01** | F4: Session Auth | Valid credentials login | Submit valid email + password at `/login` | `auth_session` HTTP-only cookie set, redirects to `/` | `PROJECT.md §Interface` |
| **TC-F4-02** | F4: Session Auth | Invalid password authentication | Submit valid email + incorrect password | Renders error alert "Invalid credentials", no cookie | `PROJECT.md §Interface` |
| **TC-F4-03** | F4: Session Auth | Non-existent user login | Submit unknown email `ghost@college.edu` | Renders error alert "Invalid credentials", no user leak | `PROJECT.md §Interface` |
| **TC-F4-04** | F4: Session Auth | User logout | Click Logout button in profile menu | `auth_session` cookie cleared/invalidated, redirected `/login` | `PROJECT.md §Interface` |
| **TC-F4-05** | F4: Session Auth | Session persistence across navigation | Navigate between `/`, `/today`, `/attendance`, `/homework` | Session cookie maintains authenticated state | `PROJECT.md §Interface` |
| **TC-F5-01** | F5: Admin Provisioning | Admin creates new student account | Fill name, email, roll number, faculty in `/admin/accounts` | Account created, temporary password displayed in modal | `ORIGINAL_REQUEST §R1` |
| **TC-F5-02** | F5: Admin Provisioning | Admin creates new teacher account | Fill name, email, department, assign subjects | Teacher account created with role `TEACHER` | `ORIGINAL_REQUEST §R1` |
| **TC-F5-03** | F5: Admin Provisioning | Admin copies generated temp password | Click "Copy Credentials" button | Clipboard populated with email and temporary password | `ORIGINAL_REQUEST §R1` |
| **TC-F5-04** | F5: Admin Provisioning | No public signup route | Direct GET request to `/signup` or `/register` | Returns 404 or redirects to `/login` | `ORIGINAL_REQUEST §R1` |
| **TC-F5-05** | F5: Admin Provisioning | Admin resets existing user password | Click "Reset Password" on user card | Generates new temp password, sets `mustChangePassword=1` | `ORIGINAL_REQUEST §R1` |
| **TC-F6-01** | F6: Password Quarantine | First-time login quarantine redirect | Login with user where `mustChangePassword=true` | Immediately redirected to `/change-password` | `ORIGINAL_REQUEST §R1` |
| **TC-F6-02** | F6: Password Quarantine | Quarantine blocks access to academic views | Direct navigation to `/attendance` while quarantined | Intercepted by middleware, redirects to `/change-password` | `ORIGINAL_REQUEST §R1` |
| **TC-F6-03** | F6: Password Quarantine | Password change validation rules | Attempt password `<8` characters | Form validation error "Password must be at least 8 characters" | `ORIGINAL_REQUEST §R1` |
| **TC-F6-04** | F6: Password Quarantine | Successful password change unlocks app | Submit compliant password + matching confirmation | `mustChangePassword` cleared in DB, redirected to `/` | `ORIGINAL_REQUEST §R1` |
| **TC-F6-05** | F6: Password Quarantine | Post-unlock access verified | Navigate to `/subjects` and `/homework` | Routes render fully with student context | `ORIGINAL_REQUEST §R1` |
| **TC-F7-01** | F7: RBAC Guard | Student denied access to Admin console | Authenticated Student navigates to `/admin/accounts` | Returns 403 Forbidden or redirects to `/` | `PROJECT.md §F7` |
| **TC-F7-02** | F7: RBAC Guard | Student denied session creation | Student submits session creation form/action | Action returns `{ success: false, error: 'Unauthorized' }` | `PROJECT.md §F7` |
| **TC-F7-03** | F7: RBAC Guard | Admin access to Admin Console | Authenticated Admin navigates to `/admin/accounts` | Renders admin accounts console with KPI metrics | `PROJECT.md §F7` |
| **TC-F7-04** | F7: RBAC Guard | Teacher access to session logging | Authenticated Teacher logs session at `/sessions/new` | Session logged and attendance marked successfully | `PROJECT.md §F7` |
| **TC-F7-05** | F7: RBAC Guard | Unauthenticated request redirect | Unauthenticated user navigates to `/attendance` | Redirects to `/login?callbackUrl=/attendance` | `PROJECT.md §F7` |
| **TC-F8-01** | F8: Admin Console | User roster listing with pagination | View `/admin/accounts` | Displays table of all accounts with role and status | `PROJECT.md §F8` |
| **TC-F8-02** | F8: Admin Console | Filter roster by role | Select filter "STUDENT" | Roster filters to show only student accounts | `PROJECT.md §F8` |
| **TC-F8-03** | F8: Admin Console | Search account by name/email | Type search query in search input | Table dynamically filters to matching accounts | `PROJECT.md §F8` |
| **TC-F8-04** | F8: Admin Console | Deactivate user account | Click "Deactivate" toggle on student account | User status updated to `isActive = 0`, badge reflects inactive | `PROJECT.md §F8` |
| **TC-F8-05** | F8: Admin Console | Deactivated user login rejection | Attempt login with deactivated user credentials | Error alert "Account is deactivated. Contact administrator." | `PROJECT.md §F8` |
| **TC-F9-01** | F9: Barometer Domain | Safe zone calculation (>=80%) | Attended 36 of 40 classes (90%) | Percentage 90%, Category 'SAFE', Buffer +5 missable | `attendance.ts` |
| **TC-F9-02** | F9: Barometer Domain | Caution zone calculation (70%-79%) | Attended 30 of 40 classes (75%) | Percentage 75%, Category 'CAUTION', Classes needed: 10 | `attendance.ts` |
| **TC-F9-03** | F9: Barometer Domain | Danger zone calculation (<70%) | Attended 24 of 40 classes (60%) | Percentage 60%, Category 'DANGER', Classes needed: 40 | `attendance.ts` |
| **TC-F9-04** | F9: Barometer Domain | Exact 80% threshold calculation | Attended 32 of 40 classes (80%) | Percentage 80%, Category 'SAFE', Buffer 0 missable | `attendance.ts` |
| **TC-F9-05** | F9: Barometer Domain | Zero attendance baseline | Attended 0 of 10 classes (0%) | Percentage 0%, Category 'DANGER', Classes needed: 40 | `attendance.ts` |
| **TC-F10-01** | F10: What-If Calc | Simulation: Attend next 5 classes | Input +5 attended classes on 75% baseline | Projected percentage increases, updates gauge & status | `PROJECT.md §F10` |
| **TC-F10-02** | F10: What-If Calc | Simulation: Miss next 3 classes | Input +3 missed classes on 82% baseline | Projected percentage decreases, updates buffer chip | `PROJECT.md §F10` |
| **TC-F10-03** | F10: What-If Calc | Simulation: Reach Safe threshold | Input recovery target classes calculated by domain | Projected category transitions from CAUTION to SAFE | `PROJECT.md §F10` |
| **TC-F10-04** | F10: What-If Calc | Simulation: Delta percentage display | Change slider values | Visual delta indicator shows `+X%` or `-Y%` change | `PROJECT.md §F10` |
| **TC-F10-05** | F10: What-If Calc | Simulation: Reset to current state | Click "Reset Projection" button | Inputs reset to 0, gauge returns to actual attendance | `PROJECT.md §F10` |
| **TC-F11-01** | F11: Dashboard | NPT Time-based greeting rendering | Load `/` during 09:00 NPT morning | Displays "Good morning, [Name]" and formatted NPT date | `page.tsx` |
| **TC-F11-02** | F11: Dashboard | Live class "NOW" badge display | Load `/` during an active class time slot | Current class highlights with pulsating "NOW" badge | `page.tsx` |
| **TC-F11-03** | F11: Dashboard | Upcoming classes schedule list | Load `/` with remaining classes today | Displays upcoming class cards with relative start times | `page.tsx` |
| **TC-F11-04** | F11: Dashboard | Attendance Gauge widget | Load `/` for authenticated student | Circular gauge displays overall attendance % & zone | `page.tsx` |
| **TC-F11-05** | F11: Dashboard | Pinned Notices card | Load `/` with active pinned notice | Displays pinned notices with 📌 indicator and relative time | `page.tsx` |
| **TC-F12-01** | F12: Today Timeline | 7-day date strip navigation | Click Tuesday tab on `/today` | Schedule updates to Tuesday routine | `today/page.tsx` |
| **TC-F12-02** | F12: Today Timeline | Server-time status: UPCOMING | View future class card on current day | Card shows "Upcoming", time range, room, teacher | `today/page.tsx` |
| **TC-F12-03** | F12: Today Timeline | Server-time status: ONGOING | View current class card on current day | Card displays active highlight border and live indicator | `today/page.tsx` |
| **TC-F12-04** | F12: Today Timeline | Server-time status: COMPLETED | View past class slot on current day | Card displays dimmed / completed styling | `today/page.tsx` |
| **TC-F12-05** | F12: Today Timeline | Previous/Next day navigation arrows | Click "Next" arrow | URL updates to `?date=YYYY-MM-DD`, loads target day | `today/page.tsx` |
| **TC-F13-01** | F13: Subjects Grid | Enrolled subjects grid view | Navigate to `/subjects` | Displays cards for all subjects student is enrolled in | `PROJECT.md §F13` |
| **TC-F13-02** | F13: Subject Detail | Subject detail view & tab switching | Open enrolled subject `/subjects/[id]` | Loads detail view with default "Syllabus Progress" tab | `PROJECT.md §F13` |
| **TC-F13-03** | F13: Subject Detail | Sessions & Lecture Logs tab | Click "Sessions & Logs" tab | Lists historical class sessions with topics covered | `PROJECT.md §F13` |
| **TC-F13-04** | F13: Subject Detail | Assignments tab | Click "Assignments" tab | Lists assignments specific to this subject | `PROJECT.md §F13` |
| **TC-F13-05** | F13: Subject Detail | Resources & Course Material tab | Click "Resources" tab | Displays downloadable lecture slides and PDF notes | `PROJECT.md §F13` |
| **TC-F14-01** | F14: Data Isolation | Enrolled subject access allowed | Student accesses enrolled subject ID | HTTP 200, renders subject details | `PROJECT.md §F14` |
| **TC-F14-02** | F14: Data Isolation | Unenrolled subject access blocked | Student enters URL of un-enrolled subject ID | Returns HTTP 404 Not Found or 403 Forbidden | `ORIGINAL_REQUEST §R2` |
| **TC-F14-03** | F14: Data Isolation | Non-existent subject ID access | Student navigates to `/subjects/invalid-uuid-999` | Returns HTTP 404 Not Found | `ORIGINAL_REQUEST §R2` |
| **TC-F14-04** | F14: Data Isolation | Direct submission view isolation | Student A attempts to view `/homework/submissions/[studentB_id]` | Returns HTTP 403 Forbidden | `ORIGINAL_REQUEST §R2` |
| **TC-F14-05** | F14: Data Isolation | Direct resource isolation | Student attempts download of private resource for other section | Returns HTTP 403 Forbidden | `ORIGINAL_REQUEST §R2` |
| **TC-F15-01** | F15: Attendance Hub | Subject breakdown matrix view | Navigate to `/attendance` | Displays table of all subjects with present/total and % | `attendance/page.tsx` |
| **TC-F15-02** | F15: Attendance Hub | Safety buffer calculation display | View Overall KPI card on `/attendance` | Displays exact missable classes or classes needed | `attendance/page.tsx` |
| **TC-F15-03** | F15: Attendance Hub | Session history log table | View attendance history on `/attendance` | Displays dated session log with Present/Absent/Late tags | `attendance/page.tsx` |
| **TC-F15-04** | F15: Attendance Hub | Open Report Incorrect Attendance modal | Click "Report Issue" on an absent session | Modal opens pre-populated with session info | `ORIGINAL_REQUEST §R3` |
| **TC-F15-05** | F15: Attendance Hub | Submit attendance correction request | Fill reason "Present but marked absent", submit | Request recorded in `attendance_correction_requests` | `ORIGINAL_REQUEST §R3` |
| **TC-F16-01** | F16: Homework Workspace | Active assignments tab | Navigate to `/homework`, select "Active" tab | Displays pending assignments sorted by due date | `homework/page.tsx` |
| **TC-F16-02** | F16: Homework Workspace | Due Soon tag display | View assignment due in <24 hours | Displays amber "Due Soon" badge with countdown | `homework/page.tsx` |
| **TC-F16-03** | F16: Homework Workspace | Overdue tag display | View assignment past deadline | Displays red "Overdue" badge | `homework/page.tsx` |
| **TC-F16-04** | F16: Homework Workspace | Save assignment draft submission | Enter text solution in submission modal, click "Save Draft" | Draft saved, reloaded modal preserves draft content | `ORIGINAL_REQUEST §R3` |
| **TC-F16-05** | F16: Homework Workspace | Graded assignment feedback display | Open "Graded" tab, inspect graded assignment | Displays score (e.g. 18/20), grade ('A'), and teacher feedback | `ORIGINAL_REQUEST §R3` |
| **TC-F17-01** | F17: UploadThing | Valid PDF file selection | Select a 2MB PDF document in submission modal | File accepted, shows file preview with name and size | `uploadthing/core.ts` |
| **TC-F17-02** | F17: UploadThing | Assignment submission with file | Submit assignment with attached file | Upload completes, submission recorded with `fileUrl` | `uploadthing/core.ts` |
| **TC-F17-03** | F17: UploadThing | Submission status transition | Check homework tabs after submission | Assignment moves from "Active" to "Submitted" tab | `homework/page.tsx` |
| **TC-F17-04** | F17: UploadThing | Submission retry / re-upload | Re-open submitted assignment before grading, upload new file | Submission updated with new file URL and timestamp | `ORIGINAL_REQUEST §R3` |
| **TC-F17-05** | F17: UploadThing | File download verification | Click attached file link in submission modal | File downloads or opens in viewer | `uploadthing/core.ts` |
| **TC-F18-01** | F18: E2E Infra | Automated web server lifecycle | Run Playwright test runner | Automatically boots Next.js at `http://localhost:3000` | `playwright.config.ts` |
| **TC-F18-02** | F18: E2E Infra | Multi-role session fixture injection | Test uses `adminPage` or `studentPage` fixture | Injects authenticated cookies directly without UI login steps | `fixtures/auth.fixture.ts` |
| **TC-F18-03** | F18: E2E Infra | Deterministic DB seed reset | Execute test suite | Seeds known mock dataset ensuring repeatable assertions | `fixtures/seed-data.ts` |
| **TC-F18-04** | F18: E2E Infra | Failure artifacts generation | Run test with intentional mismatch | Captures screenshot, DOM snapshot, and trace file in `test-results/` | `playwright.config.ts` |
| **TC-F18-05** | F18: E2E Infra | Parallel test execution | Run full test suite with `--workers=4` | All spec files execute concurrently without database collisions | `playwright.config.ts` |
| **TC-F19-01** | F19: E2E Suite | Auth lifecycle spec pass | Run `npx playwright test tests/e2e/auth-lifecycle.spec.ts` | All auth test cases pass with 0 failures | `SCOPE.md` |
| **TC-F19-02** | F19: E2E Suite | Dashboard & schedule spec pass | Run `npx playwright test tests/e2e/dashboard-schedule.spec.ts` | All dashboard test cases pass with 0 failures | `SCOPE.md` |
| **TC-F19-03** | F19: E2E Suite | Attendance & barometer spec pass | Run `npx playwright test tests/e2e/attendance-barometer.spec.ts` | All attendance test cases pass with 0 failures | `SCOPE.md` |
| **TC-F19-04** | F19: E2E Suite | Homework & submissions spec pass | Run `npx playwright test tests/e2e/homework-submissions.spec.ts` | All homework test cases pass with 0 failures | `SCOPE.md` |
| **TC-F19-05** | F19: E2E Suite | Subject isolation spec pass | Run `npx playwright test tests/e2e/subject-isolation.spec.ts` | All data isolation test cases pass with 0 failures | `SCOPE.md` |

---

## 4. Tier 2: Boundary & Corner Cases Matrix (BVA & Negative Inputs)
*Every feature has >=5 explicit boundary and negative test cases.*

| TC ID | Feature | Input / Boundary Condition | Observed & Expected System Behavior |
|---|---|---|---|
| **TC-BVA-F1-01** | F1: DB Schema | Roll number containing special characters & spaces | Zod & DB sanitize or reject invalid formatting |
| **TC-BVA-F1-02** | F1: DB Schema | Semester integer out of bounds (e.g. 0 or 9 for 8-sem BCA) | Database CHECK or application validation rejects |
| **TC-BVA-F1-03** | F1: DB Schema | Exam totalMarks = 0 or passMarks > totalMarks | Rejected by database check or validation schema |
| **TC-BVA-F1-04** | F1: DB Schema | Submitting score > totalMarks in `assignment_submissions` | Rejected by validation refinement |
| **TC-BVA-F1-05** | F1: DB Schema | Empty title or description in `study_tasks` | Rejected with "Title is required" error |
| **TC-BVA-F2-01** | F2: DB Verification | Deleting teacher assigned to subjects | Subject `teacher_id` becomes NULL (`set null`), subject remains intact |
| **TC-BVA-F2-02** | F2: DB Verification | Deleting student with active submissions | Submissions cascade-deleted with student |
| **TC-BVA-F2-03** | F2: DB Verification | Inserting attendance record with status 'sick' | Rejected: status must be in ('present','absent','late','excused') |
| **TC-BVA-F2-04** | F2: DB Verification | Day of week = 7 in weekly routine | Rejected: dayOfWeek must be BETWEEN 0 AND 6 |
| **TC-BVA-F2-05** | F2: DB Verification | Routine start time = "14:00", end time = "13:00" | Rejected: `startTime < endTime` constraint violation |
| **TC-BVA-F3-01** | F3: DB Seeder | Seeder executed multiple times idempotently | Clears and re-seeds without duplicate primary/unique key errors |
| **TC-BVA-F3-02** | F3: DB Seeder | Student with 100% perfect attendance seeded | Barometer displays 100%, SAFE zone, buffer = +$\lfloor 0.25 \times T \rfloor$ |
| **TC-BVA-F3-03** | F3: DB Seeder | Student with exactly 80.0% attendance seeded | Barometer displays 80%, SAFE zone, buffer = 0 |
| **TC-BVA-F3-04** | F3: DB Seeder | Student with exactly 79.9% (31/39) attendance seeded | Rounded to 79%, displays CAUTION zone, classes needed to recover = 1 |
| **TC-BVA-F3-05** | F3: DB Seeder | Zero class sessions logged for subject | Subject breakdown displays 0/0, progress bar 0%, no divide-by-zero crash |
| **TC-BVA-F4-01** | F4: Session Auth | Login with empty email and empty password | Form validation flags both fields without sending network request |
| **TC-BVA-F4-02** | F4: Session Auth | Login with leading/trailing whitespace in email | Auto-trimmed to valid format before verification |
| **TC-BVA-F4-03** | F4: Session Auth | Tampered cookie payload in `auth_session` | Server rejects signature, cookie destroyed, redirected to `/login` |
| **TC-BVA-F4-04** | F4: Session Auth | Expired session token (>30 days old) | Middleware clears cookie, forces new login |
| **TC-BVA-F4-05** | F4: Session Auth | SQL injection string in login fields (`' OR '1'='1`) | Parameterized Drizzle query safely fails authentication |
| **TC-BVA-F5-01** | F5: Admin Provisioning | Creating student with already registered email | Rejection alert: "A user with this email already exists" |
| **TC-BVA-F5-02** | F5: Admin Provisioning | Creating student with duplicate roll number | Rejection alert: "Roll number already assigned" |
| **TC-BVA-F5-03** | F5: Admin Provisioning | Creating student with empty required fields | Form shows inline field errors for missing inputs |
| **TC-BVA-F5-04** | F5: Admin Provisioning | Creating user with extremely long name (255+ chars) | Enforces maximum length constraint without layout breakage |
| **TC-BVA-F5-05** | F5: Admin Provisioning | Resetting password for already deactivated user | Success notification, password reset, account remains deactivated |
| **TC-BVA-F6-01** | F6: Password Quarantine | Password exactly 7 chars (boundary min-1) | Rejected: "Password must be at least 8 characters" |
| **TC-BVA-F6-02** | F6: Password Quarantine | Password exactly 8 chars (boundary min) | Accepted, password change proceeds |
| **TC-BVA-F6-03** | F6: Password Quarantine | New password equals temporary password | Warning/rejection: "New password must differ from temporary password" |
| **TC-BVA-F6-04** | F6: Password Quarantine | Password confirmation mismatch | Rejected: "Passwords do not match" |
| **TC-BVA-F6-05** | F6: Password Quarantine | Quarantined user clicking sidebar links | URL changes intercepted, stays on `/change-password` |
| **TC-BVA-F7-01** | F7: RBAC Guard | Student sending direct POST to `/admin/accounts/create` | Server action checks role, throws 403 Unauthorized |
| **TC-BVA-F7-02** | F7: RBAC Guard | Teacher attempting to delete another teacher's subject | Server action verifies ownership/role, rejects mutation |
| **TC-BVA-F7-03** | F7: RBAC Guard | Student altering form input `role` to 'ADMIN' | Server action ignores client role, uses verified session role |
| **TC-BVA-F7-04** | F7: RBAC Guard | CR (Class Representative) permission scope | CR can log class sessions but cannot delete subjects or create admin users |
| **TC-BVA-F7-05** | F7: RBAC Guard | Public access to `/api/uploadthing` without auth | Only authenticated endpoints permitted; student upload requires session |
| **TC-BVA-F8-01** | F8: Admin Console | Roster search with 0 matching results | Displays empty state: "No accounts match your filter criteria" |
| **TC-BVA-F8-02** | F8: Admin Console | Search with special regex characters (`.*+?^${}()`) | Treated as literal text without regex crash |
| **TC-BVA-F8-03** | F8: Admin Console | Rapid toggling of deactivate/activate switch | Optimistic UI or debounce prevents race conditions |
| **TC-BVA-F8-04** | F8: Admin Console | Admin attempting to deactivate own account | Prevented: "Cannot deactivate current active admin account" |
| **TC-BVA-F8-05** | F8: Admin Console | Pagination on large user roster (100+ accounts) | Clean page navigation without lost state |
| **TC-BVA-F9-01** | F9: Barometer Domain | Attendance 79.4% (31.76 / 40 -> 31/39 = 79.48%) | Formats to 79%, displays CAUTION zone |
| **TC-BVA-F9-02** | F9: Barometer Domain | Attendance 79.5% (rounded to 80%) | Formats to 80%, displays SAFE zone |
| **TC-BVA-F9-03** | F9: Barometer Domain | Attendance 69.4% (displays 69%) | Formats to 69%, displays DANGER zone |
| **TC-BVA-F9-04** | F9: Barometer Domain | Attendance 69.5% (displays 70%) | Formats to 70%, displays CAUTION zone |
| **TC-BVA-F9-05** | F9: Barometer Domain | Total classes = 0 (Semester start) | Returns percentage 0, total 0, attended 0, category 'SAFE' or baseline |
| **TC-BVA-F10-01** | F10: What-If Calc | Inputting negative numbers in planned classes | Input clamped to minimum 0 |
| **TC-BVA-F10-02** | F10: What-If Calc | Inputting 1000 planned classes | Calculation handles large numbers without overflow |
| **TC-BVA-F10-03** | F10: What-If Calc | Missing 100 consecutive classes | Percentage drops towards 0%, status locks to DANGER |
| **TC-BVA-F10-04** | F10: What-If Calc | Floating point input in integer class counter | Auto-rounded or sanitized to whole integer |
| **TC-BVA-F10-05** | F10: What-If Calc | What-If on 100% baseline with 0 planned misses | Stays 100%, buffer increases by $0.25 \times \text{planned}$ |
| **TC-BVA-F11-01** | F11: Dashboard | Exactly at start time (e.g. 09:00:00 NPT) | "NOW" badge activates immediately |
| **TC-BVA-F11-02** | F11: Dashboard | Exactly at end time (e.g. 10:00:00 NPT) | Class transitions from "NOW" to completed |
| **TC-BVA-F11-03** | F11: Dashboard | Zero classes scheduled for current day (Holiday/Saturday) | Displays empty state: "No classes scheduled today — enjoy your day off!" |
| **TC-BVA-F11-04** | F11: Dashboard | Expired pinned notice (`expiresAt < now`) | Expired notice omitted from Notice Board card |
| **TC-BVA-F11-05** | F11: Dashboard | Notice with multi-line content | Properly truncated with `line-clamp-2` without breaking card height |
| **TC-BVA-F12-01** | F12: Today Timeline | Selecting date far in past (e.g. 2020-01-01) | Displays historical classes correctly marked COMPLETED |
| **TC-BVA-F12-02** | F12: Today Timeline | Selecting date far in future (e.g. 2030-01-01) | Displays projected classes correctly marked UPCOMING |
| **TC-BVA-F12-03** | F12: Today Timeline | Malformed date in query string (`?date=invalid-date`) | Gracefully falls back to today's NPT date |
| **TC-BVA-F12-04** | F12: Today Timeline | Saturday view (TU Day 6 Off) | Renders empty state with day off message |
| **TC-BVA-F12-05** | F12: Today Timeline | Multiple classes in identical time slot (collision) | Both rendered cleanly without overlapping DOM elements |
| **TC-BVA-F13-01** | F13: Subjects Grid | Student enrolled in 0 subjects | Renders empty state: "No enrolled subjects found" |
| **TC-BVA-F13-02** | F13: Subject Detail | Subject with 0 units or chapters | Syllabus tab displays "No syllabus units published yet" |
| **TC-BVA-F13-03** | F13: Subject Detail | Subject with 0 logged sessions | Sessions tab displays "No class sessions recorded yet" |
| **TC-BVA-F13-04** | F13: Subject Detail | Subject with 0 resources | Resources tab displays "No course materials uploaded" |
| **TC-BVA-F13-05** | F13: Subject Detail | Rapid tab switching (Syllabus -> Sessions -> Assignments) | UI transitions cleanly without content flashing |
| **TC-BVA-F14-01** | F14: Data Isolation | Path traversal in subject URL (`/subjects/../../etc`) | Sanitized by Next.js router, returns 404 |
| **TC-BVA-F14-02** | F14: Data Isolation | Student tampering with subject ID in form submission | Server action verifies student enrollment, rejects mutation |
| **TC-BVA-F14-03** | F14: Data Isolation | Accessing assignment submission for different subject | Server-side check blocks access, returns 403 |
| **TC-BVA-F14-04** | F14: Data Isolation | Fetching attendance logs for other student ID via query param | Server resolves student identity strictly from session cookie |
| **TC-BVA-F14-05** | F14: Data Isolation | Downloading un-enrolled subject resource via direct link | File authorization middleware checks enrollment, returns 403 |
| **TC-BVA-F15-01** | F15: Attendance Hub | Submitting correction for already corrected session | Prevents duplicate pending requests for same attendance record |
| **TC-BVA-F15-02** | F15: Attendance Hub | Submitting correction with empty reason text | Form validation requires explanation (min 10 characters) |
| **TC-BVA-F15-03** | F15: Attendance Hub | Submitting correction for session attended >30 days ago | Shows policy warning or allows submission with timestamp |
| **TC-BVA-F15-04** | F15: Attendance Hub | Student reporting session where they were 'present' | Modal validates: correction only allowed for 'absent' / 'late' |
| **TC-BVA-F15-05** | F15: Attendance Hub | Student viewing pending correction status | History table shows "Pending Review" pill next to disputed record |
| **TC-BVA-F16-01** | F16: Homework Workspace | Submitting assignment exactly 1 second before deadline | Marked as on-time submission |
| **TC-BVA-F16-02** | F16: Homework Workspace | Submitting assignment 1 second after deadline | Marked as "Late" submission |
| **TC-BVA-F16-03** | F16: Homework Workspace | Saving empty draft | Disallowed: prompt requires at least text note or file |
| **TC-BVA-F16-04** | F16: Homework Workspace | Draft auto-saving while typing | Draft persists in local/server state without page refresh |
| **TC-BVA-F16-05** | F16: Homework Workspace | Viewing assignment with no grade yet in "Submitted" tab | Shows "Under Review / Awaiting Grading" badge |
| **TC-BVA-F17-01** | F17: UploadThing | Uploading 16.0 MB file (exact max size) | File upload succeeds |
| **TC-BVA-F17-02** | F17: UploadThing | Uploading 16.1 MB file (>16MB limit) | Client & server reject: "File size exceeds 16MB limit" |
| **TC-BVA-F17-03** | F17: UploadThing | Uploading unsupported file type (`.exe`, `.sh`) | Client & server reject: "Invalid file type" |
| **TC-BVA-F17-04** | F17: UploadThing | Uploading 0 byte empty file | Rejected: "File cannot be empty" |
| **TC-BVA-F17-05** | F17: UploadThing | Network disconnection during file upload | Displays upload error alert with "Retry" action |
| **TC-BVA-F18-01** | F18: E2E Infra | Port collision on test start (port 3000 busy) | Config handles fallback or raises descriptive binding error |
| **TC-BVA-F18-02** | F18: E2E Infra | Flaky network assertion retry policy | Config enforces max 2 retries in CI, 0 in local |
| **TC-BVA-F18-03** | F18: E2E Infra | Browser viewport responsiveness test | Test verifies layout at 1280x720 (Desktop) and 375x667 (Mobile) |
| **TC-BVA-F18-04** | F18: E2E Infra | Timezone forced to `Asia/Kathmandu` in Playwright context | Verifies consistent NPT time rendering across all test runners |
| **TC-BVA-F18-05** | F18: E2E Infra | Test isolation: clean cookies between test blocks | Each test runs in fresh browser context without session leakage |
| **TC-BVA-F19-01** | F19: E2E Suite | Fast-fail on database connection timeout | Test harness catches connection failure and prints actionable error |
| **TC-BVA-F19-02** | F19: E2E Suite | Test execution with missing environment variables | Fails immediately with clear missing env description |
| **TC-BVA-F19-03** | F19: E2E Suite | DOM locator timeout handling (5000ms max) | Clear locator error showing exact failing selector |
| **TC-BVA-F19-04** | F19: E2E Suite | Assertions on async server actions | Awaits response before validating DOM status changes |
| **TC-BVA-F19-05** | F19: E2E Suite | 100% clean test teardown | No lingering zombie Next.js or browser processes |

---

## 5. Tier 3: Cross-Feature Combinations (Pairwise Inter-Feature Interactions)

| Test ID | Interacting Features | Interaction Workflow | Verification & Assertion |
|---|---|---|---|
| **TC-XFEAT-01** | F5 (Admin Provisioning) + F4 (Auth) + F6 (Quarantine) | Admin creates Student -> Student logs in with temp password -> Middleware redirects to `/change-password` -> Student changes password -> Middleware unlocks `/` | Database verifies `mustChangePassword` transitions from `1` to `0`. Session cookie remains valid. User lands on Dashboard. |
| **TC-XFEAT-02** | F8 (Admin Accounts) + F4 (Auth) | Admin deactivates active Student -> Student attempts navigation or action -> Session invalidated | Subsequent request from Student returns 401/403 and redirects to `/login` with deactivation message. |
| **TC-XFEAT-03** | F7 (RBAC) + F12 (Session Logging) + F16 (Homework Spawn) | Teacher logs a Class Session with topic and homework notes -> System creates session and spawns homework record | Student opens `/homework` or `/today`: new assignment appears automatically under "Active" tab. |
| **TC-XFEAT-04** | F12 (Session Logging) + F9 (Attendance Domain) + F11 (Dashboard) | Teacher marks Student 'absent' in logged session -> Attendance records update | Dashboard attendance gauge drops; indicator changes color if dropping below 80%. |
| **TC-XFEAT-05** | F15 (Attendance Hub) + F10 (What-If Calculator) | Student in DANGER zone (65%) views Attendance page -> What-If calculator automatically initializes with current $A=26, T=40$ | What-If calculator indicates $+15$ consecutive sessions required to reach 80% safe zone. |
| **TC-XFEAT-06** | F15 (Dispute Flow) + F9 (Attendance Domain) | Student submits correction for absent record -> Teacher/Admin approves correction in backend -> Status changes to 'present' | Student refreshes `/attendance`: percentage recalculates upward; category chips update. |
| **TC-XFEAT-07** | F16 (Homework) + F17 (UploadThing) + F14 (Data Isolation) | Student submits PDF assignment solution -> UploadThing saves file -> Submission record linked | Student A can view own submission. Student B attempting direct URL view receives 403 Forbidden. |
| **TC-XFEAT-08** | F16 (Homework) + F1 (DB Schema) + Teacher Grading | Teacher enters score (19/20) and feedback for submission -> Status updates to 'graded' | Student opens `/homework`, selects "Graded" tab: assignment is present with grade badge and remarks. |
| **TC-XFEAT-09** | F6 (Quarantine) + F14 (Data Isolation) | Quarantined user attempts to access `/subjects/[id]` or `/api/uploadthing` directly | Middleware blocks request and redirects to `/change-password`. No academic data leaked. |
| **TC-XFEAT-10** | F11 (Dashboard) + F12 (Today Timeline) + F13 (Subjects) | Student clicks "Full Routine" or subject card on Dashboard | Seamless client-side navigation to `/routine` and `/subjects/[id]` preserving active tab states. |

---

## 6. Tier 4: Real-World Application Scenarios (End-to-End User Journeys)

### Scenario 1: New Student Provisioning & First-Day Onboarding Journey
- **Persona**: Admin (`admin@classroom.edu.np`) and New Student (`aayush.shrestha@classroom.edu.np`)
- **Step 1**: Admin logs into `/login` with administrative credentials.
- **Step 2**: Admin navigates to `/admin/accounts`, opens "Create Account" modal, fills in Student details (Roll: `BCA-2024-042`, Name: `Aayush Shrestha`, Faculty: `BCA`, Semester: `4`).
- **Step 3**: System creates account and outputs temporary password (`TempPass#2026`). Admin copies credentials.
- **Step 4**: Admin logs out.
- **Step 5**: Student logs in at `/login` using email and temporary password.
- **Step 6**: Middleware detects `mustChangePassword === true` and routes user to `/change-password`.
- **Step 7**: Student enters insecure/short password (`abc`) -> receives error.
- **Step 8**: Student enters secure password (`SecurePassword!2026`) and confirms.
- **Step 9**: System updates password hash, clears `mustChangePassword`, and redirects Student to `/`.
- **Step 10**: Student sees personalized dashboard greeting "Good morning/afternoon, Aayush", enrolled BCA semester 4 subjects, and timetable.

### Scenario 2: Student Daily Morning Academic Routine
- **Persona**: Active Student (`student@classroom.edu.np`)
- **Step 1**: Student opens Classroom OS at 08:30 NPT.
- **Step 2**: Dashboard (`/`) displays time-based greeting, upcoming first class at 09:00 NPT ("Starts in 30 min"), and active assignments summary.
- **Step 3**: Student clicks `/today` to inspect 7-day timeline and room locations (`Room 302`, `Lab 2`).
- **Step 4**: Student clicks into current subject (`/subjects/c-programming`) to review Syllabus progress (Unit 3: Pointers) and previous lecture notes.
- **Step 5**: At 09:05 NPT, Student returns to Dashboard: First class now displays animated "NOW" badge.
- **Step 6**: Student views pinned Notice board regarding upcoming mid-term exam schedule.

### Scenario 3: At-Risk Attendance Recovery & Dispute Lifecycle
- **Persona**: Student with low attendance (`atrisk@classroom.edu.np`, 68% attendance in DANGER zone)
- **Step 1**: Student logs in and lands on Dashboard: Attendance widget highlights red DANGER zone (68%).
- **Step 2**: Student navigates to `/attendance` to view detailed subject breakdown.
- **Step 3**: Student uses the "What-If Projection Calculator": models attending the next 8 classes, observing projected recovery to 81% (SAFE zone).
- **Step 4**: In the Attendance History log, Student spots a class on `2026-08-10` where they were present but recorded as absent.
- **Step 5**: Student clicks "Report Incorrect Attendance", enters explanation: *"Present in Room 301, verified with CR lecture log"*, and submits.
- **Step 6**: Verification: Correction record created with status `pending`. History table displays "Correction Pending" badge.

### Scenario 4: Assignment Submission & Feedback Lifecycle
- **Persona**: Student (`student@classroom.edu.np`)
- **Step 1**: Student navigates to `/homework`.
- **Step 2**: "Active" tab displays *"Assignment 3: Red-Black Tree Implementation"* marked "Due in 2 days".
- **Step 3**: Student opens assignment modal, types initial code notes in text answer box, and clicks "Save Draft".
- **Step 4**: Student closes modal and refreshes page: Draft answer is preserved.
- **Step 5**: Student attaches completed PDF report (`red_black_tree_analysis.pdf`) via UploadThing file picker.
- **Step 6**: Student clicks "Submit Assignment".
- **Step 7**: Modal closes with success toast. Assignment moves to "Submitted" tab.
- **Step 8**: Student inspects previously graded assignment in "Graded" tab, viewing grade `A-`, score `18/20`, and teacher remarks.

### Scenario 5: Multi-Tenant Data Isolation & Security Penetration Probing
- **Persona**: Student A (`student@classroom.edu.np`, BCA) attempting unauthorized access
- **Step 1**: Student A attempts to access CSIT-only subject detail page (`/subjects/csit-discrete-math`).
- **Step 2**: Server-side authorization check triggers; page renders 404 Not Found / 403 Forbidden with zero data disclosure.
- **Step 3**: Student A attempts to access another student's assignment submission directly via URL (`/homework/submissions/sub-student-b-999`).
- **Step 4**: Server action denies access with 403 Unauthorized.
- **Step 5**: Student A attempts to navigate to `/admin/accounts` or `/admin/students`.
- **Step 6**: Middleware intercepts role mismatch (`STUDENT` vs `ADMIN`), redirecting safely to `/`.

---

## 7. Category-Partition & BVA Specifications for 5 Target Spec Files

```
                               Target Spec Files Mapping
┌───────────────────────────────┬────────────────────────────────────────────────────────┐
│ Spec File                     │ Target Features                                        │
├───────────────────────────────┼────────────────────────────────────────────────────────┤
│ auth-lifecycle.spec.ts        │ F4 (Auth), F5 (Admin Provisioning), F6 (Quarantine),   │
│                               │ F7 (RBAC), F8 (Admin Console)                          │
│ dashboard-schedule.spec.ts    │ F11 (Dashboard), F12 (Today Timeline), F13 (Subjects)  │
│ attendance-barometer.spec.ts  │ F9 (TU 80% Barometer), F10 (What-If), F15 (Dispute)    │
│ homework-submissions.spec.ts  │ F16 (Homework Tabs & Drafts), F17 (UploadThing Storage)│
│ subject-isolation.spec.ts     │ F13 (Subjects Workspace), F14 (Strict Data Isolation)  │
└───────────────────────────────┴────────────────────────────────────────────────────────┘
```

### Spec 1: `auth-lifecycle.spec.ts`
- **Category-Partition Parameters**:
  - `UserRole`: `ADMIN`, `TEACHER`, `CR`, `STUDENT`, `UNAUTHENTICATED`
  - `CredentialValidity`: `Valid`, `InvalidPassword`, `UnregisteredEmail`, `EmptyEmail`, `EmptyPassword`, `SQLInjection`
  - `QuarantineStatus`: `mustChangePassword = true`, `mustChangePassword = false`
  - `AccountStatus`: `isActive = 1`, `isActive = 0`
  - `PasswordCompliance`: `<8 chars`, `>=8 chars`, `MismatchConfirmation`, `SameAsTemp`
- **BVA Points**:
  - Password length: 7 chars (fail), 8 chars (pass), 72 chars (pass).
  - Session TTL: 0 sec (fresh), 30 days - 1 min (valid), 30 days + 1 min (expired).
- **Test Matrix (15 Test Cases)**:
  1. `TC-SPEC-AUTH-01`: Nominal Admin login with valid credentials -> redirects to `/admin/accounts` or `/`.
  2. `TC-SPEC-AUTH-02`: Nominal Student login with valid credentials -> lands on `/`.
  3. `TC-SPEC-AUTH-03`: Invalid password attempt -> shows error alert, preserves email field.
  4. `TC-SPEC-AUTH-04`: Unregistered email login -> shows generic "Invalid credentials" error.
  5. `TC-SPEC-AUTH-05`: Empty email or password submission -> client-side validation prevents submit.
  6. `TC-SPEC-AUTH-06`: SQL injection string in email -> safely rejected without internal error.
  7. `TC-SPEC-AUTH-07`: First-time student login with `mustChangePassword=true` -> redirected to `/change-password`.
  8. `TC-SPEC-AUTH-08`: Quarantined student attempting to navigate to `/attendance` -> forced back to `/change-password`.
  9. `TC-SPEC-AUTH-09`: Password change with 7 characters -> rejected with validation message.
  10. `TC-SPEC-AUTH-10`: Password change with mismatched confirmation -> rejected.
  11. `TC-SPEC-AUTH-11`: Password change with valid 8+ chars -> succeeds, `mustChangePassword` cleared, lands on `/`.
  12. `TC-SPEC-AUTH-12`: Student user accessing `/admin/accounts` -> receives 403 / redirected to `/`.
  13. `TC-SPEC-AUTH-13`: Admin creating a new student account in `/admin/accounts` -> receives modal with temp credentials.
  14. `TC-SPEC-AUTH-14`: Admin deactivating a student account -> student login rejected with deactivated account notice.
  15. `TC-SPEC-AUTH-15`: User logout -> clears session cookie, navigates back to `/login`.

### Spec 2: `dashboard-schedule.spec.ts`
- **Category-Partition Parameters**:
  - `ServerTimeNPT`: `Morning (06:00-11:59)`, `Afternoon (12:00-16:59)`, `Evening (17:00-23:59)`
  - `ClassTemporalState`: `Past (< current time)`, `Ongoing (start <= current <= end)`, `Upcoming (> current time)`
  - `RoutineDay`: `Weekday with classes (Sun-Fri)`, `Saturday / Holiday (0 classes)`
  - `NoticeState`: `Pinned Active`, `Unpinned Active`, `Expired`
- **BVA Points**:
  - Exact time boundaries: $T_{\text{start}} - 1\text{s}$ (Upcoming), $T_{\text{start}}$ (Ongoing / NOW badge), $T_{\text{end}}$ (Ongoing), $T_{\text{end}} + 1\text{s}$ (Past / Completed).
  - 7-day selector index: Day 0 (Sunday) to Day 6 (Saturday).
- **Test Matrix (12 Test Cases)**:
  1. `TC-SPEC-DASH-01`: Morning NPT greeting renders "Good morning, [FirstName]".
  2. `TC-SPEC-DASH-02`: Afternoon NPT greeting renders "Good afternoon, [FirstName]".
  3. `TC-SPEC-DASH-03`: Evening NPT greeting renders "Good evening, [FirstName]".
  4. `TC-SPEC-DASH-04`: Active ongoing class displays prominent pulsating "NOW" badge.
  5. `TC-SPEC-DASH-05`: Upcoming class displays relative start time (e.g. "Starts in 25 min").
  6. `TC-SPEC-DASH-06`: Past class displays strike-through/muted completed styling.
  7. `TC-SPEC-DASH-07`: Attendance summary card displays accurate overall percentage and zone indicator.
  8. `TC-SPEC-DASH-08`: Pending assignments card displays count and top urgent deadlines.
  9. `TC-SPEC-DASH-09`: Notice board renders pinned notices at top with 📌 indicator.
  10. `TC-SPEC-DASH-10`: Notice board excludes expired notices.
  11. `TC-SPEC-DASH-11`: Today timeline (`/today`) renders 7-day date strip with active day highlighted.
  12. `TC-SPEC-DASH-12`: Today timeline prev/next navigation correctly loads adjacent day schedules.

### Spec 3: `attendance-barometer.spec.ts`
- **Category-Partition Parameters**:
  - `AttendanceZone`: `SAFE (>=80%)`, `CAUTION (70%-79%)`, `DANGER (<70%)`, `PERFECT (100%)`, `ZERO (0%)`
  - `WhatIfMode`: `Planned Attended (+N)`, `Planned Missed (+M)`, `Combined (+N attended, +M missed)`
  - `DisputeEligibility`: `Absent session`, `Late session`, `Present session (ineligible)`
- **BVA Points**:
  - Threshold rounding: 79.4% (CAUTION), 79.5% (SAFE), 69.4% (DANGER), 69.5% (CAUTION).
  - Safety buffer: $A=32, T=40 \implies \text{Buffer}=0$; $A=33, T=40 \implies \text{Buffer}=+1$; $A=31, T=40 \implies \text{Recovery}=5$.
- **Test Matrix (15 Test Cases)**:
  1. `TC-SPEC-ATT-01`: Student with 85% attendance displays emerald gauge and "SAFE ZONE" chip.
  2. `TC-SPEC-ATT-02`: Student with 75% attendance displays amber gauge and "CAUTION" chip.
  3. `TC-SPEC-ATT-03`: Student with 62% attendance displays red gauge and "DANGER" chip.
  4. `TC-SPEC-ATT-04`: Exact 80% boundary displays SAFE zone with 0 missable sessions.
  5. `TC-SPEC-ATT-05`: 79% boundary displays CAUTION zone with exact classes needed to recover.
  6. `TC-SPEC-ATT-06`: Subject breakdown table lists all enrolled subjects with module code and attendance ratio.
  7. `TC-SPEC-ATT-07`: Subject progress bar correctly colors emerald (>=80%) or red (<80%).
  8. `TC-SPEC-ATT-08`: What-If calculator increments planned attendance -> projected gauge updates reactively.
  9. `TC-SPEC-ATT-09`: What-If calculator increments planned missed classes -> safety buffer decrements.
  10. `TC-SPEC-ATT-10`: What-If calculator reset button restores baseline attendance metrics.
  11. `TC-SPEC-ATT-11`: Attendance history table renders chronological log of all class sessions.
  12. `TC-SPEC-ATT-12`: Report Incorrect Attendance modal opens when clicking dispute on absent session.
  13. `TC-SPEC-ATT-13`: Submitting correction form with valid reason creates pending request.
  14. `TC-SPEC-ATT-14`: Submitting correction with empty reason flags validation error.
  15. `TC-SPEC-ATT-15`: Correction pending badge appears next to disputed session in history log.

### Spec 4: `homework-submissions.spec.ts`
- **Category-Partition Parameters**:
  - `HomeworkTab`: `Active`, `Completed`, `Archived`
  - `DueStatus`: `Due Soon (<24h)`, `Normal (>24h)`, `Overdue (past deadline)`
  - `SubmissionContent`: `Text only`, `File only`, `Text + File`, `Empty`
  - `SubmissionStatus`: `Draft`, `Submitted`, `Late`, `Graded`
  - `FileSize`: `0 MB (empty)`, `<=16 MB (valid)`, `>16 MB (oversized)`
- **BVA Points**:
  - Due deadline: $T_{\text{due}} - 1\text{min}$ (Due Soon), $T_{\text{due}} + 1\text{min}$ (Overdue).
  - File size: 15.9 MB (pass), 16.0 MB (pass), 16.1 MB (fail).
- **Test Matrix (14 Test Cases)**:
  1. `TC-SPEC-HW-01`: "Active" tab displays pending assignments ordered by nearest deadline.
  2. `TC-SPEC-HW-02`: Assignment due in 12 hours displays amber "Due Soon" chip.
  3. `TC-SPEC-HW-03`: Assignment past deadline displays red "Overdue" chip and top border alert.
  4. `TC-SPEC-HW-04`: Opening assignment modal loads assignment title, description, and due date.
  5. `TC-SPEC-HW-05`: Typing answer in text editor and clicking "Save Draft" saves draft state.
  6. `TC-SPEC-HW-06`: Closing and re-opening draft assignment retains saved draft text.
  7. `TC-SPEC-HW-07`: Selecting valid PDF attachment (<16MB) updates file picker with filename.
  8. `TC-SPEC-HW-08`: Selecting oversized file (>16MB) triggers client-side size limit alert.
  9. `TC-SPEC-HW-09`: Submitting assignment transitions card from "Active" to "Submitted" tab.
  10. `TC-SPEC-HW-10`: Submitting after due date flags submission status as "Late".
  11. `TC-SPEC-HW-11`: "Completed" tab displays all submitted assignments.
  12. `TC-SPEC-HW-12`: Graded assignment displays obtained score, pass/fail status, and teacher remarks.
  13. `TC-SPEC-HW-13`: Coding assignment badge renders with code icon when description contains programming keywords.
  14. `TC-SPEC-HW-14`: Empty homework tab renders clean empty state icon and descriptive text.

### Spec 5: `subject-isolation.spec.ts`
- **Category-Partition Parameters**:
  - `EnrollmentStatus`: `Enrolled (Permitted)`, `Unenrolled (Forbidden)`, `Non-Existent ID`
  - `SubjectTab`: `Syllabus`, `Sessions`, `Assignments`, `Resources`
  - `ResourceAccess`: `Public Material`, `Enrolled Subject Material`, `Other Subject Material`
  - `UserPersona`: `Student A (BCA)`, `Student B (CSIT)`, `Teacher`, `Admin`
- **BVA Points**:
  - Malformed URL: `/subjects/undefined`, `/subjects/null`, `/subjects/123-bad-id`.
  - Directory traversal: `/subjects/../admin`, `/subjects/%2e%2e/admin`.
- **Test Matrix (12 Test Cases)**:
  1. `TC-SPEC-ISO-01`: Student views `/subjects` grid displaying only enrolled subjects.
  2. `TC-SPEC-ISO-02`: Student clicks enrolled subject -> loads `/subjects/[id]` with 4 functional tabs.
  3. `TC-SPEC-ISO-03`: Syllabus Progress tab displays units, chapters, and completion checkmarks.
  4. `TC-SPEC-ISO-04`: Sessions tab displays chronological lecture log for enrolled subject.
  5. `TC-SPEC-ISO-05`: Assignments tab displays homework tasks linked specifically to this subject.
  6. `TC-SPEC-ISO-06`: Resources tab displays downloadable materials uploaded for this subject.
  7. `TC-SPEC-ISO-07`: Student A navigates directly to un-enrolled Subject B ID -> renders 404 / 403 Forbidden.
  8. `TC-SPEC-ISO-08`: Non-existent subject ID URL -> renders 404 Not Found page.
  9. `TC-SPEC-ISO-09`: Student A attempts to access Student B's assignment submission URL -> 403 Forbidden.
  10. `TC-SPEC-ISO-10`: Student attempts direct GET to un-enrolled course material URL -> 403 Forbidden.
  11. `TC-SPEC-ISO-11`: Path traversal attempt in subject route -> normalized safely, 404 rendered.
  12. `TC-SPEC-ISO-12`: Teacher access to assigned subject details succeeds without isolation block.

---

## 8. Draft Structure for `TEST_INFRA.md`

```markdown
# Classroom OS — E2E Testing Infrastructure Guide (`TEST_INFRA.md`)

## 1. Overview & Principles
- Opaque-box testing standard: DOM interactions, standard navigation, cookies, and HTTP responses.
- Deterministic seeding with fixed academic personas and 45 historical sessions.
- Asia/Kathmandu (NPT, UTC+5:45) timezone synchronization across Playwright contexts.

## 2. Test Architecture & Directory Layout
- `playwright.config.ts`: Web server boot (`npm run dev`), Chromium desktop, 120s timeout, traces/screenshots on failure.
- `tests/fixtures/auth.fixture.ts`: Direct session injection for Admin, Student, Quarantined Student, and Unenrolled Student.
- `tests/fixtures/seed-data.ts`: Deterministic seed constants (IDs, Emails, Roles, Subjects, Sessions).
- `tests/e2e/`:
  - `auth-lifecycle.spec.ts`
  - `dashboard-schedule.spec.ts`
  - `attendance-barometer.spec.ts`
  - `homework-submissions.spec.ts`
  - `subject-isolation.spec.ts`

## 3. 4-Tier Test Methodology
- Tier 1: Feature Coverage (Happy path execution of F1-F19)
- Tier 2: Boundary Value Analysis & Negative Testing (BVA points, limit conditions, invalid states)
- Tier 3: Pairwise Cross-Feature Combinations (Inter-feature triggers and cascading workflows)
- Tier 4: Real-World Application Scenarios (End-to-end multi-step user journeys)

## 4. Test Execution Commands
- Run all tests: `npx playwright test`
- Run specific suite: `npx playwright test tests/e2e/auth-lifecycle.spec.ts`
- Run in UI mode: `npx playwright test --ui`
- Run with debug traces: `npx playwright test --trace on`
- View HTML report: `npx playwright show-report`

## 5. Mocking & Synthetic File Handling
- UploadThing synthetic attachment strategy: Playwright `setInputFiles` with synthetic PDF/DOCX buffers.
- Deterministic DB reset before test execution: `npm run db:verify` / `tsx src/db/seed.ts`.
```

---

## 9. Caveats
- No caveats. All 19 features (F1 to F19), 5 target spec files, 4 test tiers, category-partition parameters, BVA points, cross-feature combinations, real-world user journeys, and `TEST_INFRA.md` structure have been fully specified and cross-referenced with authoritative documentation and codebase files.

---

## 10. Conclusion
The 4-tier opaque-box test strategy is fully defined with:
- **Tier 1**: 95+ feature coverage test cases across F1-F19.
- **Tier 2**: 95+ boundary and negative test cases covering exact limit conditions, BVA thresholds, and failure modes.
- **Tier 3**: 10 pairwise cross-feature combination test cases modeling end-to-end cascading database and UI triggers.
- **Tier 4**: 5 multi-step real-world application user journeys (Onboarding, Daily Routine, Attendance Recovery, Assignment Lifecycle, Multi-tenant Isolation).
- **Target Spec Blueprints**: Exhaustive test matrices for all 5 target spec files (`auth-lifecycle.spec.ts`, `dashboard-schedule.spec.ts`, `attendance-barometer.spec.ts`, `homework-submissions.spec.ts`, `subject-isolation.spec.ts`).
- **Test Infrastructure Blueprint**: Comprehensive draft structure for `TEST_INFRA.md`.

---

## 11. Verification Method
- **Specification Cross-Check**: Inspect `ORIGINAL_REQUEST.md`, `PROJECT.md`, `SCOPE.md`, `src/db/schema.ts`, `src/app/(student)/`, and `src/lib/attendance.ts` to confirm every formula, route, and constraint matches the test matrix.
- **Spec Coverage Check**: Validate that all 5 target spec files in `tests/e2e/` map directly to their designated features without unassigned gaps.
- **BVA Validation**: Confirm TU 80% boundary calculations ($A=32, T=40 \implies 80.0\%$, $A=31, T=40 \implies 77.5\%$) match the mathematical formulation in `src/lib/attendance.ts`.
