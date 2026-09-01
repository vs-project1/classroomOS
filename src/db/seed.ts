import { config } from "dotenv";
import { sql } from "drizzle-orm";
config({ path: ".env.local" });
config(); // Fallback to .env

import crypto from "node:crypto";
import { db } from "./client";
import { slugify } from "@/utils/slug";
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
export function hashPassword(plainText: string): string {
  const salt = crypto.randomBytes(16).toString("hex");
  const derivedKey = crypto.scryptSync(plainText, salt, 64);
  return `${salt}:${derivedKey.toString("hex")}`;
}

async function seed() {
  console.log("🌱 Starting Classroom OS Database Seeding...");
  const startTime = Date.now();

  // --- DESTRUCTIVE-SCRIPT GUARD (audit C8) ---
  // This seed TRUNCATES every table. Refuse to run against anything that is
  // not a local file database unless explicitly overridden.
  const dbUrl = process.env.DATABASE_URL ?? "";
  const isLocal = dbUrl.startsWith("file:");
  const override = process.env.SEED_ALLOW_REMOTE === "1";
  if (!isLocal && !override) {
    console.error(
      `\n🛑 REFUSING TO SEED: DATABASE_URL is "${dbUrl || "(unset)"}".\n` +
        `   This script deletes EVERY table and re-inserts demo data.\n` +
        `   It only runs against local file: databases by default.\n` +
        `   To target a remote DB deliberately, re-run with SEED_ALLOW_REMOTE=1.\n`
    );
    process.exit(1);
  }

  // --- ATOMICITY (audit C8): one failure mid-run must not leave the DB
  // truncated and half-populated. Single connection => explicit transaction.
  await db.run(sql`BEGIN IMMEDIATE`);

  try {
    await seedAll();
    await db.run(sql`COMMIT`);
  } catch (err) {
    await db.run(sql`ROLLBACK`);
    throw err;
  }

  const duration = ((Date.now() - startTime) / 1000).toFixed(2);
  console.log(`🌱 Classroom OS Database Seeding completed successfully in ${duration}s!`);
}

