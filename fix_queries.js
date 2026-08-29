
const fs = require("fs");
const path = "src/app/(student)/today/queries.ts";
let content = fs.readFileSync(path, "utf-8");

content = `import { and, asc, eq, gt, inArray, isNull, lte } from "drizzle-orm";
import { db } from "@/db";
import { assignmentSubmissions, enrollments, homework, subjects, studentProfiles } from "@/db/schema";
import { resolveCurrentStudent, requireAuth } from "@/lib/auth";
import { toRoman } from "@/lib/utils/roman";

export type TodayDeadline = {
  id: string;
  title: string;
  subjectName: string;
  dueDate: Date;
};

export async function getTodayDeadlines(): Promise<TodayDeadline[]> {
  const student = await resolveCurrentStudent();
  if (!student) return [];
  const user = await requireAuth(["STUDENT", "CR", "ADMIN", "TEACHER"]);

  const now = new Date();
  const horizon = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

  // 1. Try explicit enrollments
  let userEnrollments = await db.query.enrollments.findMany({
    where: eq(enrollments.studentId, student.id),
  });

  if (userEnrollments.length > 0) {
    return db
      .select({
        id: homework.id,
        title: homework.title,
        subjectName: subjects.name,
        dueDate: homework.dueDate,
      })
      .from(homework)
      .innerJoin(enrollments, eq(homework.subjectId, enrollments.subjectId))
      .innerJoin(subjects, eq(homework.subjectId, subjects.id))
      .leftJoin(
        assignmentSubmissions,
        and(
          eq(assignmentSubmissions.homeworkId, homework.id),
          eq(assignmentSubmissions.studentId, student.id),
          inArray(assignmentSubmissions.status, ["submitted", "graded", "late"])
        )
      )
      .where(
        and(
          eq(enrollments.studentId, student.id),
          eq(homework.status, "active"),
          gt(homework.dueDate, now),
          lte(homework.dueDate, horizon),
          isNull(assignmentSubmissions.id)
        )
      )
      .orderBy(asc(homework.dueDate))
      .limit(4);
  }

  // 2. Fallback to semester mapped subjects
  if (!user.studentProfileId) return [];
  
  const profile = await db.query.studentProfiles.findFirst({
    where: eq(studentProfiles.id, user.studentProfileId),
  });
  if (!profile || profile.semester == null) return [];

  const semesterRoman = toRoman(profile.semester);
  
  return db
    .select({
      id: homework.id,
      title: homework.title,
      subjectName: subjects.name,
      dueDate: homework.dueDate,
    })
    .from(homework)
    .innerJoin(subjects, eq(homework.subjectId, subjects.id))
    .leftJoin(
      assignmentSubmissions,
      and(
        eq(assignmentSubmissions.homeworkId, homework.id),
        eq(assignmentSubmissions.studentId, student.id),
        inArray(assignmentSubmissions.status, ["submitted", "graded", "late"])
      )
    )
    .where(
      and(
        eq(subjects.semester, semesterRoman),
        eq(homework.status, "active"),
        gt(homework.dueDate, now),
        lte(homework.dueDate, horizon),
        isNull(assignmentSubmissions.id)
      )
    )
    .orderBy(asc(homework.dueDate))
    .limit(4);
}
`;

fs.writeFileSync(path, content, "utf-8");

