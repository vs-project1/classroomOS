# Technical Analysis & Specification: Database Seeding Infrastructure & Initialization

## Executive Summary
This document delivers the comprehensive design and architectural specification for the **Classroom OS Database Seeding Infrastructure** (`src/db/seed.ts` and `npm run db:seed`), supporting Milestone 1 (F3). 

Classroom OS requires an institutional-grade, zero-trust, deterministic database initialization that populates a complete Tribhuvan University (TU) BCA 4th Semester academic workspace. The seeder generates realistic mock data covering all 4 system roles (`ADMIN`, `TEACHER`, `CR`, `STUDENT`), 5 academic subjects, 15 weekly routine periods, 45 chronologically ordered historical sessions with lecture logs, 360 individual attendance records precisely distributed into 4 distinct attendance zones (Perfect 100%, Safe >85%, Caution 75-85%, Danger <75%), 6 assignments with multi-state submissions (`draft`, `submitted`, `graded`, `late`), 3 exams with student results, subject resources, personal study tasks, college notices, events, notifications, and attendance correction requests.

---

## 1. Password Hashing Verification & Cryptographic Architecture

### 1.1 Package.json Dependency Audit
An audit of `package.json` revealed:
- `next`: `16.2.10`, `react`: `19.2.4`, `@libsql/client`: `^0.17.4`, `drizzle-orm`: `^0.45.2`, `zod`: `^4.4.3`, `tsx`: `^4.23.1`, `@types/node`: `^20`.
- Neither `bcrypt` nor `bcryptjs` is installed in `dependencies` or `devDependencies`.

### 1.2 Cryptographic Standard Selection
In accordance with `PROJECT.md` §Interface Contracts and `explorer_survey_auth_sec_1/handoff.md` §2.2.2, Classroom OS standardizes on the **Node.js standard library `node:crypto` `scrypt` hashing**:
- **Algorithm**: `node:crypto` `scryptSync` with 16-byte cryptographically secure random salt and 64-byte key length.
- **Storage Format**: `${salt}:${derivedKeyHex}` (Salt: 32 hex chars, Derived Key: 128 hex chars, Total length: 161 characters).
- **Zero External Dependencies**: Eliminates native compilation issues (node-gyp / Python / MSBuild) on Windows and cross-platform environments.
- **Performance**: Instantaneous for seed execution while providing enterprise-grade brute-force resistance against dictionary and rainbow-table attacks.
- **Verification Compatibility**: Timing-safe buffer comparison (`crypto.timingSafeEqual`) prevents side-channel timing analysis.

### 1.3 Standalone Password Hashing Implementation
```typescript
import crypto from "node:crypto";

export function hashPassword(plainText: string): string {
  const salt = crypto.randomBytes(16).toString("hex");
  const derivedKey = crypto.scryptSync(plainText, salt, 64);
  return `${salt}:${derivedKey.toString("hex")}`;
}

export function verifyPassword(plainText: string, storedHash: string): boolean {
  const [salt, key] = storedHash.split(":");
  if (!salt || !key) return false;
  const derivedKey = crypto.scryptSync(plainText, salt, 64);
  const keyBuffer = Buffer.from(key, "hex");
  return crypto.timingSafeEqual(keyBuffer, derivedKey);
}
```

---

## 2. Relational Dependency Hierarchy & Truncation Order

To prevent foreign key constraint violations during seeding, table deletion and insertion must follow strict topological sorting.

```
┌────────────────────────────────────────────────────────────────────────┐
│                        Insertion Hierarchy                             │
├────────────────────────────────────────────────────────────────────────┤
│ Level 0: users, notices, events                                        │
│ Level 1: teachers, students, student_profiles                          │
│ Level 2: subjects                                                      │
│ Level 3: weekly_routine, enrollments, course_units, resources,         │
│          study_tasks, notifications                                    │
│ Level 4: course_chapters                                               │
│ Level 5: course_materials                                              │
│ Level 6: class_sessions, exams                                         │
│ Level 7: lecture_logs, attendance, homework, exam_results              │
│ Level 8: assignment_submissions, attendance_correction_requests        │
└────────────────────────────────────────────────────────────────────────┘
```

### 2.1 Table Truncation / Cleanup Order (Reverse Topological)
1. `attendance_correction_requests`
2. `assignment_submissions`
3. `exam_results`
4. `notifications`
5. `study_tasks`
6. `resources`
7. `course_materials`
8. `course_chapters`
9. `course_units`
10. `lecture_logs`
11. `attendance`
12. `homework`
13. `class_sessions`
14. `exams`
15. `weekly_routine`
16. `enrollments`
17. `student_profiles`
18. `students`
19. `subjects`
20. `teachers`
21. `users`
22. `notices`
23. `events`

---

## 3. Detailed Seeding Dataset Specification

### 3.1 Users & Identity Accounts
Populates 1 Administrator, 4 Subject Teachers, 1 Class Representative (CR), and 7 Regular Students (Total: 13 User Accounts).

| User ID | Name | Email | Role | Default Password | Must Change PW | Linked Entity |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `usr_admin_01` | System Administrator | `admin@classroom.os` | `ADMIN` | `AdminPassword123!` | `false` | System Admin |
| `usr_teacher_rajesh` | Prof. Rajesh Shrestha | `rajesh.shrestha@classroom.os` | `TEACHER` | `TeacherPass123!` | `false` | `tch_rajesh_01` |
| `usr_teacher_sunita` | Er. Sunita Sharma | `sunita.sharma@classroom.os` | `TEACHER` | `TeacherPass123!` | `false` | `tch_sunita_02` |
| `usr_teacher_bishal` | Dr. Bishal Thapa | `bishal.thapa@classroom.os` | `TEACHER` | `TeacherPass123!` | `false` | `tch_bishal_03` |
| `usr_teacher_anjali` | Ms. Anjali Adhikari | `anjali.adhikari@classroom.os` | `TEACHER` | `TeacherPass123!` | `false` | `tch_anjali_04` |
| `usr_student_aarav` | Aarav Joshi (CR) | `aarav.joshi@classroom.os` | `CR` | `TempPassword123!` | `true` | `std_aarav_cr` / `sp_aarav_cr` |
| `usr_student_bipana` | Bipana Adhikari | `bipana.adhikari@classroom.os` | `STUDENT` | `StudentPass123!` | `false` | `std_bipana_02` / `sp_bipana_02` |
| `usr_student_rohan` | Rohan Shrestha | `rohan.shrestha@classroom.os` | `STUDENT` | `StudentPass123!` | `false` | `std_rohan_03` / `sp_rohan_03` |
| `usr_student_sneha` | Sneha Sharma | `sneha.sharma@classroom.os` | `STUDENT` | `StudentPass123!` | `false` | `std_sneha_04` / `sp_sneha_04` |
| `usr_student_niraj` | Niraj Karki | `niraj.karki@classroom.os` | `STUDENT` | `StudentPass123!` | `false` | `std_niraj_05` / `sp_niraj_05` |
| `usr_student_puja` | Puja KC | `puja.kc@classroom.os` | `STUDENT` | `StudentPass123!` | `false` | `std_puja_06` / `sp_puja_06` |
| `usr_student_dipen` | Dipen Tamang | `dipen.tamang@classroom.os` | `STUDENT` | `StudentPass123!` | `false` | `std_dipen_07` / `sp_dipen_07` |
| `usr_student_kriti` | Kriti Maharjan | `kriti.maharjan@classroom.os` | `STUDENT` | `StudentPass123!` | `false` | `std_kriti_08` / `sp_kriti_08` |

### 3.2 Teachers & Department Assignments
- `tch_rajesh_01`: Prof. Rajesh Shrestha (Head of Computer Applications, phone: `+977-9841234567`, faculties: `["BCA", "CSIT"]`, semesters: `["4th Semester", "2nd Semester"]`)
- `tch_sunita_02`: Er. Sunita Sharma (Assistant Professor, phone: `+977-9841234568`, faculties: `["BCA"]`, semesters: `["4th Semester"]`)
- `tch_bishal_03`: Dr. Bishal Thapa (Associate Professor, phone: `+977-9841234569`, faculties: `["BCA", "BIT"]`, semesters: `["4th Semester", "6th Semester"]`)
- `tch_anjali_04`: Ms. Anjali Adhikari (Lecturer in Mathematics, phone: `+977-9841234570`, faculties: `["BCA"]`, semesters: `["4th Semester"]`)

### 3.3 Students & Student Profiles
Academic Profiles configured for Tribhuvan University BCA Batch 2024 (4th Semester, Section A):

