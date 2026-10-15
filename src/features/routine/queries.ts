import { cache } from "react";
import { db } from "@/db";
import { weeklyRoutine, subjects, enrollments, students, homework } from "@/db/schema";
import { and, asc, eq, inArray, isNull, or } from "drizzle-orm";
import { toSemesterNumber, toSemesterRoman } from "@/lib/semester";

export interface StudentCohort {
  studentId: string | null;
  semester: string | null;
  section: string | null;
  semesterVariants: string[];
  allowedSubjectIds: string[];
}

/**
 * Resolves a student's cohort: their semester, semester variants, and all allowed subject IDs.
 * Fail-closed: if the student or cohort cannot be determined, returns empty subject IDs.
 */
export const getStudentCohort = cache(async function getStudentCohort(
  studentId?: string | null,
  userId?: string | null
): Promise<StudentCohort> {
  let resolvedStudent: { id: string; semester: number | string | null; section?: string | null; userId?: string | null } | null = null;

  if (studentId) {
    const s = await db.query.students.findFirst({
      where: eq(students.id, studentId),
    });
    if (s) resolvedStudent = s;
  }

  if (!resolvedStudent && userId) {
    const s = await db.query.students.findFirst({
      where: eq(students.userId, userId),
    });
    if (s) resolvedStudent = s;
  }

  const semNum = resolvedStudent?.semester != null ? toSemesterNumber(resolvedStudent.semester) : null;
  const semesterStr: string | null = semNum != null ? toSemesterRoman(semNum) : null;
  const semesterVariants = semNum != null ? [String(semNum), toSemesterRoman(semNum)] : [];

  // Enrolled subjects from enrollments table
  let enrolledSubjectIds: string[] = [];
  if (resolvedStudent?.id) {
    const userEnrollments = await db.query.enrollments.findMany({
      where: eq(enrollments.studentId, resolvedStudent.id),
    });
    enrolledSubjectIds = userEnrollments.map((e) => e.subjectId);
  }

  // Semester subjects matching student's semester
  let semesterSubjectIds: string[] = [];
  if (semNum != null) {
    const matchingSubjects = await db
      .select({ id: subjects.id })
      .from(subjects)
      .where(and(eq(subjects.semester, semNum), eq(subjects.isActive, true)));
    semesterSubjectIds = matchingSubjects.map((s) => s.id);
  }

  // Combined allowed subjects (enrolled + semester subjects)
  const allowedSubjectIds = [...new Set([...enrolledSubjectIds, ...semesterSubjectIds])];

  return {
    studentId: resolvedStudent?.id ?? studentId ?? null,
    semester: semesterStr,
    section: resolvedStudent?.section ?? null,
    semesterVariants,
    allowedSubjectIds,
  };
});

/**
 * Fetches today's timetable routine strictly isolated to the student's cohort.
 * Fail-closed: returns empty array if allowedSubjectIds is empty.
 */
export const getStudentTodaySchedule = cache(async function getStudentTodaySchedule(params: {
  allowedSubjectIds: string[];
  dayOfWeek: number;
  section?: string | null;
}) {
  const { allowedSubjectIds, dayOfWeek, section } = params;
  const studentSection = section ?? "A";

  if (allowedSubjectIds.length === 0) {
    return [];
  }

  return db.query.weeklyRoutine.findMany({
    where: and(
      eq(weeklyRoutine.dayOfWeek, dayOfWeek),
      or(
        inArray(weeklyRoutine.subjectId, allowedSubjectIds),
        and(isNull(weeklyRoutine.subjectId), eq(weeklyRoutine.section, studentSection))
      )
    ),
    orderBy: [asc(weeklyRoutine.startTime)],
    with: {
      subject: {
        with: { teacher: true },
      },
      teacher: true,
    },
  });
});

/**
 * Fetches the complete weekly timetable routine strictly isolated to the student's cohort.
 * Supports both lecture and non-lecture slots (with section match).
 * Fail-closed: returns empty array if allowedSubjectIds is empty.
 */
export const getStudentWeeklyRoutine = cache(async function getStudentWeeklyRoutine(
  allowedSubjectIds: string[],
  section?: string | null
) {
  const studentSection = section ?? "A";

  if (allowedSubjectIds.length === 0) {
    return [];
  }

  return db.query.weeklyRoutine.findMany({
    where: or(
      inArray(weeklyRoutine.subjectId, allowedSubjectIds),
      and(isNull(weeklyRoutine.subjectId), eq(weeklyRoutine.section, studentSection))
    ),
    orderBy: [asc(weeklyRoutine.dayOfWeek), asc(weeklyRoutine.startTime)],
    with: {
      subject: {
        with: { teacher: true },
      },
      teacher: true,
    },
  });
});

/**
 * Fetches active homework strictly scoped to the student's cohort.
 * Fail-closed: returns empty array if allowedSubjectIds is empty.
 */
export const getStudentActiveHomework = cache(async function getStudentActiveHomework(params: {
  allowedSubjectIds: string[];
  limit?: number;
}) {
  const { allowedSubjectIds, limit = 5 } = params;

  if (allowedSubjectIds.length === 0) {
    return [];
  }

  return db.query.homework.findMany({
    where: and(
      eq(homework.status, "active"),
      inArray(homework.subjectId, allowedSubjectIds)
    ),
    orderBy: [asc(homework.dueDate)],
    limit,
    with: {
      subject: true,
    },
  });
});

/**
 * Fetches today's routine for a teacher based on their assigned subjects or explicit slots.
 */
export const getTeacherTodaySchedule = cache(async function getTeacherTodaySchedule(
  teacherId: string,
  dayOfWeek: number
) {
  const teacherSubjects = await db.query.subjects.findMany({
    where: and(eq(subjects.teacherId, teacherId), eq(subjects.isActive, true)),
  });
  const subjectIds = teacherSubjects.map((s) => s.id);

  return db.query.weeklyRoutine.findMany({
    where: and(
      eq(weeklyRoutine.dayOfWeek, dayOfWeek),
      or(
        eq(weeklyRoutine.teacherId, teacherId),
        subjectIds.length > 0
          ? and(isNull(weeklyRoutine.teacherId), inArray(weeklyRoutine.subjectId, subjectIds))
          : undefined
      )
    ),
    orderBy: [asc(weeklyRoutine.startTime)],
    with: {
      subject: {
        with: { teacher: true },
      },
      teacher: true,
    },
  });
});

/**
 * Fetches the full weekly routine for a teacher based on their assigned subjects or explicit slots.
 */
export const getTeacherWeeklyRoutine = cache(async function getTeacherWeeklyRoutine(
  teacherId: string
) {
  const teacherSubjects = await db.query.subjects.findMany({
    where: and(eq(subjects.teacherId, teacherId), eq(subjects.isActive, true)),
  });
  const subjectIds = teacherSubjects.map((s) => s.id);

  return db.query.weeklyRoutine.findMany({
    where: or(
      eq(weeklyRoutine.teacherId, teacherId),
      subjectIds.length > 0
        ? and(isNull(weeklyRoutine.teacherId), inArray(weeklyRoutine.subjectId, subjectIds))
        : undefined
    ),
    orderBy: [asc(weeklyRoutine.dayOfWeek), asc(weeklyRoutine.startTime)],
    with: {
      subject: {
        with: { teacher: true },
      },
      teacher: true,
    },
  });
});
