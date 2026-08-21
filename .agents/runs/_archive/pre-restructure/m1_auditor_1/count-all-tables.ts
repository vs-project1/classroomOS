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
import { count } from "drizzle-orm";

async function main() {
  const tables = {
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
  };

  const results: Record<string, number> = {};
  for (const [name, tbl] of Object.entries(tables)) {
    const [res] = await db.select({ value: count() }).from(tbl);
    results[name] = res.value;
  }
  console.log("Current Database Table Counts:\n", JSON.stringify(results, null, 2));
}

main().catch(console.error);