| Student ID | Profile ID | User ID | Roll Number | Name | Faculty | Semester | Section | Batch |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `std_aarav_cr` | `sp_aarav_cr` | `usr_student_aarav` | `2024-BCA-001` | Aarav Joshi | BCA | 4 | A | 2024 |
| `std_bipana_02` | `sp_bipana_02` | `usr_student_bipana` | `2024-BCA-002` | Bipana Adhikari | BCA | 4 | A | 2024 |
| `std_rohan_03` | `sp_rohan_03` | `usr_student_rohan` | `2024-BCA-003` | Rohan Shrestha | BCA | 4 | A | 2024 |
| `std_sneha_04` | `sp_sneha_04` | `usr_student_sneha` | `2024-BCA-004` | Sneha Sharma | BCA | 4 | A | 2024 |
| `std_niraj_05` | `sp_niraj_05` | `usr_student_niraj` | `2024-BCA-005` | Niraj Karki | BCA | 4 | A | 2024 |
| `std_puja_06` | `sp_puja_06` | `usr_student_puja` | `2024-BCA-006` | Puja KC | BCA | 4 | A | 2024 |
| `std_dipen_07` | `sp_dipen_07` | `usr_student_dipen` | `2024-BCA-007` | Dipen Tamang | BCA | 4 | A | 2024 |
| `std_kriti_08` | `sp_kriti_08` | `usr_student_kriti` | `2024-BCA-008` | Kriti Maharjan | BCA | 4 | A | 2024 |

### 3.4 Subjects, Units, Chapters & Enrollments
5 Core BCA 4th Semester Subjects:
1. `subj_dbms`: **Database Management System** (`CACS251`) — Teacher: Prof. Rajesh Shrestha (`tch_rajesh_01`)
   - Unit 1: Introduction to DBMS & Relational Model $\rightarrow$ Chapters: Database Architecture, ER Modeling
   - Unit 2: Relational Algebra & SQL $\rightarrow$ Chapters: DDL/DML, Advanced Joins & Subqueries
   - Unit 3: Normalization & Storage $\rightarrow$ Chapters: 1NF-BCNF, B+ Tree Indexing
   - Unit 4: Transaction & Concurrency $\rightarrow$ Chapters: ACID Properties, 2PL & Deadlock
2. `subj_os`: **Operating Systems** (`CACS252`) — Teacher: Er. Sunita Sharma (`tch_sunita_02`)
   - Unit 1: OS Principles & Process Management $\rightarrow$ Chapters: System Calls, Process Control Blocks
   - Unit 2: CPU Scheduling & Synchronization $\rightarrow$ Chapters: Scheduling Algorithms, Semaphores & Mutex
   - Unit 3: Memory Management $\rightarrow$ Chapters: Paging & Segmentation, Virtual Memory
3. `subj_web2`: **Web Technology II** (`CACS253`) — Teacher: Dr. Bishal Thapa (`tch_bishal_03`)
   - Unit 1: Advanced JavaScript & TypeScript $\rightarrow$ Chapters: Async/Await, Type Systems
   - Unit 2: Modern React & Next.js $\rightarrow$ Chapters: Server Components, Server Actions
   - Unit 3: Backend APIs & State $\rightarrow$ Chapters: RESTful Design, Drizzle ORM
4. `subj_nm`: **Numerical Methods** (`CACS254`) — Teacher: Ms. Anjali Adhikari (`tch_anjali_04`)
   - Unit 1: Solution of Non-Linear Equations $\rightarrow$ Chapters: Bisection Method, Newton-Raphson
   - Unit 2: Interpolation & Integration $\rightarrow$ Chapters: Lagrange Interpolation, Simpson's Rules
5. `subj_se`: **Software Engineering** (`CACS255`) — Teacher: Prof. Rajesh Shrestha (`tch_rajesh_01`)
   - Unit 1: Software Process Models $\rightarrow$ Chapters: Waterfall vs Agile Scrum, Requirement Analysis
   - Unit 2: Design & Testing $\rightarrow$ Chapters: Architectural Design, Unit & Integration Testing

*Enrollments*: All 8 students are enrolled in all 5 subjects (40 total enrollment records).

### 3.5 Weekly Routine (15 periods / week)
Schedule operates Sunday (0) through Thursday (4), 3 periods per day:
- **Slot 1 (07:00 - 08:30)**: Morning Period 1
- **Slot 2 (08:45 - 10:15)**: Morning Period 2 (after 15-min tea break)
- **Slot 3 (10:30 - 12:00)**: Late Morning Period 3

| Day of Week | Period 1 (07:00 - 08:30) | Period 2 (08:45 - 10:15) | Period 3 (10:30 - 12:00) |
| :--- | :--- | :--- | :--- |
| **0: Sunday** | DBMS (`CACS251`, Room 301) | OS (`CACS252`, Room 301) | Web Tech II (`CACS253`, Lab 2) |
| **1: Monday** | Numerical Methods (`CACS254`, Room 301) | Software Eng (`CACS255`, Room 301) | DBMS (`CACS251`, Room 301) |
| **2: Tuesday** | OS (`CACS252`, Room 301) | Web Tech II (`CACS253`, Lab 2) | Numerical Methods (`CACS254`, Room 301) |
| **3: Wednesday** | Software Eng (`CACS255`, Room 301) | DBMS (`CACS251`, Lab 1) | OS (`CACS252`, Room 301) |
| **4: Thursday** | Web Tech II (`CACS253`, Lab 2) | Numerical Methods (`CACS254`, Room 301) | Software Eng (`CACS255`, Room 301) |

---

### 3.6 45 Historical Sessions & Lecture Logs
45 chronological sessions spanning 15 teaching days (3 weeks of academic instruction):
- Week 1: 15 sessions (Sessions 1 to 15)
- Week 2: 15 sessions (Sessions 16 to 30)
- Week 3: 15 sessions (Sessions 31 to 45)

Each session is bound to:
1. `class_sessions` with exact timestamp in NPT (`Asia/Kathmandu`).
2. `lecture_logs` with realistic curriculum topics covered, daily homework recap, and teacher observations.

*Sample Lecture Logs Topics*:
- DBMS: "Relational Schema Mapping from ER Models", "SQL Multi-table Complex Joins & Views", "Functional Dependency & Boyce-Codd Normal Form (BCNF)", "ACID Properties & Two-Phase Locking Protocol".
- OS: "Process Lifecycle & Context Switching in Linux Kernel", "Shortest Job First vs Round Robin CPU Scheduling", "Banker's Algorithm for Deadlock Avoidance", "Demand Paging & Page Replacement Algorithms (LRU, FIFO)".
- Web Tech II: "TypeScript Generics & Strict Type Invariants", "React 19 Server Actions & Optimistic State", "SQLite libSQL Schema Design & Drizzle ORM", "File Upload Pipeline with UploadThing".
- Numerical Methods: "Newton-Raphson Method Convergence Analysis", "Gauss-Jordan Elimination with Partial Pivoting", "Trapezoidal & Simpson's 1/3 Rule Integration", "Runge-Kutta 4th Order Method for ODEs".
- Software Engineering: "Agile Scrum Sprint Planning & User Story Estimation", "Software Requirements Specification (SRS) IEEE 830 Standard", "UML Sequence & Class Diagrams", "Automated Testing Strategies & TDD".

---

### 3.7 4-Zone Attendance Distribution Matrix (360 Records)
Every session has attendance recorded for all 8 students (45 sessions x 8 students = 360 records). The distribution creates realistic academic cohorts across all 4 barometer zones:

| Student | Present | Late | Absent | Excused | Total | Present % | Barometer Zone | Missable Buffer / Recovery Target |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Kriti Maharjan** (`std_kriti_08`) | 45 | 0 | 0 | 0 | 45 | **100.0%** | **PERFECT** | $+11$ missable sessions |
| **Aarav Joshi (CR)** (`std_aarav_cr`) | 42 | 0 | 2 | 1 | 45 | **93.3%** | **SAFE** | $+7$ missable sessions |
| **Bipana Adhikari** (`std_bipana_02`) | 39 | 1 | 4 | 1 | 45 | **88.9%** | **SAFE** | $+5$ missable sessions |
| **Niraj Karki** (`std_niraj_05`) | 38 | 1 | 5 | 1 | 45 | **86.7%** | **SAFE** | $+3$ missable sessions |
| **Rohan Shrestha** (`std_rohan_03`) | 35 | 1 | 8 | 1 | 45 | **80.0%** | **CAUTION** | $0$ missable buffer (borderline) |
| **Puja KC** (`std_puja_06`) | 34 | 1 | 9 | 1 | 45 | **77.8%** | **CAUTION** | Needs **5** consecutive classes to reach 80% |
| **Sneha Sharma** (`std_sneha_04`) | 29 | 1 | 14 | 1 | 45 | **66.7%** | **DANGER** | Needs **30** consecutive classes to reach 80% |
| **Dipen Tamang** (`std_dipen_07`) | 24 | 1 | 18 | 2 | 45 | **55.6%** | **DANGER** | Needs **55** consecutive classes to reach 80% |

