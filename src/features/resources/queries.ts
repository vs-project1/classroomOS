import { cache } from "react";
import { db } from "@/db";
import {
  courseChapters,
  courseUnits,
  enrollments,
  resources,
  studentProfiles,
  students,
  subjects,
  teachers,
  users,
} from "@/db/schema";
import { resolveCurrentStudent } from "@/lib/auth";
import { toRoman } from "@/lib/utils/roman";
import { and, desc, eq, inArray, like, or, sql } from "drizzle-orm";

export type ResourceWithDetails = {
  id: string;
  title: string;
  description: string | null;
  fileUrl: string;
  fileType: string;
  fileSize: number | null;
  createdAt: Date | null;
  subjectId: string;
  subjectName: string;
  subjectCode: string;
  subjectSlug: string;
  unitId: string | null;
  unitTitle: string | null;
  unitOrder: number | null;
  chapterId: string | null;
  chapterTitle: string | null;
  teacherName: string | null;
  scope: "SUBJECT" | "UNIT" | "CHAPTER";
};

const getStudentAccessibleSubjectIds = cache(async (studentId: string): Promise<string[]> => {
  // 1. Check direct enrollments
  const enrolledRows = await db
    .select({ subjectId: enrollments.subjectId })
    .from(enrollments)
    .where(eq(enrollments.studentId, studentId));

  if (enrolledRows.length > 0) {
    return enrolledRows.map((r) => r.subjectId);
  }

  // 2. Fallback to student profile semester
  const student = await db.query.students.findFirst({
    where: eq(students.id, studentId),
  });

  if (student) {
    // Check if user has studentProfile
    const user = await db.query.users.findFirst({
      where: eq(users.email, student.email ?? ""),
    });

    if (user) {
      const profile = await db.query.studentProfiles.findFirst({
        where: eq(studentProfiles.userId, user.id),
      });
      if (profile?.semester != null) {
        const semesterRoman = toRoman(profile.semester);
        const semesterSubjects = await db
          .select({ id: subjects.id })
          .from(subjects)
          .where(eq(subjects.semester, semesterRoman));
        if (semesterSubjects.length > 0) {
          return semesterSubjects.map((s) => s.id);
        }
      }
    }

    if (student.semester) {
      const parsedNum = parseInt(student.semester.replace(/\D/g, ""), 10);
      if (!isNaN(parsedNum) && parsedNum >= 1 && parsedNum <= 8) {
        const semesterRoman = toRoman(parsedNum);
        const semesterSubjects = await db
          .select({ id: subjects.id })
          .from(subjects)
          .where(eq(subjects.semester, semesterRoman));
        if (semesterSubjects.length > 0) {
          return semesterSubjects.map((s) => s.id);
        }
      }
    }
  }

  // Fallback: Return all subject IDs if no specific filter
  const allSubjects = await db.select({ id: subjects.id }).from(subjects);
  return allSubjects.map((s) => s.id);
});

export const getRecentStudentResources = cache(
  async (limitCount: number = 5): Promise<ResourceWithDetails[]> => {
    const student = await resolveCurrentStudent();
    if (!student) return [];

    const accessibleSubjectIds = await getStudentAccessibleSubjectIds(student.id);
    if (accessibleSubjectIds.length === 0) return [];

    const rows = await db
      .select({
        id: resources.id,
        title: resources.title,
        description: resources.description,
        fileUrl: resources.fileUrl,
        fileType: resources.fileType,
        fileSize: resources.fileSize,
        createdAt: resources.createdAt,
        subjectId: subjects.id,
        subjectName: subjects.name,
        subjectCode: subjects.code,
        subjectSlug: subjects.slug,
        rawUnitId: resources.unitId,
        chapterId: resources.chapterId,
        chapterTitle: courseChapters.title,
        chapterUnitId: courseChapters.unitId,
        unitId: courseUnits.id,
        unitTitle: courseUnits.title,
        unitOrder: courseUnits.order,
        teacherName: teachers.name,
      })
      .from(resources)
      .innerJoin(subjects, eq(resources.subjectId, subjects.id))
      .leftJoin(courseChapters, eq(resources.chapterId, courseChapters.id))
      .leftJoin(
        courseUnits,
        eq(courseUnits.id, sql`coalesce(${resources.unitId}, ${courseChapters.unitId})`)
      )
      .leftJoin(teachers, eq(resources.uploadedBy, teachers.id))
      .where(inArray(resources.subjectId, accessibleSubjectIds))
      .orderBy(desc(resources.createdAt))
      .limit(limitCount);

    return rows.map((r) => {
      const resolvedUnitId = r.unitId || r.rawUnitId || r.chapterUnitId || null;
      const scope: "SUBJECT" | "UNIT" | "CHAPTER" = r.chapterId
        ? "CHAPTER"
        : resolvedUnitId
        ? "UNIT"
        : "SUBJECT";

      return {
        id: r.id,
        title: r.title,
        description: r.description,
        fileUrl: r.fileUrl,
        fileType: r.fileType,
        fileSize: r.fileSize,
        createdAt: r.createdAt,
        subjectId: r.subjectId,
        subjectName: r.subjectName,
        subjectCode: r.subjectCode,
        subjectSlug: r.subjectSlug,
        unitId: resolvedUnitId,
        unitTitle: r.unitTitle,
        unitOrder: r.unitOrder,
        chapterId: r.chapterId,
        chapterTitle: r.chapterTitle,
        teacherName: r.teacherName,
        scope,
      };
    });
  }
);

