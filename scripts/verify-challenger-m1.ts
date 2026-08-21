import { config } from "dotenv";
config({ path: ".env.local" });
config();

import { db } from "../src/db/client";
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
} from "../src/db/schema";
import { eq, sql } from "drizzle-orm";
import crypto from "node:crypto";

function verifyPassword(plainText: string, hash: string): boolean {
  const [salt, key] = hash.split(":");
  if (!salt || !key) return false;
  const derived = crypto.scryptSync(plainText, salt, 64);
  return derived.toString("hex") === key;
}

async function runEmpiricalChecks() {
  console.log("================================================================================");
  console.log("  CHALLENGER 2: EMPIRICAL SEEDER & DATASET VERIFICATION");
  console.log("================================================================================\n");

  let failureCount = 0;

  function assertCheck(name: string, condition: boolean, detail: string) {
    if (condition) {
      console.log(`  ✓ [PASS] ${name}: ${detail}`);
    } else {
      console.error(`  ✗ [FAIL] ${name}: ${detail}`);
      failureCount++;
    }
  }

  // 1. Table Counts
  console.log("📊 1. Verifying Row Counts across All 23 Tables...");
  const [usersCount] = await db.select({ count: sql<number>`count(*)` }).from(users);
  const [teachersCount] = await db.select({ count: sql<number>`count(*)` }).from(teachers);
  const [studentsCount] = await db.select({ count: sql<number>`count(*)` }).from(students);
  const [profilesCount] = await db.select({ count: sql<number>`count(*)` }).from(studentProfiles);
  const [subjectsCount] = await db.select({ count: sql<number>`count(*)` }).from(subjects);
  const [enrollmentsCount] = await db.select({ count: sql<number>`count(*)` }).from(enrollments);
  const [routineCount] = await db.select({ count: sql<number>`count(*)` }).from(weeklyRoutine);
  const [unitsCount] = await db.select({ count: sql<number>`count(*)` }).from(courseUnits);
  const [chaptersCount] = await db.select({ count: sql<number>`count(*)` }).from(courseChapters);
  const [materialsCount] = await db.select({ count: sql<number>`count(*)` }).from(courseMaterials);
  const [sessionsCount] = await db.select({ count: sql<number>`count(*)` }).from(classSessions);
  const [logsCount] = await db.select({ count: sql<number>`count(*)` }).from(lectureLogs);
  const [attendanceCount] = await db.select({ count: sql<number>`count(*)` }).from(attendance);
  const [homeworkCount] = await db.select({ count: sql<number>`count(*)` }).from(homework);
  const [submissionsCount] = await db.select({ count: sql<number>`count(*)` }).from(assignmentSubmissions);
  const [examsCount] = await db.select({ count: sql<number>`count(*)` }).from(exams);
  const [resultsCount] = await db.select({ count: sql<number>`count(*)` }).from(examResults);
  const [resourcesCount] = await db.select({ count: sql<number>`count(*)` }).from(resources);
  const [tasksCount] = await db.select({ count: sql<number>`count(*)` }).from(studyTasks);
  const [noticesCount] = await db.select({ count: sql<number>`count(*)` }).from(notices);
  const [eventsCount] = await db.select({ count: sql<number>`count(*)` }).from(events);
  const [notificationsCount] = await db.select({ count: sql<number>`count(*)` }).from(notifications);
  const [correctionsCount] = await db.select({ count: sql<number>`count(*)` }).from(attendanceCorrectionRequests);

  assertCheck("Users Count", usersCount.count === 13, `Found ${usersCount.count} users (1 Admin + 4 Teachers + 1 CR + 7 Students)`);
  assertCheck("Teachers Count", teachersCount.count === 4, `Found ${teachersCount.count} teachers`);
  assertCheck("Students Count", studentsCount.count === 8, `Found ${studentsCount.count} students`);
  assertCheck("Student Profiles Count", profilesCount.count === 8, `Found ${profilesCount.count} profiles (1:1 with users)`);
  assertCheck("Subjects Count", subjectsCount.count === 5, `Found ${subjectsCount.count} subjects (DBMS, OS, Web II, NM, SE)`);
  assertCheck("Enrollments Count", enrollmentsCount.count === 40, `Found ${enrollmentsCount.count} enrollments (8 students x 5 subjects)`);
  assertCheck("Weekly Routine Count", routineCount.count === 15, `Found ${routineCount.count} periods (5 days x 3 slots)`);
  assertCheck("Course Units Count", unitsCount.count === 4, `Found ${unitsCount.count} units`);
  assertCheck("Course Chapters Count", chaptersCount.count === 4, `Found ${chaptersCount.count} chapters`);
  assertCheck("Course Materials Count", materialsCount.count === 2, `Found ${materialsCount.count} materials`);
  assertCheck("Class Sessions Count", sessionsCount.count === 45, `Found ${sessionsCount.count} sessions (3 weeks x 15 periods)`);
  assertCheck("Lecture Logs Count", logsCount.count === 45, `Found ${logsCount.count} lecture logs (1:1 with sessions)`);
  assertCheck("Attendance Count", attendanceCount.count === 360, `Found ${attendanceCount.count} attendance records (45 sessions x 8 students)`);
  assertCheck("Homework Count", homeworkCount.count === 6, `Found ${homeworkCount.count} assignments`);
  assertCheck("Assignment Submissions Count", submissionsCount.count === 9, `Found ${submissionsCount.count} submissions`);
  assertCheck("Exams Count", examsCount.count === 3, `Found ${examsCount.count} exams`);
  assertCheck("Exam Results Count", resultsCount.count === 24, `Found ${resultsCount.count} exam results (3 exams x 8 students)`);
  assertCheck("Resources Count", resourcesCount.count === 8, `Found ${resourcesCount.count} resources`);
  assertCheck("Study Tasks Count", tasksCount.count === 10, `Found ${tasksCount.count} study tasks`);
  assertCheck("Notices Count", noticesCount.count === 3, `Found ${noticesCount.count} notices`);
  assertCheck("Events Count", eventsCount.count === 3, `Found ${eventsCount.count} events`);
  assertCheck("Notifications Count", notificationsCount.count === 12, `Found ${notificationsCount.count} notifications`);
  assertCheck("Attendance Correction Requests Count", correctionsCount.count === 3, `Found ${correctionsCount.count} correction requests`);

  // 2. Attendance Cohort Analysis (TU 80% Barometer Zones)
  console.log("\n📈 2. Verifying Attendance Barometer Cohorts...");
  const allAttendance = await db.select().from(attendance);
  const allStudents = await db.select().from(students);

  const studentAttendanceStats: Record<string, { present: number; late: number; excused: number; absent: number; total: number; percentage: number; name: string }> = {};

  for (const s of allStudents) {
    const records = allAttendance.filter((a) => a.studentId === s.id);
    const present = records.filter((a) => a.status === "present").length;
    const late = records.filter((a) => a.status === "late").length;
    const excused = records.filter((a) => a.status === "excused").length;
    const absent = records.filter((a) => a.status === "absent").length;
    const total = records.length;
    // Attended sessions under TU definition typically includes present and late
    const effectiveAttended = present + late;
    const percentage = total > 0 ? (effectiveAttended / total) * 100 : 0;

    studentAttendanceStats[s.id] = { present, late, excused, absent, total, percentage, name: s.name };
  }

  // Print attendance summary table
  console.log("\n  Student Attendance Summary:");
  console.log("  " + "-".repeat(90));
  console.log("  " + "ID".padEnd(16) + "Name".padEnd(20) + "Present".padEnd(10) + "Late".padEnd(8) + "Excused".padEnd(10) + "Absent".padEnd(10) + "Total".padEnd(8) + "Rate".padEnd(8) + "Zone");
  console.log("  " + "-".repeat(90));

  for (const [id, stats] of Object.entries(studentAttendanceStats)) {
    let zone = "UNKNOWN";
    if (stats.percentage >= 99.9) zone = "PERFECT (100%)";
    else if (stats.percentage >= 85) zone = "SAFE (85-95%)";
    else if (stats.percentage >= 75) zone = "CAUTION (75-80%)";
    else zone = "DANGER (<75%)";

    console.log(`  ${id.padEnd(16)}${stats.name.padEnd(20)}${stats.present.toString().padEnd(10)}${stats.late.toString().padEnd(8)}${stats.excused.toString().padEnd(10)}${stats.absent.toString().padEnd(10)}${stats.total.toString().padEnd(8)}${(stats.percentage.toFixed(1) + "%").padEnd(8)}${zone}`);
  }
  console.log("  " + "-".repeat(90) + "\n");

  // Verify specific student cohort expectations
  const kriti = studentAttendanceStats["std_kriti_08"];
  assertCheck("Zone 1 - Perfect (Kriti)", kriti && kriti.percentage === 100 && kriti.total === 45, `Kriti attendance: ${kriti?.percentage.toFixed(1)}% (${kriti?.present}/45)`);

  const aarav = studentAttendanceStats["std_aarav_cr"];
  assertCheck("Zone 2 - Safe (Aarav CR)", aarav && aarav.percentage >= 85 && aarav.percentage <= 95, `Aarav attendance: ${aarav?.percentage.toFixed(1)}% (${aarav?.present}P, ${aarav?.absent}A, ${aarav?.excused}E / 45)`);

  const bipana = studentAttendanceStats["std_bipana_02"];
  assertCheck("Zone 2 - Safe (Bipana)", bipana && bipana.percentage >= 85 && bipana.percentage <= 95, `Bipana attendance: ${bipana?.percentage.toFixed(1)}% (${bipana?.present}P, ${bipana?.late}L, ${bipana?.absent}A / 45)`);

  const niraj = studentAttendanceStats["std_niraj_05"];
  assertCheck("Zone 2 - Safe (Niraj)", niraj && niraj.percentage >= 85 && niraj.percentage <= 95, `Niraj attendance: ${niraj?.percentage.toFixed(1)}% (${niraj?.present}P, ${niraj?.late}L, ${niraj?.absent}A / 45)`);

  const rohan = studentAttendanceStats["std_rohan_03"];
  assertCheck("Zone 3 - Caution (Rohan)", rohan && rohan.percentage >= 75 && rohan.percentage <= 80, `Rohan attendance: ${rohan?.percentage.toFixed(1)}% (${rohan?.present}P, ${rohan?.late}L, ${rohan?.absent}A / 45)`);

  const puja = studentAttendanceStats["std_puja_06"];
  assertCheck("Zone 3 - Caution (Puja)", puja && puja.percentage >= 75 && puja.percentage <= 80, `Puja attendance: ${puja?.percentage.toFixed(1)}% (${puja?.present}P, ${puja?.late}L, ${puja?.absent}A / 45)`);

  const sneha = studentAttendanceStats["std_sneha_04"];
  assertCheck("Zone 4 - Danger (Sneha)", sneha && sneha.percentage >= 60 && sneha.percentage <= 70, `Sneha attendance: ${sneha?.percentage.toFixed(1)}% (${sneha?.present}P, ${sneha?.late}L, ${sneha?.absent}A / 45)`);

  const dipen = studentAttendanceStats["std_dipen_07"];
  assertCheck("Zone 4 - Danger (Dipen)", dipen && dipen.percentage >= 50 && dipen.percentage <= 60, `Dipen attendance: ${dipen?.percentage.toFixed(1)}% (${dipen?.present}P, ${dipen?.late}L, ${dipen?.absent}A / 45)`);

  // 3. Auth & Password Hashing Verification
  console.log("\n🔐 3. Verifying User Accounts & Scrypt Password Cryptography...");
  const allUsers = await db.select().from(users);

  const adminUser = allUsers.find((u) => u.role === "ADMIN");
  assertCheck("Admin Account Exists", !!adminUser && adminUser.email === "admin@classroom.os", `Admin: ${adminUser?.email}`);
  assertCheck("Admin Password Verifiable", !!adminUser && verifyPassword("AdminPassword123!", adminUser.passwordHash), "AdminPassword123! matches scrypt hash");
  assertCheck("Admin mustChangePassword=false", !!adminUser && adminUser.mustChangePassword === false, `mustChangePassword: ${adminUser?.mustChangePassword}`);

  const crUser = allUsers.find((u) => u.role === "CR");
  assertCheck("CR Account Exists", !!crUser && crUser.email === "aarav.joshi@classroom.os", `CR: ${crUser?.email}`);
  assertCheck("CR Password Verifiable", !!crUser && verifyPassword("TempPassword123!", crUser.passwordHash), "TempPassword123! matches scrypt hash");
  assertCheck("CR mustChangePassword=true (Quarantine Flow)", !!crUser && crUser.mustChangePassword === true, `mustChangePassword: ${crUser?.mustChangePassword}`);

  const teacherUsers = allUsers.filter((u) => u.role === "TEACHER");
  assertCheck("4 Teacher Accounts", teacherUsers.length === 4, `Found ${teacherUsers.length} teachers`);
  const teacherPassCheck = teacherUsers.every((t) => verifyPassword("TeacherPass123!", t.passwordHash));
  assertCheck("Teacher Passwords Verifiable", teacherPassCheck, "All teacher passwords match TeacherPass123!");

  const studentUsers = allUsers.filter((u) => u.role === "STUDENT");
  assertCheck("7 Student Accounts", studentUsers.length === 7, `Found ${studentUsers.length} student accounts (+ 1 CR = 8 total)`);
  const studentPassCheck = studentUsers.every((s) => verifyPassword("StudentPass123!", s.passwordHash));
  assertCheck("Student Passwords Verifiable", studentPassCheck, "All student passwords match StudentPass123!");

  // 4. Verification Summary
  console.log("\n================================================================================");
  if (failureCount === 0) {
    console.log("  🎉 ALL EMPIRICAL CHALLENGER CHECKS PASSED WITH 0 FAILURES!");
  } else {
    console.error(`  ❌ EMPIRICAL CHECKS FAILED: ${failureCount} failure(s) detected.`);
  }
  console.log("================================================================================\n");

  process.exit(failureCount > 0 ? 1 : 0);
}

runEmpiricalChecks().catch((err) => {
  console.error("Fatal error during empirical checks:", err);
  process.exit(1);
});