---

### 3.8 Assignments & Multi-State Submissions

#### 6 Assignments:
1. `hw_01`: **"ER Modeling & BCNF Normalization for Hospital Management System"** (DBMS, Due: 10 days ago, Status: `'completed'`)
2. `hw_02`: **"CPU Scheduling Algorithm Simulator in C/C++"** (OS, Due: 5 days ago, Status: `'completed'`)
3. `hw_03`: **"React 19 Server Actions Task Management System"** (Web Tech, Due: in 3 days, Status: `'active'`)
4. `hw_04`: **"Newton-Raphson & Gauss Elimination Numerical Lab Report"** (Numerical Methods, Due: in 5 days, Status: `'active'`)
5. `hw_05`: **"Software Requirements Specification (SRS) for HealthTech Portal"** (Software Eng, Due: 2 days ago, Status: `'active'` / Overdue)
6. `hw_06`: **"Indexing & Query Optimization Benchmark Analysis"** (DBMS, Due: in 7 days, Status: `'active'`)

#### Submissions across all states:
- **`graded`**: Evaluated with score, letter grade, and constructive teacher feedback.
  - Aarav Joshi on `hw_01`: Score 95/100, Grade "A+", Feedback: "Excellent BCNF dependency preservation analysis and clean ER diagram."
  - Kriti Maharjan on `hw_01`: Score 98/100, Grade "A+", Feedback: "Flawless schema design and clear indexing explanation."
  - Rohan Shrestha on `hw_01`: Score 78/100, Grade "B+", Feedback: "Good effort; missed 3NF transitive dependency check in Patient table."
  - Sneha Sharma on `hw_01`: Score 65/100, Grade "C+", Feedback: "Diagram incomplete; normalization steps require more mathematical rigor."
- **`submitted`**: Student submitted on time with file URL, awaiting teacher evaluation.
  - Bipana Adhikari on `hw_03`: "Completed Next.js 16 App Router fullstack app with Drizzle ORM."
  - Niraj Karki on `hw_03`: "Submitted repository link and walkthrough video."
- **`draft`**: Student working on response, solution saved without final submission.
  - Rohan Shrestha on `hw_04`: "Working on Simpson's 1/3 rule error analysis section..."
  - Puja KC on `hw_03`: "Drafted component hierarchy and schema definitions."
- **`late`**: Submitted after deadline.
  - Dipen Tamang on `hw_02`: Submitted 3 days late, Score 70/100, Grade "B-", Feedback: "Algorithm logic is correct; 10-point deduction applied for late submission."

---

### 3.9 Exams & Exam Results
Populates 3 institutional assessments conforming to TU 40-mark internal evaluation:
1. `exam_01`: **"DBMS Unit Test 1 (SQL & Relational Algebra)"**
   - Type: `'unit_test'`, Total Marks: 20, Pass Marks: 8, Date: 12 days ago.
   - Results: Kriti (20), Aarav (18), Bipana (17), Niraj (15), Rohan (13), Puja (11), Sneha (9), Dipen (7 — Fail).
2. `exam_02`: **"Operating Systems Mid-Term Assessment"**
   - Type: `'midterm'`, Total Marks: 40, Pass Marks: 16, Date: 6 days ago.
   - Results: Kriti (39), Aarav (36), Bipana (34), Niraj (30), Rohan (26), Puja (22), Sneha (17), Dipen (14 — Fail).
3. `exam_03`: **"Web Technology II Practical Lab Assessment"**
   - Type: `'practical'`, Total Marks: 25, Pass Marks: 10, Date: 2 days ago.
   - Results: Kriti (25), Aarav (24), Bipana (22), Niraj (20), Rohan (18), Puja (16), Sneha (13), Dipen (11).

---

### 3.10 Subject Resources & References (8 Items)
- `res_01`: "TU BCA 4th Sem Complete DBMS Syllabus & Model Questions 2026" (PDF, 2.4 MB, Subject: DBMS)
- `res_02`: "Operating Systems Core Architecture & Kernel Slides" (PDF, 5.1 MB, Subject: OS)
- `res_03`: "Web Technology II Next.js & React 19 Lab Manual" (PDF, 3.8 MB, Subject: Web Tech II)
- `res_04`: "Numerical Methods C Code Implementations & Algorithms" (PDF, 1.2 MB, Subject: Numerical Methods)
- `res_05`: "IEEE 830 Standard Software Requirements Specification Template" (PDF, 850 KB, Subject: Software Eng)
- `res_06`: "DBMS Hospital Management SQL Sample Dataset" (ZIP, 4.5 MB, Subject: DBMS)
- `res_07`: "Virtual Memory, Paging & Segmentation Study Guide" (PDF, 1.9 MB, Subject: OS)
- `res_08`: "Numerical Integration & Interpolation Cheatsheet" (PDF, 980 KB, Subject: Numerical Methods)

---

### 3.11 Personal Study Tasks (10 Items)
Distributed across students with varied priority and status:
- Task 1 (Aarav): "Review B+ Tree deletion algorithm before Unit Test 2" (Status: `'in_progress'`, Priority: `'high'`)
- Task 2 (Aarav): "Complete Web Technology Assignment 3 prototype" (Status: `'pending'`, Priority: `'high'`)
- Task 3 (Bipana): "Read Operating Systems chapter 7 on Deadlocks" (Status: `'completed'`, Priority: `'medium'`)
- Task 4 (Rohan): "Practice 10 numerical problems on Runge-Kutta 4th order" (Status: `'in_progress'`, Priority: `'high'`)
- Task 5 (Sneha): "Prepare lecture summary on Software Quality Assurance" (Status: `'pending'`, Priority: `'medium'`)
- Task 6 (Niraj): "Set up local Turso SQLite database for Web Tech lab" (Status: `'completed'`, Priority: `'medium'`)
- Task 7 (Puja): "Review BCNF normalization proofs" (Status: `'in_progress'`, Priority: `'high'`)
- Task 8 (Dipen): "Catch up on missed OS lectures (Process Scheduling)" (Status: `'pending'`, Priority: `'high'`)
- Task 9 (Kriti): "Implement advanced query optimization benchmarks" (Status: `'completed'`, Priority: `'low'`)
- Task 10 (Kriti): "Draft Software Architecture diagram for group project" (Status: `'in_progress'`, Priority: `'medium'`)

---

### 3.12 Notices, Events & Notifications

#### College Notices:
1. `notice_01`: **"TU BCA 4th Semester Board Examination Form Submission Deadline"** (Pinned: `true`, Content: "All students are notified to submit their board examination forms along with fee vouchers by 2026-09-01. Minimum 80% attendance is strictly enforced.")
2. `notice_02`: **"Guest Lecture on Cloud Infrastructure & Kubernetes by Er. Prakash Regmi"** (Pinned: `false`, Content: "Join us in the Seminar Hall on Friday at 11:00 AM for an interactive session on cloud deployment.")
3. `notice_03`: **"Mid-Term Examination Result Publication & Grade Review"** (Pinned: `false`, Content: "Mid-term results have been published on the student portal. Grade disputes must be submitted within 7 days.")

#### Calendar Events:
1. `event_01`: **"BCA Annual Hackathon & Project Exhibition 2026"** (Date: in 14 days, Time: 09:00 - 17:00, Location: Main Auditorium & Computer Labs)
2. `event_02`: **"Pre-Board Examination Week"** (Date: in 30 days, Time: 07:00 - 10:00, Location: Exam Hall A & B)
3. `event_03`: **"Inter-Faculty Sports Week 2026"** (Date: in 45 days, Location: College Ground)

#### Notifications:
12 targeted notifications alerting users about assignment deadlines, grading updates, attendance warnings, and notice publications.

---

### 3.13 Attendance Correction Requests (Dispute Lifecycle)
3 realistic attendance dispute tickets testing all 3 lifecycle statuses:
1. `att_corr_01` (**Approved**):
   - Student: Sneha Sharma (`std_sneha_04`)
   - Session: Absent on 2026-07-15
   - Requested Status: `'present'`
   - Reason: "Medical leave approved by Department HOD (medical certificate attached)."
   - Status: `'approved'`
   - Reviewed By: Prof. Rajesh Shrestha (`tch_rajesh_01`)
   - Review Note: "Medical certificate verified with college clinic. Record updated."