export const getAllStudentResources = cache(
  async (options?: { subjectId?: string; search?: string }): Promise<{
    resourcesList: ResourceWithDetails[];
    availableSubjects: { id: string; name: string; code: string }[];
  }> => {
    const student = await resolveCurrentStudent();
    if (!student) {
      return { resourcesList: [], availableSubjects: [] };
    }

    const accessibleSubjectIds = await getStudentAccessibleSubjectIds(student.id);
    if (accessibleSubjectIds.length === 0) {
      return { resourcesList: [], availableSubjects: [] };
    }

    // Get subject filters
    const availableSubjects = await db
      .select({ id: subjects.id, name: subjects.name, code: subjects.code })
      .from(subjects)
      .where(inArray(subjects.id, accessibleSubjectIds))
      .orderBy(subjects.name);

    const conditions = [inArray(resources.subjectId, accessibleSubjectIds)];

    if (options?.subjectId && options.subjectId !== "ALL") {
      conditions.push(eq(resources.subjectId, options.subjectId));
    }

    if (options?.search && options.search.trim() !== "") {
      const searchTerm = `%${options.search.trim()}%`;
      conditions.push(
        or(
          like(resources.title, searchTerm),
          like(resources.description, searchTerm),
          like(subjects.name, searchTerm)
        )!
      );
    }

    const rows = await db
      .select({
        id: resources.id,
        title: resources.title,
        description: resources.description,
        fileUrl: resources.fileUrl,
        fileType: resources.fileType,
        fileSize: resources.fileSize,
        createdAt: resources.createdAt,
        subjectId: subjects.id,
        subjectName: subjects.name,
        subjectCode: subjects.code,
        subjectSlug: subjects.slug,
        rawUnitId: resources.unitId,
        chapterId: resources.chapterId,
        chapterTitle: courseChapters.title,
        chapterUnitId: courseChapters.unitId,
        unitId: courseUnits.id,
        unitTitle: courseUnits.title,
        unitOrder: courseUnits.order,
        teacherName: teachers.name,
      })
      .from(resources)
      .innerJoin(subjects, eq(resources.subjectId, subjects.id))
      .leftJoin(courseChapters, eq(resources.chapterId, courseChapters.id))
      .leftJoin(
        courseUnits,
        eq(courseUnits.id, sql`coalesce(${resources.unitId}, ${courseChapters.unitId})`)
      )
      .leftJoin(teachers, eq(resources.uploadedBy, teachers.id))
      .where(and(...conditions))
      .orderBy(desc(resources.createdAt));

    const resourcesList: ResourceWithDetails[] = rows.map((r) => {
      const resolvedUnitId = r.unitId || r.rawUnitId || r.chapterUnitId || null;
      const scope: "SUBJECT" | "UNIT" | "CHAPTER" = r.chapterId
        ? "CHAPTER"
        : resolvedUnitId
        ? "UNIT"
        : "SUBJECT";

      return {
        id: r.id,
        title: r.title,
        description: r.description,
        fileUrl: r.fileUrl,
        fileType: r.fileType,
        fileSize: r.fileSize,
        createdAt: r.createdAt,
        subjectId: r.subjectId,
        subjectName: r.subjectName,
        subjectCode: r.subjectCode,
        subjectSlug: r.subjectSlug,
        unitId: resolvedUnitId,
        unitTitle: r.unitTitle,
        unitOrder: r.unitOrder,
        chapterId: r.chapterId,
        chapterTitle: r.chapterTitle,
        teacherName: r.teacherName,
        scope,
      };
    });

    return {
      resourcesList,
      availableSubjects,
    };
  }
);
