import { config } from "dotenv";
config({ path: ".env.local" });
config();

import { db } from "../../src/db/client";
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
} from "../../src/db/schema";

async function main() {
  const tables = [
    { name: "attendanceCorrectionRequests", tbl: attendanceCorrectionRequests },
    { name: "assignmentSubmissions", tbl: assignmentSubmissions },
    { name: "examResults", tbl: examResults },
    { name: "notifications", tbl: notifications },
    { name: "studyTasks", tbl: studyTasks },
    { name: "resources", tbl: resources },
    { name: "courseMaterials", tbl: courseMaterials },
    { name: "courseChapters", tbl: courseChapters },
    { name: "courseUnits", tbl: courseUnits },
    { name: "lectureLogs", tbl: lectureLogs },
    { name: "attendance", tbl: attendance },
    { name: "homework", tbl: homework },
    { name: "classSessions", tbl: classSessions },
    { name: "exams", tbl: exams },
    { name: "weeklyRoutine", tbl: weeklyRoutine },
    { name: "enrollments", tbl: enrollments },
    { name: "studentProfiles", tbl: studentProfiles },
    { name: "students", tbl: students },
    { name: "subjects", tbl: subjects },
    { name: "teachers", tbl: teachers },
    { name: "users", tbl: users },
    { name: "notices", tbl: notices },
    { name: "events", tbl: events },
  ];

  for (const t of tables) {
    try {
      await db.delete(t.tbl);
      console.log(`Deleted ${t.name} OK`);
    } catch (e: any) {
      console.error(`Failed to delete ${t.name}:`, e.message);
    }
  }
}

main().catch(console.error);