async function seedAll() {
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
  const defaultTeacherPass = hashPassword("TeacherPassword123!");
  const defaultTempPass = hashPassword("TempPassword123!");
  const defaultStudentPass = hashPassword("StudentPassword123!");

  const usersData = [
    {
      id: "usr_admin_01",
      email: "admin@classroom.edu.np",
      passwordHash: defaultAdminPass,
      role: "ADMIN" as const,
      // Known public credential in a demo seed — force rotation at first login.
      mustChangePassword: true,
      isActive: true,
    },
    {
      id: "usr_admin_os",
      email: "admin@classroom.os",
      passwordHash: defaultAdminPass,
      role: "ADMIN" as const,
      mustChangePassword: true,
      isActive: true,
    },
    {
      id: "usr_student_01",
      email: "student@classroom.edu.np",
      passwordHash: defaultStudentPass,
      role: "STUDENT" as const,
      mustChangePassword: false,
      isActive: true,
    },
    {
      id: "usr_teacher_01",
      email: "teacher@classroom.edu.np",
      passwordHash: defaultTeacherPass,
      role: "TEACHER" as const,
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
    {
      id: "tch_nikunja_05",
      name: "Er. Nikunja Sir",
      email: "nikunja@classroom.os",
      phone: "+977-9841234571",
      faculties: ["BCA"],
      semesters: ["2nd Semester"],
    },
    {
      id: "tch_ashish_06",
      name: "Er. Ashish Sir",
      email: "ashish@classroom.os",
      phone: "+977-9841234572",
      faculties: ["BCA"],
      semesters: ["2nd Semester"],
    },
    {
      id: "tch_mohit_07",
      name: "Mr. Mohit Sir",
      email: "mohit@classroom.os",
      phone: "+977-9841234573",
      faculties: ["BCA"],
      semesters: ["2nd Semester"],
    },
    {
      id: "tch_sudeep_08",
      name: "Sudeep Sir",
      email: "sudeep@classroom.os",
      phone: "+977-9841234574",
      faculties: ["BCA"],
      semesters: ["2nd Semester"],
    },
    {
      id: "tch_saddam_09",
      name: "Er. MD Saddam Sir",
      email: "saddam@classroom.os",
      phone: "+977-9841234575",
      faculties: ["BCA"],
      semesters: ["2nd Semester"],
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
      semester: "2nd Semester",
    });

    await db.insert(studentProfiles).values({
      id: s.profileId,
      userId: s.userId,
      rollNumber: s.roll,
      faculty: "BCA",
      semester: 2,
      section: "A",
      batchYear: 2025,
      phone: s.phone,
    });
  }

  // 5. Seed Subjects (Complete 8-Semester BCA Curriculum)
  console.log("📚 Seeding Subjects...");
  const subjectsData = [
    // --- First Semester (I) ---
    { id: "subj_bca101", name: "Computer Fundamentals and Applications", slug: slugify("Computer Fundamentals and Applications"), code: "BCA 101", semester: "I", teacherId: "tch_rajesh_01" },
    { id: "subj_bca102", name: "Programming in C", slug: slugify("Programming in C"), code: "BCA 102", semester: "I", teacherId: "tch_sunita_02" },
    { id: "subj_bca103", name: "Digital Logic", slug: slugify("Digital Logic"), code: "BCA 103", semester: "I", teacherId: "tch_bishal_03" },
    { id: "subj_bca104", name: "Mathematics I", slug: slugify("Mathematics I"), code: "BCA 104", semester: "I", teacherId: "tch_anjali_04" },
    { id: "subj_bca105", name: "Professional Communication and Ethics", slug: slugify("Professional Communication and Ethics"), code: "BCA 105", semester: "I", teacherId: "tch_rajesh_01" },
    { id: "subj_bca106", name: "Hardware Workshop", slug: slugify("Hardware Workshop"), code: "BCA 106", semester: "I", teacherId: "tch_sunita_02" },

    // --- Second Semester (II) ---
    { id: "subj_bca151", name: "Discrete Structure", slug: slugify("Discrete Structure"), code: "BCA 151", semester: "II", teacherId: "tch_nikunja_05" },
    { id: "subj_bca152", name: "Microprocessor and Computer Architecture", slug: slugify("Microprocessor and Computer Architecture"), code: "BCA 152", semester: "II", teacherId: "tch_saddam_09" },
    { id: "subj_bca153", name: "OOP in Java", slug: slugify("OOP in Java"), code: "BCA 153", semester: "II", teacherId: "tch_ashish_06" },
    { id: "subj_bca154", name: "Mathematics II", slug: slugify("Mathematics II"), code: "BCA 154", semester: "II", teacherId: "tch_mohit_07" },
    { id: "subj_bca155", name: "UX/UI Design", slug: slugify("UX/UI Design"), code: "BCA 155", semester: "II", teacherId: "tch_sudeep_08" },
    { id: "subj_bca156", name: "Principles of Management", slug: slugify("Principles of Management"), code: "BCA 156", semester: "II", teacherId: "tch_rajesh_01" },

    // --- Third Semester (III) ---
    { id: "subj_bca201", name: "Data Structure and Algorithms", slug: slugify("Data Structure and Algorithms"), code: "BCA 201", semester: "III", teacherId: "tch_bishal_03" },
    { id: "subj_bca202", name: "Database Management System (3rd)", slug: slugify("Database Management System 3rd"), code: "BCA 202", semester: "III", teacherId: "tch_rajesh_01" },
    { id: "subj_bca203", name: "Web Technology I", slug: slugify("Web Technology I"), code: "BCA 203", semester: "III", teacherId: "tch_bishal_03" },
    { id: "subj_bca204", name: "System Analysis and Design", slug: slugify("System Analysis and Design"), code: "BCA 204", semester: "III", teacherId: "tch_sunita_02" },
    { id: "subj_bca205", name: "Probability and Statistics", slug: slugify("Probability and Statistics"), code: "BCA 205", semester: "III", teacherId: "tch_anjali_04" },
    { id: "subj_bca206", name: "Applied Economics", slug: slugify("Applied Economics"), code: "BCA 206", semester: "III", teacherId: "tch_rajesh_01" },

    // --- Fourth Semester (IV) ---
    { id: "subj_dbms", name: "Database Management System", slug: slugify("Database Management System"), code: "CACS251", semester: "IV", teacherId: "tch_rajesh_01" },
    { id: "subj_os", name: "Operating Systems", slug: slugify("Operating Systems"), code: "CACS252", semester: "IV", teacherId: "tch_sunita_02" },
    { id: "subj_web2", name: "Web Technology II", slug: slugify("Web Technology II"), code: "CACS253", semester: "IV", teacherId: "tch_bishal_03" },
    { id: "subj_nm", name: "Numerical Methods", slug: slugify("Numerical Methods"), code: "CACS254", semester: "IV", teacherId: "tch_anjali_04" },
    { id: "subj_se", name: "Software Engineering", slug: slugify("Software Engineering"), code: "CACS255", semester: "IV", teacherId: "tch_rajesh_01" },
    { id: "subj_bca254", name: "Python Programming", slug: slugify("Python Programming"), code: "BCA 254", semester: "IV", teacherId: "tch_bishal_03" },
    { id: "subj_bca256", name: "Project I", slug: slugify("Project I"), code: "BCA 256", semester: "IV", teacherId: "tch_rajesh_01" },

    // --- Fifth Semester (V) ---
    { id: "subj_bca301", name: "Computer Network", slug: slugify("Computer Network"), code: "BCA 301", semester: "V", teacherId: "tch_sunita_02" },
    { id: "subj_bca302", name: "Artificial Intelligence", slug: slugify("Artificial Intelligence"), code: "BCA 302", semester: "V", teacherId: "tch_bishal_03" },
    { id: "subj_bca303", name: "Advance Java Programming", slug: slugify("Advance Java Programming"), code: "BCA 303", semester: "V", teacherId: "tch_bishal_03" },
    { id: "subj_bca304", name: "MIS and e-Business", slug: slugify("MIS and e-Business"), code: "BCA 304", semester: "V", teacherId: "tch_rajesh_01" },
    { id: "subj_bca305", name: "Society and Technology", slug: slugify("Society and Technology"), code: "BCA 305", semester: "V", teacherId: "tch_anjali_04" },
    { id: "subj_bca306", name: "Project II", slug: slugify("Project II"), code: "BCA 306", semester: "V", teacherId: "tch_rajesh_01" },

    // --- Sixth Semester (VI) ---
    { id: "subj_bca351", name: "Computer Graphics and Animation", slug: slugify("Computer Graphics and Animation"), code: "BCA 351", semester: "VI", teacherId: "tch_bishal_03" },
    { id: "subj_bca352", name: "Mobile Programming", slug: slugify("Mobile Programming"), code: "BCA 352", semester: "VI", teacherId: "tch_bishal_03" },
    { id: "subj_bca353", name: "Cryptography and Network Security", slug: slugify("Cryptography and Network Security"), code: "BCA 353", semester: "VI", teacherId: "tch_sunita_02" },
    { id: "subj_bca354", name: "Technical Writing", slug: slugify("Technical Writing"), code: "BCA 354", semester: "VI", teacherId: "tch_anjali_04" },
    { id: "subj_bca355", name: "Distributed System", slug: slugify("Distributed System"), code: "BCA 355", semester: "VI", teacherId: "tch_sunita_02" },
    { id: "subj_bca356", name: "Project III", slug: slugify("Project III"), code: "BCA 356", semester: "VI", teacherId: "tch_rajesh_01" },

    // --- Seventh Semester (VII) ---
    { id: "subj_bca401", name: "Cyber Security and Ethical Hacking", slug: slugify("Cyber Security and Ethical Hacking"), code: "BCA 401", semester: "VII", teacherId: "tch_sunita_02" },
    { id: "subj_bca402", name: "Software Project Management", slug: slugify("Software Project Management"), code: "BCA 402", semester: "VII", teacherId: "tch_rajesh_01" },
    { id: "subj_bca403", name: "Financial Accounting", slug: slugify("Financial Accounting"), code: "BCA 403", semester: "VII", teacherId: "tch_anjali_04" },
    { id: "subj_bca404", name: "Project IV", slug: slugify("Project IV"), code: "BCA 404", semester: "VII", teacherId: "tch_rajesh_01" },
    { id: "subj_bca405", name: "Elective I", slug: slugify("Elective I"), code: "BCA 405", semester: "VII", teacherId: "tch_bishal_03" },
    { id: "subj_bca406", name: "Elective II", slug: slugify("Elective II"), code: "BCA 406", semester: "VII", teacherId: "tch_bishal_03" },

    // --- Eighth Semester (VIII) ---
    { id: "subj_bca451", name: "Cloud Computing", slug: slugify("Cloud Computing"), code: "BCA 451", semester: "VIII", teacherId: "tch_bishal_03" },
    { id: "subj_bca452", name: "Internship", slug: slugify("Internship"), code: "BCA 452", semester: "VIII", teacherId: "tch_rajesh_01" },
    { id: "subj_bca453", name: "Elective III", slug: slugify("Elective III"), code: "BCA 453", semester: "VIII", teacherId: "tch_sunita_02" },
    { id: "subj_bca454", name: "Elective IV", slug: slugify("Elective IV"), code: "BCA 454", semester: "VIII", teacherId: "tch_anjali_04" },
  ];

  for (const subj of subjectsData) {
    await db.insert(subjects).values(subj);
  }

  // 6. Seed Enrollments (All students to 2nd semester core subjects)
  console.log("📝 Seeding Enrollments (2nd Semester)...");
  const secondSemSubjects = subjectsData.filter((s) => s.semester === "II");
  for (const s of rawStudents) {
    for (const subj of secondSemSubjects) {
      await db.insert(enrollments).values({
        id: `enr_${s.id}_${subj.id}`,
        studentId: s.id,
        subjectId: subj.id,
        semester: 2,
        enrolledAt: new Date("2026-07-20T00:00:00.000Z"),
      });
    }
  }

  // 7. Seed Weekly Routine (2nd Semester - 30 periods)
  console.log("⏰ Seeding Weekly Routine (2nd Semester)...");
  const routineData = [
    // --- Second Semester Routine ---
    // Monday (1)
    { id: "rt_sem2_mon_1", subjectId: "subj_bca151", dayOfWeek: 1, startTime: "06:25", endTime: "07:15", teacherName: "Er. Nikunja Sir", room: "Room 201", notes: "Discrete Structure" },
    { id: "rt_sem2_mon_2", subjectId: "subj_bca151", dayOfWeek: 1, startTime: "07:15", endTime: "08:05", teacherName: "Er. Nikunja Sir", room: "Room 201", notes: "Discrete Structure" },
    { id: "rt_sem2_mon_3", subjectId: "subj_bca153", dayOfWeek: 1, startTime: "08:05", endTime: "08:55", teacherName: "Er. Ashish Sir", room: "Lab 1", notes: "OOP in Java" },
    { id: "rt_sem2_mon_4", subjectId: "subj_bca153", dayOfWeek: 1, startTime: "08:55", endTime: "09:45", teacherName: "Er. Ashish Sir", room: "Lab 1", notes: "OOP in Java" },
    { id: "rt_sem2_mon_5", subjectId: "subj_bca152", dayOfWeek: 1, startTime: "10:10", endTime: "11:00", teacherName: "Er. MD Saddam Sir", room: "Room 201", notes: "Microprocessor & Computer Architecture" },
    { id: "rt_sem2_mon_6", subjectId: "subj_bca156", dayOfWeek: 1, startTime: "11:00", endTime: "11:50", teacherName: "Prof. Rajesh Shrestha", room: "Seminar Hall", notes: "Weekly Presentation" },

    // Tuesday (2)
    { id: "rt_sem2_tue_1", subjectId: "subj_bca151", dayOfWeek: 2, startTime: "06:25", endTime: "07:15", teacherName: "Er. Nikunja Sir", room: "Room 201", notes: "Discrete Structure" },
    { id: "rt_sem2_tue_2", subjectId: "subj_bca151", dayOfWeek: 2, startTime: "07:15", endTime: "08:05", teacherName: "Er. Nikunja Sir", room: "Room 201", notes: "Discrete Structure" },
    { id: "rt_sem2_tue_3", subjectId: "subj_bca153", dayOfWeek: 2, startTime: "08:05", endTime: "08:55", teacherName: "Er. Ashish Sir", room: "Lab 1", notes: "OOP in Java" },
    { id: "rt_sem2_tue_4", subjectId: "subj_bca153", dayOfWeek: 2, startTime: "08:55", endTime: "09:45", teacherName: "Er. Ashish Sir", room: "Lab 1", notes: "OOP in Java" },
    { id: "rt_sem2_tue_5", subjectId: "subj_bca152", dayOfWeek: 2, startTime: "10:10", endTime: "11:00", teacherName: "Er. MD Saddam Sir", room: "Room 201", notes: "Microprocessor & Computer Architecture" },
    { id: "rt_sem2_tue_6", subjectId: "subj_bca152", dayOfWeek: 2, startTime: "11:00", endTime: "11:50", teacherName: "Er. MD Saddam Sir", room: "Room 201", notes: "Microprocessor & Computer Architecture" },

    // Wednesday (3)
    { id: "rt_sem2_wed_1", subjectId: "subj_bca154", dayOfWeek: 3, startTime: "06:25", endTime: "07:15", teacherName: "Mr. Mohit Sir", room: "Room 201", notes: "Mathematics-II" },
    { id: "rt_sem2_wed_2", subjectId: "subj_bca151", dayOfWeek: 3, startTime: "07:15", endTime: "08:05", teacherName: "Er. Nikunja Sir", room: "Room 201", notes: "Discrete Structure" },
    { id: "rt_sem2_wed_3", subjectId: "subj_bca153", dayOfWeek: 3, startTime: "08:05", endTime: "08:55", teacherName: "Er. Ashish Sir", room: "Lab 1", notes: "OOP in Java" },
    { id: "rt_sem2_wed_4", subjectId: "subj_bca155", dayOfWeek: 3, startTime: "08:55", endTime: "09:45", teacherName: "Sudeep Sir", room: "Room 201", notes: "UX/UI Design" },
    { id: "rt_sem2_wed_5", subjectId: "subj_bca152", dayOfWeek: 3, startTime: "10:10", endTime: "11:00", teacherName: "Er. MD Saddam Sir", room: "Room 201", notes: "Microprocessor & Computer Architecture" },
    { id: "rt_sem2_wed_6", subjectId: "subj_bca152", dayOfWeek: 3, startTime: "11:00", endTime: "11:50", teacherName: "Er. MD Saddam Sir", room: "Room 201", notes: "Microprocessor & Computer Architecture" },

    // Thursday (4)
    { id: "rt_sem2_thu_1", subjectId: "subj_bca154", dayOfWeek: 4, startTime: "06:25", endTime: "07:15", teacherName: "Mr. Mohit Sir", room: "Room 201", notes: "Mathematics-II" },
    { id: "rt_sem2_thu_2", subjectId: "subj_bca154", dayOfWeek: 4, startTime: "07:15", endTime: "08:05", teacherName: "Mr. Mohit Sir", room: "Room 201", notes: "Mathematics-II" },
    { id: "rt_sem2_thu_3", subjectId: "subj_bca155", dayOfWeek: 4, startTime: "08:05", endTime: "08:55", teacherName: "Sudeep Sir", room: "Room 201", notes: "UX/UI Design" },
    { id: "rt_sem2_thu_4", subjectId: "subj_bca155", dayOfWeek: 4, startTime: "08:55", endTime: "09:45", teacherName: "Sudeep Sir", room: "Room 201", notes: "UX/UI Design" },
    { id: "rt_sem2_thu_5", subjectId: "subj_bca156", dayOfWeek: 4, startTime: "10:10", endTime: "11:00", teacherName: "Prof. Rajesh Shrestha", room: "Room 201", notes: "Principle of Management" },
    { id: "rt_sem2_thu_6", subjectId: "subj_bca156", dayOfWeek: 4, startTime: "11:00", endTime: "11:50", teacherName: "Prof. Rajesh Shrestha", room: "Seminar Hall", notes: "Weekly Presentation" },

    // Friday (5)
    { id: "rt_sem2_fri_1", subjectId: "subj_bca154", dayOfWeek: 5, startTime: "06:25", endTime: "07:15", teacherName: "Mr. Mohit Sir", room: "Room 201", notes: "Mathematics-II" },
    { id: "rt_sem2_fri_2", subjectId: "subj_bca154", dayOfWeek: 5, startTime: "07:15", endTime: "08:05", teacherName: "Mr. Mohit Sir", room: "Room 201", notes: "Mathematics-II" },
    { id: "rt_sem2_fri_3", subjectId: "subj_bca155", dayOfWeek: 5, startTime: "08:05", endTime: "08:55", teacherName: "Sudeep Sir", room: "Room 201", notes: "UX/UI Design" },
    { id: "rt_sem2_fri_4", subjectId: "subj_bca155", dayOfWeek: 5, startTime: "08:55", endTime: "09:45", teacherName: "Sudeep Sir", room: "Room 201", notes: "UX/UI Design" },
    { id: "rt_sem2_fri_5", subjectId: "subj_bca156", dayOfWeek: 5, startTime: "10:10", endTime: "11:00", teacherName: "Prof. Rajesh Shrestha", room: "Room 201", notes: "Principle of Management" },
    { id: "rt_sem2_fri_6", subjectId: "subj_bca155", dayOfWeek: 5, startTime: "11:00", endTime: "11:50", teacherName: "Sudeep Sir", room: "Auditorium", notes: "Extracurricular Activities (ECA)" },
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

    // OOP in Java (subj_bca153) Units
    { id: "unit_java_1", subjectId: "subj_bca153", title: "Unit 1: Introduction to Java and OOP Concepts (4 Hrs)", order: 1 },
    { id: "unit_java_2", subjectId: "subj_bca153", title: "Unit 2: Basics of Java Programming (8 Hrs)", order: 2 },
    { id: "unit_java_3", subjectId: "subj_bca153", title: "Unit 3: Class and Objects in Java (8 Hrs)", order: 3 },
    { id: "unit_java_4", subjectId: "subj_bca153", title: "Unit 4: Inheritance and Polymorphism (6 Hrs)", order: 4 },
    { id: "unit_java_5", subjectId: "subj_bca153", title: "Unit 5: Exception Handling and Multithreading (6 Hrs)", order: 5 },
    { id: "unit_java_6", subjectId: "subj_bca153", title: "Unit 6: File Handling in Java (6 Hrs)", order: 6 },
    { id: "unit_java_7", subjectId: "subj_bca153", title: "Unit 7: Collections and Generics (6 Hrs)", order: 7 },
    { id: "unit_java_8", subjectId: "subj_bca153", title: "Unit 8: Advanced OOP Concepts in Java (4 Hrs)", order: 8 },

    // Discrete Structure (subj_bca151) Units
    { id: "unit_ds_1", subjectId: "subj_bca151", title: "Unit 1: Set Theory (6 Hrs)", order: 1 },
    { id: "unit_ds_2", subjectId: "subj_bca151", title: "Unit 2: Logic and Propositional Calculus (8 Hrs)", order: 2 },
    { id: "unit_ds_3", subjectId: "subj_bca151", title: "Unit 3: Relations and Functions (8 Hrs)", order: 3 },
    { id: "unit_ds_4", subjectId: "subj_bca151", title: "Unit 4: Mathematical Reasoning and Proof Techniques (6 Hrs)", order: 4 },
    { id: "unit_ds_5", subjectId: "subj_bca151", title: "Unit 5: Combinatorics and Counting Principles (5 Hrs)", order: 5 },
    { id: "unit_ds_6", subjectId: "subj_bca151", title: "Unit 6: Graph Theory and Trees (12 Hrs)", order: 6 },
    { id: "unit_ds_7", subjectId: "subj_bca151", title: "Unit 7: Algebraic Structures (3 Hrs)", order: 7 },

    // Microprocessor and Computer Architecture (subj_bca152) Units
    { id: "unit_mp_1", subjectId: "subj_bca152", title: "Unit 1: Introduction to Microprocessor (3 Hrs)", order: 1 },
    { id: "unit_mp_2", subjectId: "subj_bca152", title: "Unit 2: 8085 Microprocessor (12 Hrs)", order: 2 },
    { id: "unit_mp_3", subjectId: "subj_bca152", title: "Unit 3: 8086 Microprocessor (4 Hrs)", order: 3 },
    { id: "unit_mp_4", subjectId: "subj_bca152", title: "Unit 4: Basic Computer Architecture and Design (6 Hrs)", order: 4 },
    { id: "unit_mp_5", subjectId: "subj_bca152", title: "Unit 5: Microprogrammed Control Unit (5 Hrs)", order: 5 },
    { id: "unit_mp_6", subjectId: "subj_bca152", title: "Unit 6: Central Processing Unit (6 Hrs)", order: 6 },
    { id: "unit_mp_7", subjectId: "subj_bca152", title: "Unit 7: Computer Arithmetic (3 Hrs)", order: 7 },
    { id: "unit_mp_8", subjectId: "subj_bca152", title: "Unit 8: Input and Output Organization and Memory Organization (5 Hrs)", order: 8 },
    { id: "unit_mp_9", subjectId: "subj_bca152", title: "Unit 9: Pipelining (4 Hrs)", order: 9 },

    // Mathematics II (subj_bca154) Units
    { id: "unit_math2_1", subjectId: "subj_bca154", title: "Unit 1: Limit and Continuity (7 Hrs)", order: 1 },
    { id: "unit_math2_2", subjectId: "subj_bca154", title: "Unit 2: Derivatives (7 Hrs)", order: 2 },
    { id: "unit_math2_3", subjectId: "subj_bca154", title: "Unit 3: Applications of Derivatives (8 Hrs)", order: 3 },
    { id: "unit_math2_4", subjectId: "subj_bca154", title: "Unit 4: Anti-derivative and its Applications (8 Hrs)", order: 4 },
    { id: "unit_math2_5", subjectId: "subj_bca154", title: "Unit 5: Differential Equations (8 Hrs)", order: 5 },
    { id: "unit_math2_6", subjectId: "subj_bca154", title: "Unit 6: Computational Methods (10 Hrs)", order: 6 },

    // UX/UI Design (subj_bca155) Units
    { id: "unit_uiux_1", subjectId: "subj_bca155", title: "Unit 1: Introduction (4 Hrs)", order: 1 },
    { id: "unit_uiux_2", subjectId: "subj_bca155", title: "Unit 2: User interaction design (4 Hrs)", order: 2 },
    { id: "unit_uiux_3", subjectId: "subj_bca155", title: "Unit 3: User Interface design (6 Hrs)", order: 3 },
    { id: "unit_uiux_4", subjectId: "subj_bca155", title: "Unit 4: UI components (12 Hrs)", order: 4 },
    { id: "unit_uiux_5", subjectId: "subj_bca155", title: "Unit 5: UI Design considerations (6 Hrs)", order: 5 },
    { id: "unit_uiux_6", subjectId: "subj_bca155", title: "Unit 6: Wireframing and prototyping (6 Hrs)", order: 6 },
    { id: "unit_uiux_7", subjectId: "subj_bca155", title: "Unit 7: Design evaluations (6 Hrs)", order: 7 },
    { id: "unit_uiux_8", subjectId: "subj_bca155", title: "Unit 8: Advanced techniques: VUI and NLP based UI (4 Hrs)", order: 8 },

    // Principles of Management (subj_bca156) Units
    { id: "unit_pom_1", subjectId: "subj_bca156", title: "Unit 1: Introduction to Management (5 Hrs)", order: 1 },
    { id: "unit_pom_2", subjectId: "subj_bca156", title: "Unit 2: Planning and Decision making (5 Hrs)", order: 2 },
    { id: "unit_pom_3", subjectId: "subj_bca156", title: "Unit 3: Organizing (3 Hrs)", order: 3 },
    { id: "unit_pom_4", subjectId: "subj_bca156", title: "Unit 4: Leading (3 Hrs)", order: 4 },
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
    { subj: "subj_bca151", topic: "Propositional Logic & Equivalence Proofs", hw: "Solve Problem Set 2.1 (Q1-Q5)", notes: "Students grasped truth tables well" },
    { subj: "subj_bca153", topic: "OOP Inheritance & Abstract Method Overriding", hw: "Build typed class hierarchy in Java", notes: "High engagement during polymorphism demo" },
    { subj: "subj_bca152", topic: "8085 Microprocessor Architecture & Bus System", hw: "Draw 8085 pin diagram & register set", notes: "Covered ALU, accumulator, and flag register" },
    { subj: "subj_bca154", topic: "Limits & Continuity of Algebraic Functions", hw: "Solve Exercise 1.2 (Q1-Q10)", notes: "Emphasized epsilon-delta limit definition" },
    { subj: "subj_bca155", topic: "User Interface Principles & Visual Hierarchy", hw: "Figma wireframe sketch for mobile app", notes: "Reviewed typography and layout spacing" },
    { subj: "subj_bca156", topic: "Management Theories & Organizational Structure", hw: "Draft case study summary on Henri Fayol", notes: "Good class discussion on leadership styles" },
  ];

  const sessionIds: string[] = [];

  let sessionCounter = 0;
  for (let week = 0; week < 3; week++) {
    for (let day = 0; day < 5; day++) {
      const sessionDate = new Date(baseDate);
      sessionDate.setDate(baseDate.getDate() + week * 7 + day);

      const secondSemSubjectIds = ["subj_bca151", "subj_bca152", "subj_bca153", "subj_bca154", "subj_bca155", "subj_bca156"];
      const seenSubjects = new Set<string>();
      const dayRoutines = routineData.filter((r) => {
        if (r.dayOfWeek !== day + 1 || !secondSemSubjectIds.includes(r.subjectId)) return false;
        if (seenSubjects.has(r.subjectId)) return false;
        seenSubjects.add(r.subjectId);
        return true;
      });

      for (let slot = 0; slot < dayRoutines.length; slot++) {
        const routine = dayRoutines[slot];
        sessionCounter++;
        const sessionId = `sess_${sessionCounter.toString().padStart(3, "0")}`;
        sessionIds.push(sessionId);

        await db.insert(classSessions).values({
          id: sessionId,
          subjectId: routine.subjectId,
          routineId: routine.id,
          sessionDate,
          startTime: routine.startTime,
          endTime: routine.endTime,
        });

        const topicInfo = curriculumTopics[(sessionCounter - 1) % curriculumTopics.length];
        await db.insert(lectureLogs).values({
          id: `log_${sessionId}`,
          classSessionId: sessionId,
          topicsCovered: `${topicInfo.topic} (Lecture ${sessionCounter})`,
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
      subjectId: "subj_bca153",
      title: "Java OOP Class Hierarchy & Polymorphism Lab Report",
      description: "Implement a complete Java class hierarchy demonstrating inheritance, method overriding, abstract classes, and interface contracts.",
      assignedDate: new Date("2026-07-27T00:00:00.000Z"),
      dueDate: new Date("2026-08-05T23:59:59.000Z"),
      status: "completed",
    },
    {
      id: "hw_02",
      subjectId: "subj_bca151",
      title: "Discrete Mathematics Set Theory & Truth Table Proofs",
      description: "Solve Problem Set 2.1 Q1-Q10 on propositional logic equivalence, Venn diagrams, and set relation properties.",
      assignedDate: new Date("2026-08-01T00:00:00.000Z"),
      dueDate: new Date("2026-08-10T23:59:59.000Z"),
      status: "completed",
    },
    {
      id: "hw_03",
      subjectId: "subj_bca152",
      title: "8085 Microprocessor Pin Diagram & Bus Architecture Sketch",
      description: "Draw the detailed 8085 microprocessor pin diagram and write functional descriptions of control signals (ALE, RD, WR, IO/M).",
      assignedDate: new Date("2026-08-12T00:00:00.000Z"),
      dueDate: new Date("2026-08-18T23:59:59.000Z"),
      status: "active",
    },
    {
      id: "hw_04",
      subjectId: "subj_bca154",
      title: "Mathematics II Calculus Limits & Differentiation Assignment",
      description: "Solve derivative problems using first principles, chain rule, and implicit differentiation from Exercise 2.2.",
      assignedDate: new Date("2026-08-13T00:00:00.000Z"),
      dueDate: new Date("2026-08-20T23:59:59.000Z"),
      status: "active",
    },
    {
      id: "hw_05",
      subjectId: "subj_bca155",
      title: "UX/UI Design Mobile App Low-Fidelity Wireframes",
      description: "Prepare low-fidelity mobile app wireframes focusing on visual hierarchy, navigation patterns, and accessibility guidelines.",
      assignedDate: new Date("2026-08-03T00:00:00.000Z"),
      dueDate: new Date("2026-08-13T23:59:59.000Z"),
      status: "active",
    },
    {
      id: "hw_06",
      subjectId: "subj_bca156",
      title: "Principles of Management Organizational Structure Case Study",
      description: "Analyze the management structure and decision-making framework of a modern tech organization.",
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
    submittedAt: new Date("2026-08-04T14:30:00.000Z"),
    grade: "A+",
    score: 95,
    feedback: "Excellent BCNF dependency preservation analysis and clean ER diagram.",
    gradedBy: "tch_rajesh_01",
    gradedAt: new Date("2026-08-06T10:00:00.000Z"),
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
    submittedAt: new Date("2026-08-03T16:00:00.000Z"),
    grade: "A+",
    score: 98,
    feedback: "Flawless schema design and clear indexing explanation.",
    gradedBy: "tch_rajesh_01",
    gradedAt: new Date("2026-08-06T10:05:00.000Z"),
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
    submittedAt: new Date("2026-08-05T20:00:00.000Z"),
    grade: "B+",
    score: 78,
    feedback: "Good effort; missed 3NF transitive dependency check in Patient table.",
    gradedBy: "tch_rajesh_01",
    gradedAt: new Date("2026-08-06T10:15:00.000Z"),
  });

  await db.insert(assignmentSubmissions).values({
    id: "sub_hw1_std_sneha",
    homeworkId: "hw_01",
    studentId: "std_sneha_04",
    content: "Initial ER diagram draft and decomposition tables.",
    fileUrl: "https://classroom.os/submissions/sneha-dbms-hw1.pdf",
    fileName: "sneha-dbms-hw1.pdf",
    fileSize: 648576,
    status: "graded",
    submittedAt: new Date("2026-08-05T22:00:00.000Z"),
    grade: "C+",
    score: 65,
    feedback: "Diagram incomplete; normalization steps require more mathematical rigor.",
    gradedBy: "tch_rajesh_01",
    gradedAt: new Date("2026-08-06T10:30:00.000Z"),
  });

  // Late submission for hw_02
  await db.insert(assignmentSubmissions).values({
    id: "sub_hw2_std_dipen",
    homeworkId: "hw_02",
    studentId: "std_dipen_07",
    content: "C simulator code for CPU scheduling algorithms.",
    fileUrl: "https://classroom.os/submissions/dipen-os-sim.zip",
    fileName: "dipen-os-sim.zip",
    fileSize: 450000,
    status: "late",
    submittedAt: new Date("2026-08-13T11:00:00.000Z"),
    grade: "B-",
    score: 70,
    feedback: "Algorithm logic is correct; 10-point deduction applied for late submission.",
    gradedBy: "tch_sunita_02",
    gradedAt: new Date("2026-08-14T09:00:00.000Z"),
  });

  // Draft submission for hw_03
  await db.insert(assignmentSubmissions).values({
    id: "sub_hw3_std_rohan",
    homeworkId: "hw_03",
    studentId: "std_rohan_03",
    content: "Draft implementation of Next.js 16 server actions form. Working on validation...",
    status: "draft",
  });

  // Draft submission for hw_04
  await db.insert(assignmentSubmissions).values({
    id: "sub_hw4_std_puja",
    homeworkId: "hw_04",
    studentId: "std_puja_06",
    content: "Drafted component hierarchy and numerical convergence equations.",
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
    submittedAt: new Date("2026-08-15T08:30:00.000Z"),
  });

  // Submitted submission for hw_03 by Niraj
  await db.insert(assignmentSubmissions).values({
    id: "sub_hw3_std_niraj",
    homeworkId: "hw_03",
    studentId: "std_niraj_05",
    content: "Submitted repository link and walkthrough video for React 19 Task Manager.",
    fileUrl: "https://classroom.os/submissions/niraj-web-hw3.zip",
    fileName: "niraj-web-hw3.zip",
    fileSize: 1848576,
    status: "submitted",
    submittedAt: new Date("2026-08-15T09:15:00.000Z"),
  });

  // 12. Seed Exams & Exam Results (3 Exams x 8 Students = 24 Results)
  console.log("📝 Seeding Exams & 24 Exam Results...");
  const examsData = [
    {
      id: "exam_01",
      subjectId: "subj_bca153",
      title: "OOP in Java Unit Test 1 (Classes & Objects)",
      examType: "unit_test" as const,
      totalMarks: 20,
      passMarks: 8,
      examDate: new Date("2026-08-03T07:00:00.000Z"),
      startTime: "07:00",
      endTime: "08:00",
      room: "Lab 1",
    },
    {
      id: "exam_02",
      subjectId: "subj_bca151",
      title: "Discrete Structure Mid-Term Assessment",
      examType: "midterm" as const,
      totalMarks: 40,
      passMarks: 16,
      examDate: new Date("2026-08-09T07:00:00.000Z"),
      startTime: "07:00",
      endTime: "09:00",
      room: "Room 201",
    },
    {
      id: "exam_03",
      subjectId: "subj_bca152",
      title: "Microprocessor & Computer Architecture Lab Assessment",
      examType: "practical" as const,
      totalMarks: 25,
      passMarks: 10,
      examDate: new Date("2026-08-13T10:30:00.000Z"),
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
      isAbsent: false,
      remarks: r.remarks,
    });
  }

  const exam2Results = [
    { studentId: "std_kriti_08", marks: 39, remarks: "Excellent grasp of OS scheduling and virtual memory" },
    { studentId: "std_aarav_cr", marks: 36, remarks: "Very strong analysis of deadlock avoidance" },
    { studentId: "std_bipana_02", marks: 34, remarks: "Well structured answers on synchronization" },
    { studentId: "std_niraj_05", marks: 30, remarks: "Good understanding of memory management" },
    { studentId: "std_rohan_03", marks: 26, remarks: "Average performance in scheduling problems" },
    { studentId: "std_puja_06", marks: 22, remarks: "Need more practice on page replacement algorithms" },
    { studentId: "std_sneha_04", marks: 17, remarks: "Barely passed; review process synchronization" },
    { studentId: "std_dipen_07", marks: 14, remarks: "Failed — comprehensive revision required" },
  ];

  for (const r of exam2Results) {
    await db.insert(examResults).values({
      id: `res_ex2_${r.studentId}`,
      examId: "exam_02",
      studentId: r.studentId,
      obtainedMarks: r.marks,
      isAbsent: false,
      remarks: r.remarks,
    });
  }

  const exam3Results = [
    { studentId: "std_kriti_08", marks: 25, remarks: "Perfect fullstack React 19 and Next.js practical implementation" },
    { studentId: "std_aarav_cr", marks: 24, remarks: "Clean Server Actions architecture and state management" },
    { studentId: "std_bipana_02", marks: 22, remarks: "Great UI components and Zod schema validations" },
    { studentId: "std_niraj_05", marks: 20, remarks: "Good database queries and client integration" },
    { studentId: "std_rohan_03", marks: 18, remarks: "Working app with minor styling issues" },
    { studentId: "std_puja_06", marks: 16, remarks: "Basic functionality implemented" },
    { studentId: "std_sneha_04", marks: 13, remarks: "Partial implementation of server actions" },
    { studentId: "std_dipen_07", marks: 11, remarks: "Pass; missing database constraint handling" },
  ];

  for (const r of exam3Results) {
    await db.insert(examResults).values({
      id: `res_ex3_${r.studentId}`,
      examId: "exam_03",
      studentId: r.studentId,
      obtainedMarks: r.marks,
      isAbsent: false,
      remarks: r.remarks,
    });
  }

  // 13. Seed Resources (8 Items)
  console.log("📁 Seeding Resources...");
  const resourcesData = [
    { id: "res_01", subjectId: "subj_bca153", title: "TU BCA 2nd Sem Complete OOP in Java Syllabus & Past Questions", description: "Official Tribhuvan University syllabus and past board exam questions.", fileUrl: "https://classroom.os/resources/java-syllabus.pdf", fileType: "pdf", fileSize: 2400000, uploadedBy: "tch_ashish_06" },
    { id: "res_02", subjectId: "subj_bca151", title: "Discrete Structure Set Theory & Logic Slide Deck", description: "Comprehensive lecture slides covering sets, logic, and proof techniques.", fileUrl: "https://classroom.os/resources/ds-slides.pdf", fileType: "pdf", fileSize: 5100000, uploadedBy: "tch_nikunja_05" },
    { id: "res_03", subjectId: "subj_bca152", title: "8085 Microprocessor Pin Diagram & Architecture Reference", description: "Step-by-step diagram and reference manual for 8085 architecture.", fileUrl: "https://classroom.os/resources/microprocessor-manual.pdf", fileType: "pdf", fileSize: 3800000, uploadedBy: "tch_saddam_09" },
    { id: "res_04", subjectId: "subj_bca154", title: "Mathematics II Calculus Formula & Derivative Guide", description: "Handy formula sheet for limits, derivatives, and anti-derivatives.", fileUrl: "https://classroom.os/resources/math2-formulas.pdf", fileType: "pdf", fileSize: 1200000, uploadedBy: "tch_mohit_07" },
    { id: "res_05", subjectId: "subj_bca155", title: "UX/UI Design Principles & Figma Layout Guidelines", description: "Design guidelines for typography, spacing, and interaction patterns.", fileUrl: "https://classroom.os/resources/uiux-guidelines.pdf", fileType: "pdf", fileSize: 850000, uploadedBy: "tch_sudeep_08" },
    { id: "res_06", subjectId: "subj_bca156", title: "Principles of Management Case Study Analysis Notes", description: "Case studies on planning, organizing, and leadership styles.", fileUrl: "https://classroom.os/resources/management-notes.pdf", fileType: "pdf", fileSize: 4500000, uploadedBy: "tch_rajesh_01" },
  ];

  for (const res of resourcesData) {
    await db.insert(resources).values(res);
  }

  // 14. Seed Study Tasks (10 Items)
  console.log("📌 Seeding Study Tasks...");
  const studyTasksData = [
    { id: "task_01", studentId: "std_aarav_cr", subjectId: "subj_bca153", title: "Review OOP Java abstract classes before Unit Test 1", description: "Focus on interface contracts and method overriding.", dueDate: new Date("2026-08-19T00:00:00.000Z"), status: "in_progress" as const, priority: "high" as const },
    { id: "task_02", studentId: "std_aarav_cr", subjectId: "subj_bca151", title: "Solve Discrete Structure set theory problem set", description: "Complete Q1 to Q10 in textbook.", dueDate: new Date("2026-08-17T00:00:00.000Z"), status: "pending" as const, priority: "high" as const },
    { id: "task_03", studentId: "std_bipana_02", subjectId: "subj_bca152", title: "Draw 8085 pin diagram & bus system", description: "Review register organization and ALU control signals.", dueDate: new Date("2026-08-18T00:00:00.000Z"), status: "completed" as const, priority: "medium" as const },
    { id: "task_04", studentId: "std_rohan_03", subjectId: "subj_bca154", title: "Practice calculus derivative numericals", description: "Work through past board exam calculus problems.", dueDate: new Date("2026-08-20T00:00:00.000Z"), status: "in_progress" as const, priority: "high" as const },
    { id: "task_05", studentId: "std_sneha_04", subjectId: "subj_bca155", title: "Figma mobile wireframe design", description: "Sketch layout grid and visual hierarchy.", dueDate: new Date("2026-08-21T00:00:00.000Z"), status: "pending" as const, priority: "medium" as const },
    { id: "task_06", studentId: "std_niraj_05", subjectId: "subj_bca156", title: "Read Principles of Management Chapter 2 on Planning", description: "Prepare notes on decision making processes.", dueDate: new Date("2026-08-16T00:00:00.000Z"), status: "completed" as const, priority: "medium" as const },
  ];

  for (const st of studyTasksData) {
    await db.insert(studyTasks).values(st);
  }

  // 15. Seed Notices, Events & Notifications
  console.log("📢 Seeding Notices, Events & 12 Notifications...");
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

  await db.insert(notices).values({
    id: "notice_03",
    title: "Mid-Term Examination Result Publication & Grade Review",
    content: "Mid-term results have been published on the student portal. Grade disputes must be submitted within 7 days.",
    isPinned: false,
    expiresAt: new Date("2026-08-28T00:00:00.000Z"),
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

  await db.insert(events).values({
    id: "event_02",
    title: "Pre-Board Examination Week",
    description: "Comprehensive mock examinations covering the full TU curriculum.",
    eventDate: new Date("2026-09-14T07:00:00.000Z"),
    startTime: "07:00",
    endTime: "10:00",
    eventType: "Examination",
    location: "Exam Hall A & B",
  });

  await db.insert(events).values({
    id: "event_03",
    title: "Inter-Faculty Sports Week 2026",
    description: "Annual sports tournament featuring football, basketball, and table tennis.",
    eventDate: new Date("2026-09-28T08:00:00.000Z"),
    startTime: "08:00",
    endTime: "16:00",
    eventType: "Sports",
    location: "College Ground",
  });

  const notificationsData = [
    { id: "notif_01", userId: "usr_student_aarav", title: "Assignment 1 Graded", message: "Your submission for 'ER Modeling & BCNF Normalization' has been graded: 95/100 (A+).", type: "assignment" as const, link: "/homework", isRead: false },
    { id: "notif_02", userId: "usr_student_kriti", title: "Assignment 1 Graded", message: "Your submission for 'ER Modeling & BCNF Normalization' has been graded: 98/100 (A+).", type: "assignment" as const, link: "/homework", isRead: true },
    { id: "notif_03", userId: "usr_student_rohan", title: "Assignment 1 Graded", message: "Your submission for 'ER Modeling & BCNF Normalization' has been graded: 78/100 (B+).", type: "assignment" as const, link: "/homework", isRead: false },
    { id: "notif_04", userId: "usr_student_dipen", title: "Late Assignment Graded", message: "Your submission for 'CPU Scheduling Simulator' has been graded: 70/100 (B-).", type: "assignment" as const, link: "/homework", isRead: true },
    { id: "notif_05", userId: "usr_student_sneha", title: "Attendance Warning (Danger Zone)", message: "Your overall attendance is 66.7%, which is below the TU 80% mandatory threshold. You need 30 consecutive attended classes to recover.", type: "attendance" as const, link: "/attendance", isRead: false },
    { id: "notif_06", userId: "usr_student_dipen", title: "Attendance Warning (Danger Zone)", message: "Your overall attendance is 55.6%, which is below the TU 80% mandatory threshold. Immediate recovery action required.", type: "attendance" as const, link: "/attendance", isRead: false },
    { id: "notif_07", userId: "usr_student_rohan", title: "Attendance Notice (Caution Zone)", message: "Your overall attendance is at 80.0% (0 missable buffer). Missing further classes will push you into the Danger Zone.", type: "attendance" as const, link: "/attendance", isRead: false },
    { id: "notif_08", userId: "usr_student_aarav", title: "New Exam Scheduled", message: "Web Technology II Practical Lab Assessment scheduled for 2026-08-13 in Lab 2.", type: "exam" as const, link: "/subjects", isRead: true },
    { id: "notif_09", userId: "usr_student_bipana", title: "Assignment Due Soon", message: "React 19 Server Actions Task Management System is due in 3 days.", type: "assignment" as const, link: "/homework", isRead: false },
    { id: "notif_10", userId: "usr_student_sneha", title: "Attendance Correction Approved", message: "Your attendance dispute for Session 10 has been approved and updated to Present.", type: "correction_request" as const, link: "/attendance", isRead: true },
    { id: "notif_11", userId: "usr_student_rohan", title: "Attendance Correction Rejected", message: "Your attendance dispute for Session 20 was rejected: arrival beyond 15-minute grace period.", type: "correction_request" as const, link: "/attendance", isRead: false },
    { id: "notif_12", userId: "usr_admin_01", title: "System Maintenance Notice", message: "Database seeding and schema verification completed successfully with 0 integrity violations.", type: "system" as const, link: "/admin/accounts", isRead: true },
  ];

  for (const n of notificationsData) {
    await db.insert(notifications).values(n);
  }

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
    reviewedAt: new Date("2026-07-29T10:00:00.000Z"),
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
    reviewedAt: new Date("2026-08-03T11:30:00.000Z"),
  });

  await db.insert(attendanceCorrectionRequests).values({
    id: "att_corr_03",
    attendanceId: "att_sess_044_std_puja",
    studentId: "std_puja_06",
    requestedStatus: "excused" as const,
    reason: "Participating in official inter-college debate competition on behalf of college.",
    status: "pending" as const,
  });
}

seed().catch((err) => {
  console.error("❌ Seeding failed:", err);
  process.exit(1);
});
