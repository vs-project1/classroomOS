import { createClient, type Client } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import { migrate } from "drizzle-orm/libsql/migrator";
import dotenv from "dotenv";
import crypto from "node:crypto";
import path from "node:path";
import fs from "node:fs";
import { slugify } from "../src/utils/slug";

export function getE2EClient(): Client {
  const targetUrl = process.env.DATABASE_URL || "file:local.db";
  const isLocal = targetUrl.startsWith("file:");

  if (!isLocal && !process.env.DATABASE_URL) {
    dotenv.config({ path: ".env.local" });
  }

  return createClient({
    url: targetUrl,
    authToken: isLocal ? undefined : process.env.DATABASE_AUTH_TOKEN,
  });
}

export async function ensureMigrated(client: Client) {
  const db = drizzle(client);
  const migrationsFolder = path.resolve(process.cwd(), "drizzle");
  if (fs.existsSync(migrationsFolder)) {
    console.log("📦 [Seed E2E] Applying Drizzle migrations...");
    await migrate(db, { migrationsFolder });
    console.log("✓ Migrations applied successfully.");
  }
}

function hashPassword(plainText: string): string {
  const salt = crypto.randomBytes(16).toString("hex");
  const derivedKey = crypto.scryptSync(plainText, salt, 64);
  return `${salt}:${derivedKey.toString("hex")}`;
}

