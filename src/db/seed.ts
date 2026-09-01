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

  try {
    await seedAll();
  } catch (err) {
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
  const adminEmail = process.env.ADMIN_EMAIL || "admin@classroom.edu.np";
  const adminPassword = process.env.ADMIN_PASSWORD || "AdminPassword123!";

  const defaultAdminPass = hashPassword(adminPassword);
  const defaultTeacherPass = hashPassword("TeacherPassword123!");
  const defaultTempPass = hashPassword("TempPassword123!");
  const defaultStudentPass = hashPassword("StudentPassword123!");

  const usersData = [
    {
      id: "usr_admin_01",
      email: adminEmail,
      passwordHash: defaultAdminPass,
      role: "ADMIN" as const,
      mustChangePassword: false,
      isActive: true,
    },
    {
      id: "usr_admin_os",
      email: "admin@classroom.os",
      passwordHash: defaultAdminPass,
      role: "ADMIN" as const,
      mustChangePassword: false,
      isActive: true,
    },
    {
      id: "usr_student_01",
      email: "student@classroom.edu.np",
      passwordHash: defaultStudentPass,
      role: "STUDENT" as const,
      mustChangePassword: true,
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
      id: "usr_teacher_nikunja",
      email: "nikunja@classroom.os",
      passwordHash: defaultTeacherPass,
      role: "TEACHER" as const,
      mustChangePassword: false,
      isActive: true,
    },
    {
      id: "usr_teacher_ashish",
      email: "ashish@classroom.os",
      passwordHash: defaultTeacherPass,
      role: "TEACHER" as const,
      mustChangePassword: false,
      isActive: true,
    },
    {
      id: "usr_teacher_mohit",
      email: "mohit@classroom.os",
      passwordHash: defaultTeacherPass,
      role: "TEACHER" as const,
      mustChangePassword: false,
      isActive: true,
    },
    {
      id: "usr_teacher_sudeep",
      email: "sudeep@classroom.os",
      passwordHash: defaultTeacherPass,
      role: "TEACHER" as const,
      mustChangePassword: false,
      isActive: true,
    },
    {
      id: "usr_teacher_saddam",
      email: "saddam@classroom.os",
      passwordHash: defaultTeacherPass,
      role: "TEACHER" as const,
      mustChangePassword: false,
      isActive: true,
    },
  ];

  for (const u of usersData) {
    await db.insert(users).values(u);
  }

  // 3. Seed Teachers (Real 2nd Semester Faculty)
  console.log("👨‍🏫 Seeding Teachers...");
  const teachersData = [
    {
      id: "tch_rajesh_01",
      name: "Prof. Rajesh Shrestha",
      email: "rajesh.shrestha@classroom.os",
      phone: "+977-9841234567",
      faculties: ["BCA"],
      semesters: ["2nd Semester"],
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

  // 4. Seed Real 2nd Semester Students (35 Students)
  console.log("🎓 Seeding Real 2nd Semester Students...");
  const rawStudents = [
    { id: "std_001", name: "Aakriti Thapa", roll: "2025-BCA-001", email: "aakriti.thapa@classroom.os", phone: "+977-9851000001" },
    { id: "std_002", name: "Aashish Khatri", roll: "2025-BCA-002", email: "aashish.khatri@classroom.os", phone: "+977-9851000002", role: "CR" as const },
    { id: "std_003", name: "Aayush Purbachhane", roll: "2025-BCA-003", email: "aayush.purbachhane@classroom.os", phone: "+977-9851000003" },
    { id: "std_004", name: "Abhishek Acharya", roll: "2025-BCA-004", email: "abhishek.acharya@classroom.os", phone: "+977-9851000004" },
    { id: "std_005", name: "Anish Karki", roll: "2025-BCA-005", email: "anish.karki@classroom.os", phone: "+977-9851000005" },
    { id: "std_006", name: "Arnab Shrestha", roll: "2025-BCA-006", email: "arnab.shrestha@classroom.os", phone: "+977-9851000006" },
    { id: "std_007", name: "Arpan Rai", roll: "2025-BCA-007", email: "arpan.rai@classroom.os", phone: "+977-9851000007" },
    { id: "std_008", name: "Barshika Magar", roll: "2025-BCA-008", email: "barshika.magar@classroom.os", phone: "+977-9851000008" },
    { id: "std_009", name: "Bikram Chaudhary", roll: "2025-BCA-009", email: "bikram.chaudhary@classroom.os", phone: "+977-9851000009" },
    { id: "std_010", name: "Bishan Budhathoki", roll: "2025-BCA-010", email: "bishan.budhathoki@classroom.os", phone: "+977-9851000010" },
    { id: "std_011", name: "Binayak Bdr. KC", roll: "2025-BCA-011", email: "binayak.kc@classroom.os", phone: "+977-9851000011" },
    { id: "std_012", name: "Bishal Balami", roll: "2025-BCA-012", email: "bishal.balami@classroom.os", phone: "+977-9851000012" },
    { id: "std_013", name: "Darpan Gurung", roll: "2025-BCA-013", email: "darpan.gurung@classroom.os", phone: "+977-9851000013" },
    { id: "std_014", name: "Durga Bdr. Thapa", roll: "2025-BCA-014", email: "durga.thapa@classroom.os", phone: "+977-9851000014" },
    { id: "std_015", name: "Grishma Khatiwada", roll: "2025-BCA-015", email: "grishma.khatiwada@classroom.os", phone: "+977-9851000015" },
    { id: "std_016", name: "Jenith Gurung", roll: "2025-BCA-016", email: "jenith.gurung@classroom.os", phone: "+977-9851000016" },
    { id: "std_017", name: "Keshang Tamang", roll: "2025-BCA-017", email: "keshang.tamang@classroom.os", phone: "+977-9851000017" },
    { id: "std_018", name: "Kushal Neupane", roll: "2025-BCA-018", email: "kushal.neupane@classroom.os", phone: "+977-9851000018" },
    { id: "std_019", name: "Lakpa Syantang", roll: "2025-BCA-019", email: "lakpa.syantang@classroom.os", phone: "+977-9851000019" },
    { id: "std_020", name: "Lakpa Tamang", roll: "2025-BCA-020", email: "lakpa.tamang@classroom.os", phone: "+977-9851000020" },
    { id: "std_021", name: "Nishan Joshi", roll: "2025-BCA-021", email: "nishan.joshi@classroom.os", phone: "+977-9851000021" },
    { id: "std_022", name: "Pabina Tamang", roll: "2025-BCA-022", email: "pabina.tamang@classroom.os", phone: "+977-9851000022" },
    { id: "std_023", name: "Prakriti Dhamala", roll: "2025-BCA-023", email: "prakriti.dhamala@classroom.os", phone: "+977-9851000023" },
    { id: "std_024", name: "Pranish Ghatani", roll: "2025-BCA-024", email: "pranish.ghatani@classroom.os", phone: "+977-9851000024" },
    { id: "std_025", name: "Pukar Parajuli", roll: "2025-BCA-025", email: "pukar.parajuli@classroom.os", phone: "+977-9851000025" },
    { id: "std_026", name: "Rarak Singh Moktan", roll: "2025-BCA-026", email: "rarak.moktan@classroom.os", phone: "+977-9851000026" },
    { id: "std_027", name: "Samir Balampaki Magar", roll: "2025-BCA-027", email: "samir.magar@classroom.os", phone: "+977-9851000027" },
    { id: "std_028", name: "Shishir Gautam", roll: "2025-BCA-028", email: "shishir.gautam@classroom.os", phone: "+977-9851000028" },
    { id: "std_029", name: "Saurabh Rai", roll: "2025-BCA-029", email: "saurabh.rai@classroom.os", phone: "+977-9851000029" },
    { id: "std_030", name: "Subhadra Pandey", roll: "2025-BCA-030", email: "subhadra.pandey@classroom.os", phone: "+977-9851000030" },
    { id: "std_031", name: "Sumi Lama", roll: "2025-BCA-031", email: "sumi.lama@classroom.os", phone: "+977-9851000031" },
    { id: "std_032", name: "Sunil Khatik", roll: "2025-BCA-032", email: "sunil.khatik@classroom.os", phone: "+977-9851000032" },
    { id: "std_033", name: "Tenchembi Sherpa", roll: "2025-BCA-033", email: "tenchembi.sherpa@classroom.os", phone: "+977-9851000033" },
    { id: "std_034", name: "Oshin Lama", roll: "2025-BCA-034", email: "oshin.lama@classroom.os", phone: "+977-9851000034" },
    { id: "std_035", name: "Ang Dawa Sherpa", roll: "2025-BCA-035", email: "angdawa.sherpa@classroom.os", phone: "+977-9851000035" },
  ];

  const studentUsersToInsert: Array<typeof users.$inferInsert> = [];
  const studentsToInsert: Array<typeof students.$inferInsert> = [];
  const studentProfilesToInsert: Array<typeof studentProfiles.$inferInsert> = [];

  for (const s of rawStudents) {
    const userId = `usr_${s.id}`;
    studentUsersToInsert.push({
      id: userId,
      email: s.email,
      passwordHash: defaultStudentPass,
      role: (s as any).role || ("STUDENT" as const),
      mustChangePassword: true,
      isActive: true,
    });

    studentsToInsert.push({
      id: s.id,
      name: s.name,
      rollNumber: s.roll,
      email: s.email,
      phone: s.phone,
      faculty: "BCA",
      semester: "2nd Semester",
    });

    studentProfilesToInsert.push({
      id: `sp_${s.id}`,
      userId,
      rollNumber: s.roll,
      faculty: "BCA",
      semester: 2,
      section: "A",
      batchYear: 2025,
      phone: s.phone,
    });
  }

  await db.insert(users).values(studentUsersToInsert);
  await db.insert(students).values(studentsToInsert);
  await db.insert(studentProfiles).values(studentProfilesToInsert);

  // 5. Seed Subjects (Complete 8-Semester BCA Curriculum)
  console.log("📚 Seeding Subjects...");
  const subjectsData = [
    // --- First Semester (I) ---
    { id: "subj_bca101", name: "Computer Fundamentals and Applications", slug: slugify("Computer Fundamentals and Applications"), code: "BCA 101", semester: "I", teacherId: "tch_rajesh_01" },
    { id: "subj_bca102", name: "Programming in C", slug: slugify("Programming in C"), code: "BCA 102", semester: "I", teacherId: "tch_ashish_06" },
    { id: "subj_bca103", name: "Digital Logic", slug: slugify("Digital Logic"), code: "BCA 103", semester: "I", teacherId: "tch_saddam_09" },
    { id: "subj_bca104", name: "Mathematics I", slug: slugify("Mathematics I"), code: "BCA 104", semester: "I", teacherId: "tch_mohit_07" },
    { id: "subj_bca105", name: "Professional Communication and Ethics", slug: slugify("Professional Communication and Ethics"), code: "BCA 105", semester: "I", teacherId: "tch_rajesh_01" },
    { id: "subj_bca106", name: "Hardware Workshop", slug: slugify("Hardware Workshop"), code: "BCA 106", semester: "I", teacherId: "tch_saddam_09" },

    // --- Second Semester (II) ---
    { id: "subj_bca151", name: "Discrete Structure", slug: slugify("Discrete Structure"), code: "BCA 151", semester: "II", teacherId: "tch_nikunja_05" },
    { id: "subj_bca152", name: "Microprocessor and Computer Architecture", slug: slugify("Microprocessor and Computer Architecture"), code: "BCA 152", semester: "II", teacherId: "tch_saddam_09" },
    { id: "subj_bca153", name: "OOP in Java", slug: slugify("OOP in Java"), code: "BCA 153", semester: "II", teacherId: "tch_ashish_06" },
    { id: "subj_bca154", name: "Mathematics II", slug: slugify("Mathematics II"), code: "BCA 154", semester: "II", teacherId: "tch_mohit_07" },
    { id: "subj_bca155", name: "UX/UI Design", slug: slugify("UX/UI Design"), code: "BCA 155", semester: "II", teacherId: "tch_sudeep_08" },
    { id: "subj_bca156", name: "Principles of Management", slug: slugify("Principles of Management"), code: "BCA 156", semester: "II", teacherId: "tch_rajesh_01" },

    // --- Third Semester (III) ---
    { id: "subj_bca201", name: "Data Structure and Algorithms", slug: slugify("Data Structure and Algorithms"), code: "BCA 201", semester: "III", teacherId: "tch_nikunja_05" },
    { id: "subj_bca202", name: "Database Management System (3rd)", slug: slugify("Database Management System 3rd"), code: "BCA 202", semester: "III", teacherId: "tch_rajesh_01" },
    { id: "subj_bca203", name: "Web Technology I", slug: slugify("Web Technology I"), code: "BCA 203", semester: "III", teacherId: "tch_sudeep_08" },
    { id: "subj_bca204", name: "System Analysis and Design", slug: slugify("System Analysis and Design"), code: "BCA 204", semester: "III", teacherId: "tch_ashish_06" },
    { id: "subj_bca205", name: "Probability and Statistics", slug: slugify("Probability and Statistics"), code: "BCA 205", semester: "III", teacherId: "tch_mohit_07" },
    { id: "subj_bca206", name: "Applied Economics", slug: slugify("Applied Economics"), code: "BCA 206", semester: "III", teacherId: "tch_rajesh_01" },

    // --- Fourth Semester (IV) ---
    { id: "subj_dbms", name: "Database Management System", slug: slugify("Database Management System"), code: "CACS251", semester: "IV", teacherId: "tch_rajesh_01" },
    { id: "subj_os", name: "Operating Systems", slug: slugify("Operating Systems"), code: "CACS252", semester: "IV", teacherId: "tch_saddam_09" },
    { id: "subj_web2", name: "Web Technology II", slug: slugify("Web Technology II"), code: "CACS253", semester: "IV", teacherId: "tch_sudeep_08" },
    { id: "subj_nm", name: "Numerical Methods", slug: slugify("Numerical Methods"), code: "CACS254", semester: "IV", teacherId: "tch_mohit_07" },
    { id: "subj_se", name: "Software Engineering", slug: slugify("Software Engineering"), code: "CACS255", semester: "IV", teacherId: "tch_ashish_06" },
    { id: "subj_bca254", name: "Python Programming", slug: slugify("Python Programming"), code: "BCA 254", semester: "IV", teacherId: "tch_nikunja_05" },
    { id: "subj_bca256", name: "Project I", slug: slugify("Project I"), code: "BCA 256", semester: "IV", teacherId: "tch_rajesh_01" },

    // --- Fifth Semester (V) ---
    { id: "subj_bca301", name: "Computer Network", slug: slugify("Computer Network"), code: "BCA 301", semester: "V", teacherId: "tch_saddam_09" },
    { id: "subj_bca302", name: "Artificial Intelligence", slug: slugify("Artificial Intelligence"), code: "BCA 302", semester: "V", teacherId: "tch_nikunja_05" },
    { id: "subj_bca303", name: "Advance Java Programming", slug: slugify("Advance Java Programming"), code: "BCA 303", semester: "V", teacherId: "tch_ashish_06" },
    { id: "subj_bca304", name: "MIS and e-Business", slug: slugify("MIS and e-Business"), code: "BCA 304", semester: "V", teacherId: "tch_rajesh_01" },
    { id: "subj_bca305", name: "Society and Technology", slug: slugify("Society and Technology"), code: "BCA 305", semester: "V", teacherId: "tch_mohit_07" },
    { id: "subj_bca306", name: "Project II", slug: slugify("Project II"), code: "BCA 306", semester: "V", teacherId: "tch_rajesh_01" },

    // --- Sixth Semester (VI) ---
    { id: "subj_bca351", name: "Computer Graphics and Animation", slug: slugify("Computer Graphics and Animation"), code: "BCA 351", semester: "VI", teacherId: "tch_sudeep_08" },
    { id: "subj_bca352", name: "Mobile Programming", slug: slugify("Mobile Programming"), code: "BCA 352", semester: "VI", teacherId: "tch_ashish_06" },
    { id: "subj_bca353", name: "Cryptography and Network Security", slug: slugify("Cryptography and Network Security"), code: "BCA 353", semester: "VI", teacherId: "tch_saddam_09" },
    { id: "subj_bca354", name: "Technical Writing", slug: slugify("Technical Writing"), code: "BCA 354", semester: "VI", teacherId: "tch_mohit_07" },
    { id: "subj_bca355", name: "Distributed System", slug: slugify("Distributed System"), code: "BCA 355", semester: "VI", teacherId: "tch_nikunja_05" },
    { id: "subj_bca356", name: "Project III", slug: slugify("Project III"), code: "BCA 356", semester: "VI", teacherId: "tch_rajesh_01" },

    // --- Seventh Semester (VII) ---
    { id: "subj_bca401", name: "Cyber Security and Ethical Hacking", slug: slugify("Cyber Security and Ethical Hacking"), code: "BCA 401", semester: "VII", teacherId: "tch_saddam_09" },
    { id: "subj_bca402", name: "Software Project Management", slug: slugify("Software Project Management"), code: "BCA 402", semester: "VII", teacherId: "tch_rajesh_01" },
    { id: "subj_bca403", name: "Financial Accounting", slug: slugify("Financial Accounting"), code: "BCA 403", semester: "VII", teacherId: "tch_mohit_07" },
    { id: "subj_bca404", name: "Project IV", slug: slugify("Project IV"), code: "BCA 404", semester: "VII", teacherId: "tch_rajesh_01" },
    { id: "subj_bca405", name: "Elective I", slug: slugify("Elective I"), code: "BCA 405", semester: "VII", teacherId: "tch_nikunja_05" },
    { id: "subj_bca406", name: "Elective II", slug: slugify("Elective II"), code: "BCA 406", semester: "VII", teacherId: "tch_ashish_06" },

    // --- Eighth Semester (VIII) ---
    { id: "subj_bca451", name: "Cloud Computing", slug: slugify("Cloud Computing"), code: "BCA 451", semester: "VIII", teacherId: "tch_saddam_09" },
    { id: "subj_bca452", name: "Internship", slug: slugify("Internship"), code: "BCA 452", semester: "VIII", teacherId: "tch_rajesh_01" },
    { id: "subj_bca453", name: "Elective III", slug: slugify("Elective III"), code: "BCA 453", semester: "VIII", teacherId: "tch_sudeep_08" },
    { id: "subj_bca454", name: "Elective IV", slug: slugify("Elective IV"), code: "BCA 454", semester: "VIII", teacherId: "tch_mohit_07" },
  ];

  await db.insert(subjects).values(subjectsData);

  // 5. Seed Enrollments (35 Real 2nd Semester Students x 6 Core Subjects)
  console.log("📝 Seeding Enrollments (35 Students x 6 Core 2nd Sem Subjects)...");
  const secondSemSubjects = subjectsData.filter((s) => s.semester === "II");
  const enrollmentsToInsert: Array<typeof enrollments.$inferInsert> = [];

  for (const s of rawStudents) {
    for (const subj of secondSemSubjects) {
      enrollmentsToInsert.push({
        id: `enr_${s.id}_${subj.id}`,
        studentId: s.id,
        subjectId: subj.id,
        semester: 2,
        enrolledAt: new Date("2026-07-20T00:00:00.000Z"),
      });
    }
  }

  await db.insert(enrollments).values(enrollmentsToInsert);

  // 6. Seed Weekly Routine (2nd Semester - 30 periods)
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

  // 8. Seed Course Units (2nd Semester)
  console.log("📖 Seeding Units...");
  const unitsData = [
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
}

seed().catch((err) => {
  console.error("❌ Seeding failed:", err);
  process.exit(1);
});