2. `att_corr_02` (**Rejected**):
   - Student: Rohan Shrestha (`std_rohan_03`)
   - Session: Absent on 2026-08-02
   - Requested Status: `'present'`
   - Reason: "Joined class 20 minutes late due to heavy rainfall and traffic jam."
   - Status: `'rejected'`
   - Reviewed By: Er. Sunita Sharma (`tch_sunita_02`)
   - Review Note: "Arrival was beyond the 15-minute grace period; marked absent per TU academic attendance policy."
3. `att_corr_03` (**Pending**):
   - Student: Puja KC (`std_puja_06`)
   - Session: Absent on 2026-08-10
   - Requested Status: `'excused'`
   - Reason: "Participating in official inter-college debate competition on behalf of college."
   - Status: `'pending'`

---

## 4. Complete Source Code Blueprint: `src/db/seed.ts`

Below is the complete, self-contained implementation code for `src/db/seed.ts`. It uses `@libsql/client`, `drizzle-orm`, `dotenv`, and `node:crypto`.

```typescript
import "dotenv/config";
import { config } from "dotenv";
config({ path: ".env.local" });

import crypto from "node:crypto";
import { db } from "./client";
import {
  users,
  teachers,
  students,
  studentProfiles,
  subjects,
  enrollments,
  weeklyRoutine,
  classSessions,
  lectureLogs,
  attendance,
  attendanceCorrectionRequests,
  homework,
  assignmentSubmissions,
  exams,
  examResults,
  courseUnits,
  courseChapters,
  courseMaterials,
  resources,
  studyTasks,
  notices,
  events,
  notifications,
} from "./schema";

// --- Password Hashing Standard ---
function hashPassword(plainText: string): string {
  const salt = crypto.randomBytes(16).toString("hex");
  const derivedKey = crypto.scryptSync(plainText, salt, 64);
  return `${salt}:${derivedKey.toString("hex")}`;
}

async function seed() {
  console.log("🌱 Starting Classroom OS Database Seeding...");
  const startTime = Date.now();

  // 1. Clean existing database in reverse topological order
  console.log("🧹 Truncating existing tables...");
  await db.delete(attendanceCorrectionRequests);
  await db.delete(assignmentSubmissions);
  await db.delete(examResults);
  await db.delete(notifications);
  await db.delete(studyTasks);
  await db.delete(resources);
  await db.delete(courseMaterials);
  await db.delete(courseChapters);
  await db.delete(courseUnits);
  await db.delete(lectureLogs);
  await db.delete(attendance);
  await db.delete(homework);
  await db.delete(classSessions);
  await db.delete(exams);
  await db.delete(weeklyRoutine);
  await db.delete(enrollments);
  await db.delete(studentProfiles);
  await db.delete(students);
  await db.delete(subjects);
  await db.delete(teachers);
  await db.delete(users);
  await db.delete(notices);
  await db.delete(events);

  // 2. Seed Users
  console.log("👤 Seeding Users & Auth Accounts...");
  const defaultAdminPass = hashPassword("AdminPassword123!");
  const defaultTeacherPass = hashPassword("TeacherPass123!");
  const defaultTempPass = hashPassword("TempPassword123!");
  const defaultStudentPass = hashPassword("StudentPass123!");

  const usersData = [
    {
      id: "usr_admin_01",
      email: "admin@classroom.os",
      passwordHash: defaultAdminPass,
      role: "ADMIN" as const,
      mustChangePassword: false,
      isActive: true,
    },
    {
      id: "usr_teacher_rajesh",
      email: "rajesh.shrestha@classroom.os",
      passwordHash: defaultTeacherPass,
      role: "TEACHER" as const,
      mustChangePassword: false,
      isActive: true,
    },
    {
      id: "usr_teacher_sunita",
      email: "sunita.sharma@classroom.os",
      passwordHash: defaultTeacherPass,
      role: "TEACHER" as const,
      mustChangePassword: false,
      isActive: true,
    },
    {
      id: "usr_teacher_bishal",
      email: "bishal.thapa@classroom.os",
      passwordHash: defaultTeacherPass,
      role: "TEACHER" as const,
      mustChangePassword: false,
      isActive: true,
    },
    {
      id: "usr_teacher_anjali",
      email: "anjali.adhikari@classroom.os",
      passwordHash: defaultTeacherPass,
      role: "TEACHER" as const,
      mustChangePassword: false,
      isActive: true,
    },
    {
      id: "usr_student_aarav",
      email: "aarav.joshi@classroom.os",
      passwordHash: defaultTempPass,
      role: "CR" as const,
      mustChangePassword: true,
      isActive: true,
    },
    {
      id: "usr_student_bipana",
      email: "bipana.adhikari@classroom.os",
      passwordHash: defaultStudentPass,
      role: "STUDENT" as const,
      mustChangePassword: false,
      isActive: true,
    },
    {
      id: "usr_student_rohan",
      email: "rohan.shrestha@classroom.os",
      passwordHash: defaultStudentPass,
      role: "STUDENT" as const,
      mustChangePassword: false,
      isActive: true,
    },
    {
      id: "usr_student_sneha",
      email: "sneha.sharma@classroom.os",
      passwordHash: defaultStudentPass,
      role: "STUDENT" as const,
      mustChangePassword: false,
      isActive: true,
    },
    {
      id: "usr_student_niraj",
      email: "niraj.karki@classroom.os",
      passwordHash: defaultStudentPass,
      role: "STUDENT" as const,
      mustChangePassword: false,
      isActive: true,
    },
    {
      id: "usr_student_puja",
      email: "puja.kc@classroom.os",
      passwordHash: defaultStudentPass,
      role: "STUDENT" as const,
      mustChangePassword: false,
      isActive: true,
    },
    {
      id: "usr_student_dipen",
      email: "dipen.tamang@classroom.os",
      passwordHash: defaultStudentPass,
      role: "STUDENT" as const,
      mustChangePassword: false,
      isActive: true,
    },
    {
      id: "usr_student_kriti",
      email: "kriti.maharjan@classroom.os",
      passwordHash: defaultStudentPass,
      role: "STUDENT" as const,
      mustChangePassword: false,
      isActive: true,
    },
  ];

  for (const u of usersData) {
    await db.insert(users).values(u);
  }

  // 3. Seed Teachers
  console.log("👨‍🏫 Seeding Teachers...");
  const teachersData = [
    {
      id: "tch_rajesh_01",
      name: "Prof. Rajesh Shrestha",
      email: "rajesh.shrestha@classroom.os",
      phone: "+977-9841234567",
      faculties: ["BCA", "CSIT"],
      semesters: ["4th Semester", "2nd Semester"],
    },
    {
      id: "tch_sunita_02",
      name: "Er. Sunita Sharma",
      email: "sunita.sharma@classroom.os",
      phone: "+977-9841234568",
      faculties: ["BCA"],
      semesters: ["4th Semester"],
    },
    {
      id: "tch_bishal_03",
      name: "Dr. Bishal Thapa",
      email: "bishal.thapa@classroom.os",
      phone: "+977-9841234569",
      faculties: ["BCA", "BIT"],
      semesters: ["4th Semester", "6th Semester"],
    },
    {
      id: "tch_anjali_04",
      name: "Ms. Anjali Adhikari",
      email: "anjali.adhikari@classroom.os",
      phone: "+977-9841234570",
      faculties: ["BCA"],
      semesters: ["4th Semester"],
    },
  ];

  for (const t of teachersData) {
    await db.insert(teachers).values(t);
  }

  // 4. Seed Students & Student Profiles
  console.log("🎓 Seeding Students & Academic Profiles...");
  const rawStudents = [
    { id: "std_aarav_cr", profileId: "sp_aarav_cr", userId: "usr_student_aarav", name: "Aarav Joshi", roll: "2024-BCA-001", email: "aarav.joshi@classroom.os", phone: "+977-9851000001" },
    { id: "std_bipana_02", profileId: "sp_bipana_02", userId: "usr_student_bipana", name: "Bipana Adhikari", roll: "2024-BCA-002", email: "bipana.adhikari@classroom.os", phone: "+977-9851000002" },
    { id: "std_rohan_03", profileId: "sp_rohan_03", userId: "usr_student_rohan", name: "Rohan Shrestha", roll: "2024-BCA-003", email: "rohan.shrestha@classroom.os", phone: "+977-9851000003" },
    { id: "std_sneha_04", profileId: "sp_sneha_04", userId: "usr_student_sneha", name: "Sneha Sharma", roll: "2024-BCA-004", email: "sneha.sharma@classroom.os", phone: "+977-9851000004" },
    { id: "std_niraj_05", profileId: "sp_niraj_05", userId: "usr_student_niraj", name: "Niraj Karki", roll: "2024-BCA-005", email: "niraj.karki@classroom.os", phone: "+977-9851000005" },
    { id: "std_puja_06", profileId: "sp_puja_06", userId: "usr_student_puja", name: "Puja KC", roll: "2024-BCA-006", email: "puja.kc@classroom.os", phone: "+977-9851000006" },
    { id: "std_dipen_07", profileId: "sp_dipen_07", userId: "usr_student_dipen", name: "Dipen Tamang", roll: "2024-BCA-007", email: "dipen.tamang@classroom.os", phone: "+977-9851000007" },
    { id: "std_kriti_08", profileId: "sp_kriti_08", userId: "usr_student_kriti", name: "Kriti Maharjan", roll: "2024-BCA-008", email: "kriti.maharjan@classroom.os", phone: "+977-9851000008" },
  ];

  for (const s of rawStudents) {
    await db.insert(students).values({
      id: s.id,
      name: s.name,
      rollNumber: s.roll,
      email: s.email,
      phone: s.phone,
      faculty: "BCA",
      semester: "4th Semester",
    });

    await db.insert(studentProfiles).values({
      id: s.profileId,
      userId: s.userId,
      rollNumber: s.roll,
      faculty: "BCA",
      semester: 4,
      section: "A",
      batchYear: 2024,
      phone: s.phone,
    });
  }

  // 5. Seed Subjects
  console.log("📚 Seeding Subjects...");
  const subjectsData = [
    { id: "subj_dbms", name: "Database Management System", code: "CACS251", teacherId: "tch_rajesh_01" },
    { id: "subj_os", name: "Operating Systems", code: "CACS252", teacherId: "tch_sunita_02" },
    { id: "subj_web2", name: "Web Technology II", code: "CACS253", teacherId: "tch_bishal_03" },
    { id: "subj_nm", name: "Numerical Methods", code: "CACS254", teacherId: "tch_anjali_04" },
    { id: "subj_se", name: "Software Engineering", code: "CACS255", teacherId: "tch_rajesh_01" },
  ];

  for (const subj of subjectsData) {
    await db.insert(subjects).values(subj);
  }

  // 6. Seed Enrollments
  console.log("📝 Seeding Enrollments (All students to all 5 subjects)...");
  for (const s of rawStudents) {
    for (const subj of subjectsData) {
      await db.insert(enrollments).values({
        id: `enr_${s.id}_${subj.id}`,
        studentId: s.id,
        subjectId: subj.id,
        semester: 4,
        enrolledAt: new Date().toISOString(),
      });
    }
  }

  // 7. Seed Weekly Routine (15 periods)
  console.log("⏰ Seeding Weekly Routine...");
  const routineData = [
    // Sunday (0)
    { id: "rt_sun_1", subjectId: "subj_dbms", dayOfWeek: 0, startTime: "07:00", endTime: "08:30", teacherName: "Prof. Rajesh Shrestha", room: "Room 301", notes: "Theory" },
    { id: "rt_sun_2", subjectId: "subj_os", dayOfWeek: 0, startTime: "08:45", endTime: "10:15", teacherName: "Er. Sunita Sharma", room: "Room 301", notes: "Theory" },
    { id: "rt_sun_3", subjectId: "subj_web2", dayOfWeek: 0, startTime: "10:30", endTime: "12:00", teacherName: "Dr. Bishal Thapa", room: "Lab 2", notes: "Lab Session" },
    // Monday (1)
    { id: "rt_mon_1", subjectId: "subj_nm", dayOfWeek: 1, startTime: "07:00", endTime: "08:30", teacherName: "Ms. Anjali Adhikari", room: "Room 301", notes: "Theory" },
    { id: "rt_mon_2", subjectId: "subj_se", dayOfWeek: 1, startTime: "08:45", endTime: "10:15", teacherName: "Prof. Rajesh Shrestha", room: "Room 301", notes: "Theory" },
    { id: "rt_mon_3", subjectId: "subj_dbms", dayOfWeek: 1, startTime: "10:30", endTime: "12:00", teacherName: "Prof. Rajesh Shrestha", room: "Room 301", notes: "Theory" },
    // Tuesday (2)
    { id: "rt_tue_1", subjectId: "subj_os", dayOfWeek: 2, startTime: "07:00", endTime: "08:30", teacherName: "Er. Sunita Sharma", room: "Room 301", notes: "Theory" },
    { id: "rt_tue_2", subjectId: "subj_web2", dayOfWeek: 2, startTime: "08:45", endTime: "10:15", teacherName: "Dr. Bishal Thapa", room: "Lab 2", notes: "Lab Session" },
    { id: "rt_tue_3", subjectId: "subj_nm", dayOfWeek: 2, startTime: "10:30", endTime: "12:00", teacherName: "Ms. Anjali Adhikari", room: "Room 301", notes: "Theory" },
    // Wednesday (3)
    { id: "rt_wed_1", subjectId: "subj_se", dayOfWeek: 3, startTime: "07:00", endTime: "08:30", teacherName: "Prof. Rajesh Shrestha", room: "Room 301", notes: "Theory" },
    { id: "rt_wed_2", subjectId: "subj_dbms", dayOfWeek: 3, startTime: "08:45", endTime: "10:15", teacherName: "Prof. Rajesh Shrestha", room: "Lab 1", notes: "Lab Session" },
    { id: "rt_wed_3", subjectId: "subj_os", dayOfWeek: 3, startTime: "10:30", endTime: "12:00", teacherName: "Er. Sunita Sharma", room: "Room 301", notes: "Theory" },
    // Thursday (4)
    { id: "rt_thu_1", subjectId: "subj_web2", dayOfWeek: 4, startTime: "07:00", endTime: "08:30", teacherName: "Dr. Bishal Thapa", room: "Lab 2", notes: "Lab Session" },
    { id: "rt_thu_2", subjectId: "subj_nm", dayOfWeek: 4, startTime: "08:45", endTime: "10:15", teacherName: "Ms. Anjali Adhikari", room: "Room 301", notes: "Theory" },
    { id: "rt_thu_3", subjectId: "subj_se", dayOfWeek: 4, startTime: "10:30", endTime: "12:00", teacherName: "Prof. Rajesh Shrestha", room: "Room 301", notes: "Theory" },
  ];

  for (const r of routineData) {
    await db.insert(weeklyRoutine).values(r);
  }

  // 8. Seed Course Units, Chapters & Materials
  console.log("📖 Seeding Units, Chapters & Materials...");
  const unitsData = [
    { id: "unit_dbms_1", subjectId: "subj_dbms", title: "Unit 1: Introduction to Database Architecture", order: 1 },
    { id: "unit_dbms_2", subjectId: "subj_dbms", title: "Unit 2: Relational Model & SQL", order: 2 },
    { id: "unit_os_1", subjectId: "subj_os", title: "Unit 1: Process & Thread Management", order: 1 },
    { id: "unit_web_1", subjectId: "subj_web2", title: "Unit 1: React 19 & Next.js App Router", order: 1 },
  ];
  for (const u of unitsData) await db.insert(courseUnits).values(u);

  const chaptersData = [
    { id: "chap_dbms_1", unitId: "unit_dbms_1", title: "Chapter 1: Three-Schema Architecture & Data Independence", order: 1 },
    { id: "chap_dbms_2", unitId: "unit_dbms_1", title: "Chapter 2: ER Modeling & Constraints", order: 2 },
    { id: "chap_dbms_3", unitId: "unit_dbms_2", title: "Chapter 3: Relational Algebra & Calculus", order: 1 },
    { id: "chap_os_1", unitId: "unit_os_1", title: "Chapter 1: Process Control Blocks & Context Switching", order: 1 },
  ];
  for (const c of chaptersData) await db.insert(courseChapters).values(c);

  const materialsData = [
    { id: "mat_dbms_1", chapterId: "chap_dbms_1", title: "Three-Schema Slide Deck (PDF)", fileUrl: "https://classroom.os/files/dbms-architecture.pdf", fileType: "pdf" },
    { id: "mat_dbms_2", chapterId: "chap_dbms_2", title: "ER Diagram Sample Exercises", fileUrl: "https://classroom.os/files/er-exercises.pdf", fileType: "pdf" },
  ];
  for (const m of materialsData) await db.insert(courseMaterials).values(m);

  // 9. Seed 45 Historical Sessions across 3 Teaching Weeks (15 days x 3 slots)
  console.log("📅 Seeding 45 Historical Sessions & Lecture Logs...");
  
  // Starting 3 weeks ago (Sunday, 2026-07-26)
  const baseDate = new Date("2026-07-26T00:00:00.000Z");
  const curriculumTopics = [
    { subj: "subj_dbms", topic: "Relational Schema Mapping from ER Models", hw: "Review textbook Section 3.2", notes: "Students grasped entity conversion well" },
    { subj: "subj_os", topic: "Process Lifecycle & PCB Implementation in Linux", hw: "Write a fork() program in C", notes: "High engagement during process tree demonstration" },
    { subj: "subj_web2", topic: "TypeScript Generics & Strict Invariants in React", hw: "Build typed generic table component", notes: "Covered interface vs type aliases" },
    { subj: "subj_nm", topic: "Bisection Method for Root Finding", hw: "Solve Problem Set 1.1 (Q1-Q5)", notes: "Emphasized stopping criteria tolerance epsilon" },
    { subj: "subj_se", topic: "Agile Scrum vs Waterfall Process Models", hw: "Draft 5 user stories with acceptance criteria", notes: "Reviewed sprint backlog creation" },
    { subj: "subj_dbms", topic: "SQL DDL, DML & Advanced Nested Subqueries", hw: "Practice 10 SQL queries on Company database", notes: "Focused on correlated subqueries" },
    { subj: "subj_os", topic: "CPU Scheduling: FCFS, SJF, and Round Robin", hw: "Calculate average waiting times for 5 workloads", notes: "Demonstrated Gantt charts on board" },
    { subj: "subj_web2", topic: "Next.js 16 Server Components & Data Fetching", hw: "Implement server-rendered product catalog", notes: "Explained React 19 RSC streaming" },
    { subj: "subj_nm", topic: "Newton-Raphson Method Convergence Analysis", hw: "Implement Newton-Raphson in C", notes: "Derived quadratic convergence formula" },
    { subj: "subj_se", topic: "IEEE 830 Standard Software Requirements Specification", hw: "Write functional requirements for Library OS", notes: "Good class discussion on non-functional requirements" },
    { subj: "subj_dbms", topic: "Functional Dependencies & 1NF, 2NF, 3NF Normalization", hw: "Normalize 3 unnormalized relational schemas", notes: "Covered transitive dependencies thoroughly" },
    { subj: "subj_os", topic: "Process Synchronization & Mutex / Semaphores", hw: "Solve Producer-Consumer problem pseudocode", notes: "Explained race conditions and critical sections" },
    { subj: "subj_web2", topic: "React 19 Server Actions & useActionState Hook", hw: "Build server action mutation form with Zod", notes: "Walked through optimistic UI updates" },
    { subj: "subj_nm", topic: "Gauss Elimination with Partial Pivoting", hw: "Solve 3x3 system of linear equations", notes: "Demonstrated back-substitution matrix steps" },
    { subj: "subj_se", topic: "UML Use Case & Sequence Diagrams", hw: "Draw sequence diagram for login auth flow", notes: "Reviewed actor vs system boundary lines" },
  ];

  const sessionIds: string[] = [];

  for (let week = 0; week < 3; week++) {
    for (let day = 0; day < 5; day++) {
      const sessionDate = new Date(baseDate);
      sessionDate.setDate(baseDate.getDate() + week * 7 + day);

      const dayRoutines = routineData.filter((r) => r.dayOfWeek === day);

      for (let slot = 0; slot < dayRoutines.length; slot++) {
        const routine = dayRoutines[slot];
        const sessionIndex = week * 15 + day * 3 + slot;
        const sessionId = `sess_${(sessionIndex + 1).toString().padStart(3, "0")}`;
        sessionIds.push(sessionId);

        await db.insert(classSessions).values({
          id: sessionId,
          subjectId: routine.subjectId,
          routineId: routine.id,
          sessionDate,
          startTime: routine.startTime,
          endTime: routine.endTime,
        });

        const topicInfo = curriculumTopics[sessionIndex % curriculumTopics.length];
        await db.insert(lectureLogs).values({
          id: `log_${sessionId}`,
          classSessionId: sessionId,
          topicsCovered: `${topicInfo.topic} (Lecture ${sessionIndex + 1})`,
          homework: topicInfo.hw,
          notes: topicInfo.notes,
        });
      }
    }
  }

  // 10. Seed Attendance Records for all 45 Sessions (4 Distinct Zones)
  console.log("📊 Seeding 360 Attendance Records across 4 Zones...");

  for (let i = 0; i < sessionIds.length; i++) {
    const sId = sessionIds[i];

    // Student 8 (Kriti): Perfect 100% (45/45)
    await db.insert(attendance).values({ id: `att_${sId}_std_kriti`, classSessionId: sId, studentId: "std_kriti_08", status: "present" });

    // Student 1 (Aarav - CR): Safe 93.3% (42 present, 2 absent, 1 excused)
    const aaravStatus = i === 10 || i === 25 ? "absent" : i === 40 ? "excused" : "present";
    await db.insert(attendance).values({ id: `att_${sId}_std_aarav`, classSessionId: sId, studentId: "std_aarav_cr", status: aaravStatus });

    // Student 2 (Bipana): Safe 88.9% (39 present, 1 late, 4 absent, 1 excused)
    const bipanaStatus = [5, 18, 32, 42].includes(i) ? "absent" : i === 12 ? "excused" : i === 20 ? "late" : "present";
    await db.insert(attendance).values({ id: `att_${sId}_std_bipana`, classSessionId: sId, studentId: "std_bipana_02", status: bipanaStatus });

    // Student 5 (Niraj): Safe 86.7% (38 present, 1 late, 5 absent, 1 excused)
    const nirajStatus = [3, 14, 24, 35, 44].includes(i) ? "absent" : i === 8 ? "excused" : i === 28 ? "late" : "present";
    await db.insert(attendance).values({ id: `att_${sId}_std_niraj`, classSessionId: sId, studentId: "std_niraj_05", status: nirajStatus });

    // Student 3 (Rohan): Caution 80.0% (35 present, 1 late, 8 absent, 1 excused)
    const rohanStatus = [2, 7, 13, 19, 26, 31, 38, 43].includes(i) ? "absent" : i === 15 ? "excused" : i === 22 ? "late" : "present";
    await db.insert(attendance).values({ id: `att_${sId}_std_rohan`, classSessionId: sId, studentId: "std_rohan_03", status: rohanStatus });

    // Student 6 (Puja): Caution 77.8% (34 present, 1 late, 9 absent, 1 excused)
    const pujaStatus = [1, 6, 11, 17, 23, 29, 34, 39, 44].includes(i) ? "absent" : i === 21 ? "excused" : i === 16 ? "late" : "present";
    await db.insert(attendance).values({ id: `att_${sId}_std_puja`, classSessionId: sId, studentId: "std_puja_06", status: pujaStatus });

    // Student 4 (Sneha): Danger 66.7% (29 present, 1 late, 14 absent, 1 excused)
    const snehaStatus = [0, 4, 9, 13, 17, 21, 25, 29, 33, 37, 40, 41, 42, 43].includes(i) ? "absent" : i === 30 ? "excused" : i === 15 ? "late" : "present";
    await db.insert(attendance).values({ id: `att_${sId}_std_sneha`, classSessionId: sId, studentId: "std_sneha_04", status: snehaStatus });

    // Student 7 (Dipen): Danger 55.6% (24 present, 1 late, 18 absent, 2 excused)
    const dipenStatus = [0, 2, 4, 6, 8, 10, 12, 14, 16, 20, 22, 24, 28, 30, 32, 36, 38, 40].includes(i) ? "absent" : [18, 34].includes(i) ? "excused" : i === 26 ? "late" : "present";
    await db.insert(attendance).values({ id: `att_${sId}_std_dipen`, classSessionId: sId, studentId: "std_dipen_07", status: dipenStatus });
  }

  // 11. Seed Assignments (Homework) & Submissions
  console.log("📋 Seeding Assignments & Submissions...");
  const homeworkData = [
    {
      id: "hw_01",
      subjectId: "subj_dbms",
      title: "ER Modeling & BCNF Normalization for Hospital Management System",
      description: "Design a complete Entity-Relationship model and normalize all relational schemas to Boyce-Codd Normal Form (BCNF).",
      assignedDate: new Date("2026-07-27T00:00:00.000Z"),
      dueDate: new Date("2026-08-05T23:59:59.000Z"),
      status: "completed",
    },
    {
      id: "hw_02",
      subjectId: "subj_os",
      title: "CPU Scheduling Algorithm Simulator in C/C++",
      description: "Implement FCFS, SJF (Preemptive and Non-Preemptive), and Round Robin (Quantum=2) with turnaround and waiting time calculations.",
      assignedDate: new Date("2026-08-01T00:00:00.000Z"),
      dueDate: new Date("2026-08-10T23:59:59.000Z"),
      status: "completed",
    },
    {
      id: "hw_03",
      subjectId: "subj_web2",
      title: "React 19 Server Actions Task Management System",
      description: "Build an institutional task manager using Next.js 16 App Router, React 19 useActionState, Drizzle ORM, and Zod validation.",
      assignedDate: new Date("2026-08-12T00:00:00.000Z"),
      dueDate: new Date("2026-08-18T23:59:59.000Z"),
      status: "active",
    },
    {
      id: "hw_04",
      subjectId: "subj_nm",
      title: "Newton-Raphson & Gauss Elimination Numerical Lab Report",
      description: "Write C programs to find roots of f(x) = x^3 - 4x - 9 and solve 3-variable linear equation systems with partial pivoting.",
      assignedDate: new Date("2026-08-13T00:00:00.000Z"),
      dueDate: new Date("2026-08-20T23:59:59.000Z"),
      status: "active",
    },
    {
      id: "hw_05",
      subjectId: "subj_se",
      title: "Software Requirements Specification (SRS) for HealthTech Portal",
      description: "Prepare an IEEE 830 compliant SRS document including UML use cases, sequence diagrams, and non-functional requirements.",
      assignedDate: new Date("2026-08-03T00:00:00.000Z"),
      dueDate: new Date("2026-08-13T23:59:59.000Z"),
      status: "active",
    },
    {
      id: "hw_06",
      subjectId: "subj_dbms",
      title: "Indexing & Query Optimization Benchmark Analysis",
      description: "Analyze performance improvements of B+ tree index on 100k records vs sequential scan with EXPLAIN QUERY PLAN.",
      assignedDate: new Date("2026-08-14T00:00:00.000Z"),
      dueDate: new Date("2026-08-22T23:59:59.000Z"),
      status: "active",
    },
  ];

  for (const hw of homeworkData) {
    await db.insert(homework).values(hw);
  }

  // Submissions for hw_01 (Graded)
  await db.insert(assignmentSubmissions).values({
    id: "sub_hw1_std_aarav",
    homeworkId: "hw_01",
    studentId: "std_aarav_cr",
    content: "Hospital Management ER diagram with complete BCNF decomposition tables attached.",
    fileUrl: "https://classroom.os/submissions/aarav-hospital-dbms.pdf",
    fileName: "aarav-hospital-dbms.pdf",
    fileSize: 1048576,
    status: "graded",
    submittedAt: "2026-08-04T14:30:00.000Z",
    grade: "A+",
    score: 95,
    feedback: "Excellent BCNF dependency preservation analysis and clean ER diagram.",
    gradedBy: "tch_rajesh_01",
    gradedAt: "2026-08-06T10:00:00.000Z",
  });

  await db.insert(assignmentSubmissions).values({
    id: "sub_hw1_std_kriti",
    homeworkId: "hw_01",
    studentId: "std_kriti_08",
    content: "Complete relational normalization report with SQL schema DDL script.",
    fileUrl: "https://classroom.os/submissions/kriti-hospital-dbms.pdf",
    fileName: "kriti-hospital-dbms.pdf",
    fileSize: 1548576,
    status: "graded",
    submittedAt: "2026-08-03T16:00:00.000Z",
    grade: "A+",
    score: 98,
    feedback: "Flawless schema design and clear indexing explanation.",
    gradedBy: "tch_rajesh_01",
    gradedAt: "2026-08-06T10:05:00.000Z",
  });

  await db.insert(assignmentSubmissions).values({
    id: "sub_hw1_std_rohan",
    homeworkId: "hw_01",
    studentId: "std_rohan_03",
    content: "ER diagram and normalization writeup.",
    fileUrl: "https://classroom.os/submissions/rohan-dbms-hw1.pdf",
    fileName: "rohan-dbms-hw1.pdf",
    fileSize: 848576,
    status: "graded",
    submittedAt: "2026-08-05T20:00:00.000Z",
    grade: "B+",
    score: 78,
    feedback: "Good effort; missed 3NF transitive dependency check in Patient table.",
    gradedBy: "tch_rajesh_01",
    gradedAt: "2026-08-06T10:15:00.000Z",
  });

  await db.insert(assignmentSubmissions).values({
    id: "sub_hw2_std_dipen",
    homeworkId: "hw_02",
    studentId: "std_dipen_07",
    content: "C simulator code for CPU scheduling algorithms.",
    fileUrl: "https://classroom.os/submissions/dipen-os-sim.zip",
    fileName: "dipen-os-sim.zip",
    fileSize: 450000,
    status: "late",
    submittedAt: "2026-08-13T11:00:00.000Z",
    grade: "B-",
    score: 70,
    feedback: "Algorithm logic is correct; 10-point deduction applied for late submission.",
    gradedBy: "tch_sunita_02",
    gradedAt: "2026-08-14T09:00:00.000Z",
  });

  // Draft submission for hw_03
  await db.insert(assignmentSubmissions).values({
    id: "sub_hw3_std_rohan",
    homeworkId: "hw_03",
    studentId: "std_rohan_03",
    content: "Draft implementation of Next.js 16 server actions form. Working on validation...",
    status: "draft",
  });

  // Submitted submission for hw_03
  await db.insert(assignmentSubmissions).values({
    id: "sub_hw3_std_bipana",
    homeworkId: "hw_03",
    studentId: "std_bipana_02",
    content: "Completed fullstack Next.js 16 Task Management app with Drizzle ORM.",
    fileUrl: "https://classroom.os/submissions/bipana-web-hw3.zip",
    fileName: "bipana-web-hw3.zip",
    fileSize: 2048576,
    status: "submitted",
    submittedAt: "2026-08-15T08:30:00.000Z",
  });

  // 12. Seed Exams & Exam Results
  console.log("📝 Seeding Exams & Exam Results...");
  const examsData = [
    {
      id: "exam_01",
      subjectId: "subj_dbms",
      title: "DBMS Unit Test 1 (SQL & Relational Algebra)",
      examType: "unit_test" as const,
      totalMarks: 20,
      passMarks: 8,
      examDate: new Date("2026-08-03T07:00:00.000Z").toISOString(),
      startTime: "07:00",
      endTime: "08:00",
      room: "Room 301",
    },
    {
      id: "exam_02",
      subjectId: "subj_os",
      title: "Operating Systems Mid-Term Assessment",
      examType: "midterm" as const,
      totalMarks: 40,
      passMarks: 16,
      examDate: new Date("2026-08-09T07:00:00.000Z").toISOString(),
      startTime: "07:00",
      endTime: "09:00",
      room: "Exam Hall A",
    },
    {
      id: "exam_03",
      subjectId: "subj_web2",
      title: "Web Technology II Practical Lab Assessment",
      examType: "practical" as const,
      totalMarks: 25,
      passMarks: 10,
      examDate: new Date("2026-08-13T10:30:00.000Z").toISOString(),
      startTime: "10:30",
      endTime: "12:00",
      room: "Lab 2",
    },
  ];

  for (const ex of examsData) {
    await db.insert(exams).values(ex);
  }

  const exam1Results = [
    { studentId: "std_kriti_08", marks: 20, remarks: "Outstanding performance" },
    { studentId: "std_aarav_cr", marks: 18, remarks: "Very strong relational algebra foundation" },
    { studentId: "std_bipana_02", marks: 17, remarks: "Good SQL syntax clarity" },
    { studentId: "std_niraj_05", marks: 15, remarks: "Solid understanding" },
    { studentId: "std_rohan_03", marks: 13, remarks: "Review join conditions" },
    { studentId: "std_puja_06", marks: 11, remarks: "Needs more practice on division operator" },
    { studentId: "std_sneha_04", marks: 9, remarks: "Pass with basic understanding" },
    { studentId: "std_dipen_07", marks: 7, remarks: "Failed — below pass marks" },
  ];

  for (const r of exam1Results) {
    await db.insert(examResults).values({
      id: `res_ex1_${r.studentId}`,
      examId: "exam_01",
      studentId: r.studentId,
      obtainedMarks: r.marks,
      isAbsent: 0,
      remarks: r.remarks,
    });
  }

  // 13. Seed Resources
  console.log("📁 Seeding Resources...");
  const resourcesData = [
    { id: "res_01", subjectId: "subj_dbms", title: "TU BCA 4th Sem Complete DBMS Syllabus & Model Questions 2026", description: "Official Tribhuvan University syllabus and past 5 years board exam questions.", fileUrl: "https://classroom.os/resources/dbms-syllabus-2026.pdf", fileType: "pdf", fileSize: 2400000, uploadedBy: "tch_rajesh_01" },
    { id: "res_02", subjectId: "subj_os", title: "Operating Systems Core Architecture & Kernel Slides", description: "Comprehensive lecture slides covering processes, CPU scheduling, and memory management.", fileUrl: "https://classroom.os/resources/os-slides-complete.pdf", fileType: "pdf", fileSize: 5100000, uploadedBy: "tch_sunita_02" },
    { id: "res_03", subjectId: "subj_web2", title: "Web Technology II Next.js & React 19 Lab Manual", description: "Step-by-step laboratory guide for building fullstack web apps.", fileUrl: "https://classroom.os/resources/web-lab-manual.pdf", fileType: "pdf", fileSize: 3800000, uploadedBy: "tch_bishal_03" },
    { id: "res_04", subjectId: "subj_nm", title: "Numerical Methods C Code Implementations & Algorithms", description: "Source code examples for non-linear equations, interpolation, and integration.", fileUrl: "https://classroom.os/resources/numerical-c-code.pdf", fileType: "pdf", fileSize: 1200000, uploadedBy: "tch_anjali_04" },
    { id: "res_05", subjectId: "subj_se", title: "IEEE 830 Standard Software Requirements Specification Template", description: "Official format and guideline for writing industry-standard SRS documents.", fileUrl: "https://classroom.os/resources/ieee-srs-template.pdf", fileType: "pdf", fileSize: 850000, uploadedBy: "tch_rajesh_01" },
    { id: "res_06", subjectId: "subj_dbms", title: "DBMS Hospital Management SQL Sample Dataset", description: "Pre-populated SQL dump for query practice and indexing experiments.", fileUrl: "https://classroom.os/resources/hospital-db-sample.zip", fileType: "zip", fileSize: 4500000, uploadedBy: "tch_rajesh_01" },
  ];

  for (const res of resourcesData) {
    await db.insert(resources).values(res);
  }

  // 14. Seed Study Tasks
  console.log("📌 Seeding Study Tasks...");
  const studyTasksData = [
    { id: "task_01", studentId: "std_aarav_cr", subjectId: "subj_dbms", title: "Review B+ Tree deletion algorithm before Unit Test 2", description: "Focus on underflow redistribution vs merge cases.", dueDate: "2026-08-19", status: "in_progress" as const, priority: "high" as const },
    { id: "task_02", studentId: "std_aarav_cr", subjectId: "subj_web2", title: "Complete Web Technology Assignment 3 prototype", description: "Implement server actions with error handling.", dueDate: "2026-08-17", status: "pending" as const, priority: "high" as const },
    { id: "task_03", studentId: "std_rohan_03", subjectId: "subj_nm", title: "Practice 10 numerical problems on Runge-Kutta 4th order", description: "Work through past board exam numericals.", dueDate: "2026-08-20", status: "in_progress" as const, priority: "high" as const },
    { id: "task_04", studentId: "std_bipana_02", subjectId: "subj_os", title: "Read Operating Systems chapter 7 on Deadlocks", description: "Review Banker's algorithm safe state check.", dueDate: "2026-08-18", status: "completed" as const, priority: "medium" as const },
    { id: "task_05", studentId: "std_sneha_04", subjectId: "subj_se", title: "Prepare lecture summary on Software Quality Assurance", description: "Compare Black-box vs White-box testing.", dueDate: "2026-08-21", status: "pending" as const, priority: "medium" as const },
  ];

  for (const st of studyTasksData) {
    await db.insert(studyTasks).values(st);
  }

  // 15. Seed Notices, Events & Notifications
  console.log("📢 Seeding Notices, Events & Notifications...");
  await db.insert(notices).values({
    id: "notice_01",
    title: "TU BCA 4th Semester Board Examination Form Submission Deadline",
    content: "All students of BCA 4th semester are hereby notified to submit their board examination forms along with fee vouchers by 2026-09-01. Minimum 80% attendance is strictly enforced per TU regulations.",
    isPinned: true,
    expiresAt: new Date("2026-09-02T00:00:00.000Z"),
  });

  await db.insert(notices).values({
    id: "notice_02",
    title: "Guest Lecture on Cloud Infrastructure & Kubernetes by Er. Prakash Regmi",
    content: "Department of Computer Application is organizing a guest lecture on Modern Cloud Architecture in the Seminar Hall this Friday at 11:00 AM.",
    isPinned: false,
    expiresAt: new Date("2026-08-25T00:00:00.000Z"),
  });

  await db.insert(events).values({
    id: "event_01",
    title: "BCA Annual Tech Fest & Hackathon 2026",
    description: "48-hour inter-college hackathon focusing on AI and Next.js applications.",
    eventDate: new Date("2026-08-28T09:00:00.000Z"),
    startTime: "09:00",
    endTime: "17:00",
    eventType: "Academic / Fest",
    location: "Main Auditorium & Computer Labs",
  });

  await db.insert(notifications).values({
    id: "notif_01",
    userId: "usr_student_aarav",
    title: "Assignment 1 Graded",
    message: "Your submission for 'ER Modeling & BCNF Normalization' has been graded: 95/100 (A+).",
    type: "assignment" as const,
    link: "/homework",
    isRead: 0,
    createdAt: new Date().toISOString(),
  });

  // 16. Seed Attendance Correction Requests
  console.log("🎫 Seeding Attendance Correction Requests...");
  await db.insert(attendanceCorrectionRequests).values({
    id: "att_corr_01",
    attendanceId: "att_sess_010_std_sneha",
    studentId: "std_sneha_04",
    requestedStatus: "present" as const,
    reason: "Medical leave approved by Department HOD (medical certificate attached).",
    status: "approved" as const,
    reviewedBy: "tch_rajesh_01",
    reviewNote: "Medical certificate verified with college clinic. Record updated.",
    reviewedAt: new Date().toISOString(),
  });

  await db.insert(attendanceCorrectionRequests).values({
    id: "att_corr_02",
    attendanceId: "att_sess_020_std_rohan",
    studentId: "std_rohan_03",
    requestedStatus: "present" as const,
    reason: "Joined class 20 minutes late due to heavy rainfall and traffic jam.",
    status: "rejected" as const,
    reviewedBy: "tch_sunita_02",
    reviewNote: "Arrival was beyond the 15-minute grace period; marked absent per TU academic attendance policy.",
    reviewedAt: new Date().toISOString(),
  });

  await db.insert(attendanceCorrectionRequests).values({
    id: "att_corr_03",
    attendanceId: "att_sess_044_std_puja",
    studentId: "std_puja_06",
    requestedStatus: "excused" as const,
    reason: "Participating in official inter-college debate competition on behalf of college.",
    status: "pending" as const,
  });

  const duration = ((Date.now() - startTime) / 1000).toFixed(2);
  console.log(`✅ Classroom OS Database Seeding completed successfully in ${duration}s!`);
}

seed().catch((err) => {
  console.error("❌ Seeding failed:", err);
  process.exit(1);
});
```

---

## 5. `package.json` Updates & Execution Strategy

### 5.1 Script Registration
In `package.json`, under `"scripts"`:
```json
"scripts": {
  "dev": "next dev",
  "build": "next build",
  "start": "next start",
  "lint": "eslint",
  "db:generate": "drizzle-kit generate",
  "db:migrate": "drizzle-kit migrate",
  "db:studio": "drizzle-kit studio",
  "db:verify": "tsx --env-file=.env.local scripts/verify-db.ts",
  "db:seed": "tsx --env-file=.env.local src/db/seed.ts",
  "dev:watch": "start /b next dev & start /b uv run graphify extract . --code-only"
}
```

### 5.2 Verification Commands
To execute and verify the seed script:
```bash
# 1. Run database migrations to ensure all schema tables and constraints exist
npm run db:generate
npm run db:migrate

# 2. Run the database seed script
npm run db:seed

# 3. Verify database integrity
npm run db:verify
```
