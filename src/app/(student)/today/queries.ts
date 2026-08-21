import { and, asc, eq, gt, inArray, isNull, lte } from "drizzle-orm";
import { db } from "@/db";
import { assignmentSubmissions, enrollments, homework, subjects } from "@/db/schema";
import { resolveCurrentStudent } from "@/lib/auth";

export type TodayDeadline = {
  id: string;
  title: string;
  subjectName: string;
  dueDate: Date;
};

/**
 * Unsubmitted, still-open homework for the signed-in student's enrollments,
 * due within the next 7 days. Strictly scoped to the caller's own enrollment
 * rows; CRs resolve through their student profile like students do.
 */
export async function getTodayDeadlines(): Promise<TodayDeadline[]> {
  const student = await resolveCurrentStudent();
  if (!student) return [];

  const now = new Date();
  const horizon = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

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
