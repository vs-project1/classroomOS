import { db } from "@/db";
import { weeklyRoutine, classSessions, enrollments, students, subjects } from "@/db/schema";
import { desc, eq, asc, and, inArray, gte } from "drizzle-orm";
import { toRoman } from "@/lib/utils/roman";

export async function getCrDashboardData(studentId: string, now: Date, dayOfWeek: number) {
  // CR's enrolled subject IDs
  const crEnrollments = await db.query.enrollments.findMany({
    where: eq(enrollments.studentId, studentId),
  });
  let enrolledSubjectIds = crEnrollments.map((e) => e.subjectId);

  // Fallback to semester-level cohort subjects if no explicit per-subject enrollments
  if (enrolledSubjectIds.length === 0) {
    const student = await db.query.students.findFirst({
      where: eq(students.id, studentId),
    });
    if (student?.semester) {
      const semRoman = toRoman(student.semester);
      const cohortSubjects = await db.query.subjects.findMany({
        where: eq(subjects.semester, semRoman),
      });
      enrolledSubjectIds = cohortSubjects.map((s) => s.id);
    }
  }

  // Sessions logged this week (Mon=1..Sun=0 in JS, but we use Monday-based week)
  const startOfWeek = new Date(now);
  const dayOffset = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
  startOfWeek.setDate(startOfWeek.getDate() - dayOffset);
  startOfWeek.setHours(0, 0, 0, 0);
  const endOfWeek = new Date(startOfWeek);
  endOfWeek.setDate(endOfWeek.getDate() + 6);
  endOfWeek.setHours(23, 59, 59, 999);

  // Parallel queries
  const [todaysClasses, recentSessionsWithLogs, weekSessions] = await Promise.all([
    enrolledSubjectIds.length > 0
      ? db.query.weeklyRoutine.findMany({
          where: and(
            eq(weeklyRoutine.dayOfWeek, dayOfWeek),
            inArray(weeklyRoutine.subjectId, enrolledSubjectIds)
          ),
          orderBy: [asc(weeklyRoutine.startTime)],
          with: { subject: { with: { teacher: true } } },
        })
      : Promise.resolve([]),
    // Recent sessions with lecture logs (for Recent Activity)
    enrolledSubjectIds.length > 0
      ? db.query.classSessions.findMany({
          orderBy: [desc(classSessions.sessionDate)],
          limit: 5,
          where: inArray(classSessions.subjectId, enrolledSubjectIds),
          with: {
            subject: true,
            lectureLog: true,
          },
        })
      : Promise.resolve([]),
    // This week's sessions only
    enrolledSubjectIds.length > 0
      ? db.query.classSessions.findMany({
          where: and(
            inArray(classSessions.subjectId, enrolledSubjectIds),
            gte(classSessions.sessionDate, startOfWeek)
          ),
          with: { subject: true },
        })
      : Promise.resolve([]),
  ]);

  const sessionsThisWeek = weekSessions.filter((s) => {
    const d = new Date(s.sessionDate);
    return d >= startOfWeek && d <= endOfWeek;
  });

  return {
    todaysClasses,
    recentSessionsWithLogs,
    weekSessions,
    sessionsThisWeek,
    enrolledSubjectIds,
  };
}