export async function seedE2E(customClient?: Client) {
  console.log("🌱 [Seed E2E] Seeding deterministic test dataset for Playwright...");
  const client = customClient || getE2EClient();

  const now = Math.floor(Date.now() / 1000);
  const oneDay = 86400;

  // 0. Seed Users & Auth Accounts
  const usersData = [
    { id: "usr_admin_001", email: "admin@classroom.edu.np", pass: "AdminPassword123!", role: "ADMIN", mcp: 0, active: 1 },
    { id: "usr_teacher_001", email: "teacher@classroom.edu.np", pass: "TeacherPassword123!", role: "TEACHER", mcp: 0, active: 1 },
    { id: "usr_cr_001", email: "cr@classroom.edu.np", pass: "CrPassword123!", role: "CR", mcp: 0, active: 1 },
    { id: "usr_student_001", email: "student@classroom.edu.np", pass: "StudentPassword123!", role: "STUDENT", mcp: 0, active: 1 },
    { id: "usr_atrisk_001", email: "atrisk@classroom.edu.np", pass: "AtriskPassword123!", role: "STUDENT", mcp: 0, active: 1 },
    { id: "usr_newstudent_001", email: "newstudent@classroom.edu.np", pass: "TempPassword123!", role: "STUDENT", mcp: 1, active: 1 },
    { id: "usr_unauthorized_001", email: "unauthorized@classroom.edu.np", pass: "StudentPassword123!", role: "STUDENT", mcp: 0, active: 1 },
    { id: "usr_deactivated_001", email: "deactivated@classroom.edu.np", pass: "SomePassword123!", role: "STUDENT", mcp: 0, active: 0 },
  ];

  for (const u of usersData) {
    const hash = hashPassword(u.pass);
    await client.execute({
      sql: `INSERT INTO users (id, email, password_hash, role, must_change_password, is_active, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(id) DO UPDATE SET email = excluded.email, password_hash = excluded.password_hash, must_change_password = excluded.must_change_password, is_active = excluded.is_active;`,
      args: [u.id, u.email, hash, u.role, u.mcp, u.active, now, now],
    });
  }

  // Seed Student Profiles
  const profilesData = [
    { id: "sp_cr_001", userId: "usr_cr_001", roll: "BCA-2024-001", faculty: "BCA", sem: 4, section: "A" },
    { id: "sp_student_001", userId: "usr_student_001", roll: "BCA-2024-002", faculty: "BCA", sem: 4, section: "A" },
    { id: "sp_atrisk_001", userId: "usr_atrisk_001", roll: "BCA-2024-005", faculty: "BCA", sem: 4, section: "A" },
    { id: "sp_newstudent_001", userId: "usr_newstudent_001", roll: "BCA-2024-015", faculty: "BCA", sem: 4, section: "A" },
    { id: "sp_unauthorized_001", userId: "usr_unauthorized_001", roll: "CSIT-2024-099", faculty: "CSIT", sem: 2, section: "A" },
    { id: "sp_deactivated_001", userId: "usr_deactivated_001", roll: "BCA-2024-099", faculty: "BCA", sem: 4, section: "A" },
  ];

  for (const p of profilesData) {
    await client.execute({
      sql: `INSERT INTO student_profiles (id, user_id, roll_number, faculty, semester, section, batch_year, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, 2024, ?, ?)
            ON CONFLICT(id) DO UPDATE SET roll_number = excluded.roll_number;`,
      args: [p.id, p.userId, p.roll, p.faculty, p.sem, p.section, now, now],
    });
  }

  // 1. Seed Teachers
  await client.execute({
    sql: `INSERT INTO teachers (id, name, email, phone, faculties, semesters, created_at, updated_at)
          VALUES ('tch_ram_001', 'Prof. Ram Sharma', 'teacher@classroom.edu.np', '9841000001', '["BCA","CSIT"]', '["4th","2nd"]', ?, ?)
          ON CONFLICT(id) DO UPDATE SET name = excluded.name, email = excluded.email;`,
    args: [now, now],
  });

  // 2. Seed Subjects
  const subjectsData = [
    { id: "subj_dsa_001", name: "Data Structures and Algorithms", code: "CACS201", teacherId: "tch_ram_001" },
    { id: "subj_dbms_001", name: "Database Management Systems", code: "CACS202", teacherId: "tch_ram_001" },
    { id: "subj_wt_001", name: "Web Technology", code: "CACS203", teacherId: "tch_ram_001" },
    { id: "subj_restricted_001", name: "Discrete Mathematics (CSIT Only)", code: "CSIT201", teacherId: "tch_ram_001" },
  ];

  for (const s of subjectsData) {
    await client.execute({
      sql: `INSERT INTO subjects (id, name, slug, code, teacher_id, created_at)
            VALUES (?, ?, ?, ?, ?, ?)
            ON CONFLICT(id) DO UPDATE SET name = excluded.name, slug = excluded.slug, code = excluded.code;`,
      args: [s.id, s.name, slugify(s.name), s.code, s.teacherId, now],
    });
  }

  // 3. Seed Students (Base table)
  const studentsData = [
    { id: "student-001", name: "Aashish CR", roll: "BCA-2024-001", email: "cr@classroom.edu.np", faculty: "BCA", semester: "4th" },
    { id: "sp_student_001", name: "Bikash Thapa", roll: "BCA-2024-002", email: "student@classroom.edu.np", faculty: "BCA", semester: "4th" },
    { id: "sp_atrisk_001", name: "Sunil Shrestha", roll: "BCA-2024-005", email: "atrisk@classroom.edu.np", faculty: "BCA", semester: "4th" },
    { id: "sp_newstudent_001", name: "Roshani Shrestha", roll: "BCA-2024-015", email: "newstudent@classroom.edu.np", faculty: "BCA", semester: "4th" },
    { id: "sp_unauthorized_001", name: "Kiran Adhikari", roll: "CSIT-2024-099", email: "unauthorized@classroom.edu.np", faculty: "CSIT", semester: "2nd" },
  ];

  for (const st of studentsData) {
    await client.execute({
      sql: `INSERT INTO students (id, name, roll_number, email, phone, faculty, semester, created_at)
            VALUES (?, ?, ?, ?, '9841000000', ?, ?, ?)
            ON CONFLICT(id) DO UPDATE SET name = excluded.name, roll_number = excluded.roll_number;`,
      args: [st.id, st.name, st.roll, st.email, st.faculty, st.semester, now],
    });
  }

  // 4. Seed Weekly Routine (Sunday = 0 to Friday = 5)
  const routineData = [
    { id: "rout_dsa_sun", subjectId: "subj_dsa_001", day: 0, start: "07:00", end: "08:30", teacher: "Prof. Ram Sharma", room: "Lab 2" },
    { id: "rout_dbms_sun", subjectId: "subj_dbms_001", day: 0, start: "08:30", end: "10:00", teacher: "Prof. Ram Sharma", room: "Room 302" },
    { id: "rout_wt_sun", subjectId: "subj_wt_001", day: 0, start: "10:30", end: "12:00", teacher: "Prof. Ram Sharma", room: "Room 302" },
    { id: "rout_dsa_mon", subjectId: "subj_dsa_001", day: 1, start: "07:00", end: "08:30", teacher: "Prof. Ram Sharma", room: "Lab 2" },
    { id: "rout_dbms_mon", subjectId: "subj_dbms_001", day: 1, start: "08:30", end: "10:00", teacher: "Prof. Ram Sharma", room: "Room 302" },
    { id: "rout_dsa_tue", subjectId: "subj_dsa_001", day: 2, start: "07:00", end: "08:30", teacher: "Prof. Ram Sharma", room: "Lab 2" },
    { id: "rout_dbms_wed", subjectId: "subj_dbms_001", day: 3, start: "08:30", end: "10:00", teacher: "Prof. Ram Sharma", room: "Room 302" },
    { id: "rout_wt_thu", subjectId: "subj_wt_001", day: 4, start: "10:30", end: "12:00", teacher: "Prof. Ram Sharma", room: "Room 302" },
    { id: "rout_dsa_fri", subjectId: "subj_dsa_001", day: 5, start: "07:00", end: "08:30", teacher: "Prof. Ram Sharma", room: "Lab 2" },
    { id: "rout_wt_sat", subjectId: "subj_wt_001", day: 6, start: "07:00", end: "08:30", teacher: "Prof. Ram Sharma", room: "Lab 2" },
    { id: "rout_dbms_sat", subjectId: "subj_dbms_001", day: 6, start: "08:30", end: "10:00", teacher: "Prof. Ram Sharma", room: "Room 302" },
  ];

  for (const r of routineData) {
    await client.execute({
      sql: `INSERT INTO weekly_routine (id, subject_id, day_of_week, start_time, end_time, teacher_name, room, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(id) DO UPDATE SET start_time = excluded.start_time, end_time = excluded.end_time;`,
      args: [r.id, r.subjectId, r.day, r.start, r.end, r.teacher, r.room, now, now],
    });
  }

  // 5. Seed Historical Class Sessions & Attendance
  const sessionDates = [
    now - (14 * oneDay),
    now - (10 * oneDay),
    now - (7 * oneDay),
    now - (3 * oneDay),
    now - (1 * oneDay),
    now,
  ];

  let sessIdx = 1;
  for (const sDate of sessionDates) {
    const sessId = `sess_hist_dsa_${sessIdx}`;
    await client.execute({
      sql: `INSERT INTO class_sessions (id, subject_id, routine_id, session_date, start_time, end_time, created_at)
            VALUES (?, 'subj_dsa_001', 'rout_dsa_sun', ?, '07:00', '08:30', ?)
            ON CONFLICT(id) DO NOTHING;`,
      args: [sessId, sDate, now],
    });

    await client.execute({
      sql: `INSERT INTO lecture_logs (id, class_session_id, topics_covered, homework, notes, created_at)
            VALUES (?, ?, 'Binary Search Trees & Balancing Algorithms', 'Solve Exercise 4.2', 'Lecture completed on schedule.', ?)
            ON CONFLICT(id) DO NOTHING;`,
      args: [`log_${sessId}`, sessId, now],
    });

    // Mark Bikash present (Safe student: 90% attendance)
    await client.execute({
      sql: `INSERT INTO attendance (id, class_session_id, student_id, status, created_at)
            VALUES (?, ?, 'sp_student_001', ?, ?)
            ON CONFLICT(class_session_id, student_id) DO UPDATE SET status = excluded.status;`,
      args: [`att_std_${sessId}`, sessId, sessIdx === 2 ? "absent" : "present", now],
    });

    // Mark Sunil absent mostly (At-risk student: 33% attendance)
    await client.execute({
      sql: `INSERT INTO attendance (id, class_session_id, student_id, status, created_at)
            VALUES (?, ?, 'sp_atrisk_001', ?, ?)
            ON CONFLICT(class_session_id, student_id) DO UPDATE SET status = excluded.status;`,
      args: [`att_risk_${sessId}`, sessId, (sessIdx === 1 || sessIdx === 6) ? "present" : "absent", now],
    });

    sessIdx++;
  }

  // 6. Seed Homework / Assignments
  const homeworkData = [
    {
      id: "hw_dsa_trees",
      subjectId: "subj_dsa_001",
      title: "Assignment 3: Red-Black Trees & Balancing",
      desc: "Implement insertion and left-rotation operations for Red-Black Tree in C/C++ or TypeScript.",
      assigned: now - (2 * oneDay),
      due: now + (3 * oneDay),
      status: "active",
    },
    {
      id: "hw_dbms_norm",
      subjectId: "subj_dbms_001",
      title: "DBMS Lab Report: 3NF & BCNF Normalization",
      desc: "Submit complete decomposition schema diagrams and relational proofs.",
      assigned: now - (5 * oneDay),
      due: now + (1 * oneDay), // Due soon (<24h)
      status: "active",
    },
    {
      id: "hw_wt_js",
      subjectId: "subj_wt_001",
      title: "Web Tech Lab 1: DOM Manipulation & Event Bubbling",
      desc: "Interactive calculator and form validation.",
      assigned: now - (14 * oneDay),
      due: now - (7 * oneDay), // Past due / graded
      status: "completed",
    },
  ];

  for (const h of homeworkData) {
    await client.execute({
      sql: `INSERT INTO homework (id, subject_id, title, description, assigned_date, due_date, status, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(id) DO UPDATE SET title = excluded.title, status = excluded.status;`,
      args: [h.id, h.subjectId, h.title, h.desc, h.assigned, h.due, h.status, now, now],
    });
  }

  // 7. Seed Pinned Notices & Events
  await client.execute({
    sql: `INSERT INTO notices (id, title, content, is_pinned, created_at, updated_at)
          VALUES ('not_midterm_01', 'Mid-Term Examination Schedule Released', 'Mid-term examinations for BCA 4th Semester begin next week. Check the notice board for room assignments.', 1, ?, ?)
          ON CONFLICT(id) DO NOTHING;`,
    args: [now, now],
  });

  await client.execute({
    sql: `INSERT INTO events (id, title, description, event_date, start_time, end_time, event_type, location, created_at, updated_at)
          VALUES ('evt_hackathon_01', 'Tribhuvan University Intra-College Hackathon 2026', '24-hour innovation challenge for CSIT & BCA students.', ?, '09:00', '17:00', 'Competition', 'Main Auditorium', ?, ?)
          ON CONFLICT(id) DO NOTHING;`,
    args: [now + (7 * oneDay), now, now],
  });

  // 8. Seed Course Units & Chapters for Subject Details
  await client.execute({
    sql: `INSERT INTO course_units (id, subject_id, title, \`order\`, created_at, updated_at)
          VALUES ('unit_dsa_01', 'subj_dsa_001', 'Unit 1: Introduction to Data Structures & Algorithms', 1, ?, ?)
          ON CONFLICT(id) DO NOTHING;`,
    args: [now, now],
  });

  await client.execute({
    sql: `INSERT INTO course_chapters (id, unit_id, title, \`order\`, created_at, updated_at)
          VALUES ('chap_dsa_01', 'unit_dsa_01', '1.1 Time & Space Complexity Analysis (Asymptotic Notations)', 1, ?, ?)
          ON CONFLICT(id) DO NOTHING;`,
    args: [now, now],
  });

  await client.execute({
    sql: `INSERT INTO course_materials (id, chapter_id, title, file_url, file_type, created_at)
          VALUES ('mat_dsa_01', 'chap_dsa_01', 'Lecture Slides: Asymptotic Notations (Big-O, Omega, Theta).pdf', 'https://utfs.io/f/mock-dsa-slides-01.pdf', 'pdf', ?)
          ON CONFLICT(id) DO NOTHING;`,
    args: [now],
  });

  // 9. Seed Enrollments (Strict multi-tenant subject mapping)
  const enrollmentsData = [
    { id: "enr_std_dsa", studentId: "sp_student_001", subjectId: "subj_dsa_001", sem: 4 },
    { id: "enr_std_dbms", studentId: "sp_student_001", subjectId: "subj_dbms_001", sem: 4 },
    { id: "enr_std_wt", studentId: "sp_student_001", subjectId: "subj_wt_001", sem: 4 },
    { id: "enr_cr_dsa", studentId: "student-001", subjectId: "subj_dsa_001", sem: 4 },
    { id: "enr_cr_dbms", studentId: "student-001", subjectId: "subj_dbms_001", sem: 4 },
    { id: "enr_cr_wt", studentId: "student-001", subjectId: "subj_wt_001", sem: 4 },
    { id: "enr_risk_dsa", studentId: "sp_atrisk_001", subjectId: "subj_dsa_001", sem: 4 },
    { id: "enr_risk_dbms", studentId: "sp_atrisk_001", subjectId: "subj_dbms_001", sem: 4 },
    { id: "enr_risk_wt", studentId: "sp_atrisk_001", subjectId: "subj_wt_001", sem: 4 },
    { id: "enr_unauth_csit", studentId: "sp_unauthorized_001", subjectId: "subj_restricted_001", sem: 2 },
  ];

  for (const enr of enrollmentsData) {
    await client.execute({
      sql: `INSERT INTO enrollments (id, student_id, subject_id, semester, enrolled_at)
            VALUES (?, ?, ?, ?, ?)
            ON CONFLICT(id) DO NOTHING;`,
      args: [enr.id, enr.studentId, enr.subjectId, enr.sem, now],
    });
  }

  // 10. Seed Graded Assignment Submission
  // Deterministic reset: UI-driven specs create submissions during a run;
  // they must never leak into the next run's baseline (badge counts etc).
  await client.execute({
    sql: `DELETE FROM assignment_submissions WHERE id NOT IN ('sub_wt_graded_01', 'sub_dsa_submitted_01');`,
    args: [],
  });

  await client.execute({
    sql: `INSERT INTO assignment_submissions (id, homework_id, student_id, content, file_url, file_name, file_size, status, submitted_at, grade, score, feedback, graded_by, graded_at, created_at, updated_at)
          VALUES ('sub_wt_graded_01', 'hw_wt_js', 'sp_student_001', 'Implemented DOM event listeners and interactive calculator with event delegation.', 'https://utfs.io/f/mock-wt-lab1.pdf', 'wt_lab1_dom_calculator.pdf', 204800, 'graded', ?, 'A+', 95, 'Outstanding event delegation and clean modular JS structure.', 'tch_ram_001', ?, ?, ?)
          ON CONFLICT(id) DO UPDATE SET grade = excluded.grade, score = excluded.score, status = excluded.status;`,
    args: [now - (6 * oneDay), now - (3 * oneDay), now - (7 * oneDay), now - (3 * oneDay)],
  });

  // 10b. Seed Ungraded Submitted Submission (Grading badge / teacher surfaces)
  await client.execute({
    sql: `INSERT INTO assignment_submissions (id, homework_id, student_id, content, status, submitted_at, created_at, updated_at)
          VALUES ('sub_dsa_submitted_01', 'hw_dsa_trees', 'sp_student_001', 'Red-Black tree insertions with recoloring walkthrough and rotation case analysis.', 'submitted', ?, ?, ?)
          ON CONFLICT(id) DO UPDATE SET status = excluded.status, submitted_at = excluded.submitted_at;`,
    args: [now - (2 * oneDay), now - (2 * oneDay), now - (2 * oneDay)],
  });
  // 11. Seed Downloadable Resources / Lecture Materials
  const resourcesData = [
    { id: "res_dsa_01", subjectId: "subj_dsa_001", title: "DSA Lecture Slides & Lab Materials", url: "https://utfs.io/f/mock-dsa-slides-01.pdf", type: "pdf", size: 1048576 },
    { id: "res_dsa_02", subjectId: "subj_dsa_001", title: "Binary Trees & Graph Theory Materials", url: "https://utfs.io/f/mock-dsa-trees.pdf", type: "slides", size: 2097152 },
    { id: "res_dbms_01", subjectId: "subj_dbms_001", title: "Relational Algebra & Normalization Cheatsheet", url: "https://utfs.io/f/mock-dbms-cheatsheet.pdf", type: "pdf", size: 524288 },
    { id: "res_wt_01", subjectId: "subj_wt_001", title: "DOM & Asynchronous JavaScript Guide", url: "https://utfs.io/f/mock-wt-guide.pdf", type: "pdf", size: 819200 },
  ];

  for (const res of resourcesData) {
    await client.execute({
      sql: `INSERT INTO resources (id, subject_id, title, file_url, file_type, file_size, uploaded_by, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, 'tch_ram_001', ?, ?)
            ON CONFLICT(id) DO NOTHING;`,
      args: [res.id, res.subjectId, res.title, res.url, res.type, res.size, now, now],
    });
  }

  console.log("✅ [Seed E2E] Seeding completed successfully.");
}

// Execute if run directly via tsx
if (require.main === module || process.argv[1]?.includes("seed-e2e")) {
  const client = getE2EClient();
  ensureMigrated(client)
    .then(() => seedE2E(client))
    .catch((err) => {
      console.error("❌ Seeding failed:", err);
      process.exit(1);
    });
}
