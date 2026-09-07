import { cache } from "react";
import { db } from "@/db";
import { weeklyRoutine, subjects, enrollments, studentProfiles, students, homework } from "@/db/schema";
import { and, asc, eq, inArray } from "drizzle-orm";
import { getSemesterVariants, toRoman } from "@/lib/utils/roman";

export interface StudentCohort {
  studentId: string | null;
  semester: string | null;
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
  let resolvedStudent: { id: string; semester: string | null; userId?: string | null } | null = null;

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

  let semesterStr: string | null = resolvedStudent?.semester ?? null;

  // Fallback to studentProfiles if semester is not on students row
  if (!semesterStr) {
    let profile = null;
    if (userId) {
      profile = await db.query.studentProfiles.findFirst({
        where: eq(studentProfiles.userId, userId),
      });
    }
    if (profile?.semester != null) {
      semesterStr = toRoman(profile.semester);
    }
  }

  const semesterVariants = semesterStr ? getSemesterVariants(semesterStr) : [];

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
  if (semesterVariants.length > 0) {
    const matchingSubjects = await db
      .select({ id: subjects.id })
      .from(subjects)
      .where(inArray(subjects.semester, semesterVariants));
    semesterSubjectIds = matchingSubjects.map((s) => s.id);
  }

  // Combined allowed subjects (enrolled + semester subjects)
  const allowedSubjectIds = [...new Set([...enrolledSubjectIds, ...semesterSubjectIds])];

  return {
    studentId: resolvedStudent?.id ?? studentId ?? null,
    semester: semesterStr,
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
}) {
  const { allowedSubjectIds, dayOfWeek } = params;

  if (allowedSubjectIds.length === 0) {
    return [];
  }

  return db.query.weeklyRoutine.findMany({
    where: and(
      eq(weeklyRoutine.dayOfWeek, dayOfWeek),
      inArray(weeklyRoutine.subjectId, allowedSubjectIds)
    ),
    orderBy: [asc(weeklyRoutine.startTime)],
    with: {
      subject: {
        with: { teacher: true },
      },
    },
  });
});

/**
 * Fetches the complete weekly timetable routine strictly isolated to the student's cohort.
 * Fail-closed: returns empty array if allowedSubjectIds is empty.
 */
export const getStudentWeeklyRoutine = cache(async function getStudentWeeklyRoutine(
  allowedSubjectIds: string[]
) {
  if (allowedSubjectIds.length === 0) {
    return [];
  }

  return db.query.weeklyRoutine.findMany({
    where: inArray(weeklyRoutine.subjectId, allowedSubjectIds),
    orderBy: [asc(weeklyRoutine.dayOfWeek), asc(weeklyRoutine.startTime)],
    with: {
      subject: {
        with: { teacher: true },
      },
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
 * Fetches today's routine for a teacher based on their assigned subjects.
 */
export const getTeacherTodaySchedule = cache(async function getTeacherTodaySchedule(
  teacherId: string,
  dayOfWeek: number
) {
  const teacherSubjects = await db.query.subjects.findMany({
    where: eq(subjects.teacherId, teacherId),
  });
  const subjectIds = teacherSubjects.map((s) => s.id);
  if (subjectIds.length === 0) return [];

  return db.query.weeklyRoutine.findMany({
    where: and(
      eq(weeklyRoutine.dayOfWeek, dayOfWeek),
      inArray(weeklyRoutine.subjectId, subjectIds)
    ),
    orderBy: [asc(weeklyRoutine.startTime)],
    with: {
      subject: {
        with: { teacher: true },
      },
    },
  });
});

/**
 * Fetches the full weekly routine for a teacher based on their assigned subjects.
 */
export const getTeacherWeeklyRoutine = cache(async function getTeacherWeeklyRoutine(
  teacherId: string
) {
  const teacherSubjects = await db.query.subjects.findMany({
    where: eq(subjects.teacherId, teacherId),
  });
  const subjectIds = teacherSubjects.map((s) => s.id);
  if (subjectIds.length === 0) return [];

  return db.query.weeklyRoutine.findMany({
    where: inArray(weeklyRoutine.subjectId, subjectIds),
    orderBy: [asc(weeklyRoutine.dayOfWeek), asc(weeklyRoutine.startTime)],
    with: {
      subject: {
        with: { teacher: true },
      },
    },
  });
});
