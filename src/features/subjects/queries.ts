import { db } from "@/db";
import { courseChapters, courseUnits, enrollments, subjects } from "@/db/schema";
import { and, asc, eq, isNotNull, isNull, sql } from "drizzle-orm";
import { getCurrentUser, resolveCurrentStudent } from "@/lib/auth";

export type SidebarSubject = { id: string; name: string; slug: string };

const sidebarColumns = {
  id: subjects.id,
  name: subjects.name,
  slug: subjects.slug,
};

async function listAllSidebarSubjects(): Promise<SidebarSubject[]> {
  return db
    .select(sidebarColumns)
    .from(subjects)
    .orderBy(asc(subjects.name));
}

export async function getSubjectsForSidebar(): Promise<SidebarSubject[]> {
  const user = await getCurrentUser();
  if (!user) {
    return [];
  }

  if (user.role === "TEACHER") {
    if (!user.teacherId) {
      return [];
    }
    return db
      .select(sidebarColumns)
      .from(subjects)
      .where(eq(subjects.teacherId, user.teacherId))
      .orderBy(asc(subjects.name));
  }

  if (user.role === "STUDENT") {
    // Mirror src/app/(student)/subjects/page.tsx: enrolled subjects first;
    // fall back to ALL subjects when the student has no enrollment rows
    // (or cannot be resolved).
    const student = await resolveCurrentStudent();
    if (student) {
      const enrolled = await db
        .select({ id: subjects.id, name: subjects.name, slug: subjects.slug })
        .from(enrollments)
        .innerJoin(subjects, eq(enrollments.subjectId, subjects.id))
        .where(eq(enrollments.studentId, student.id))
        .orderBy(asc(subjects.name));

      if (enrolled.length > 0) {
        return enrolled;
      }
    }

    return listAllSidebarSubjects();
  }

  // ADMIN / CR see everything.
  return listAllSidebarSubjects();
}

export type SubjectProgress = {
  totalChapters: number;
  coveredChapters: number;
  currentChapter: { unitTitle: string; chapterTitle: string } | null;
};

export async function getSubjectProgress(subjectId: string): Promise<SubjectProgress> {
  const subjectScope = eq(courseUnits.subjectId, subjectId);

  const [totalRows] = await db
    .select({ count: sql<number>`count(*)` })
    .from(courseChapters)
    .innerJoin(courseUnits, eq(courseChapters.unitId, courseUnits.id))
    .where(subjectScope);

  const totalChapters = Number(totalRows?.count ?? 0);
  if (totalChapters === 0) {
    return { totalChapters: 0, coveredChapters: 0, currentChapter: null };
  }

  const [coveredRows] = await db
    .select({ count: sql<number>`count(*)` })
    .from(courseChapters)
    .innerJoin(courseUnits, eq(courseChapters.unitId, courseUnits.id))
    .where(and(subjectScope, isNotNull(courseChapters.coveredAt)));

  const coveredChapters = Number(coveredRows?.count ?? 0);

  const [current] = await db
    .select({
      unitTitle: courseUnits.title,
      chapterTitle: courseChapters.title,
    })
    .from(courseChapters)
    .innerJoin(courseUnits, eq(courseChapters.unitId, courseUnits.id))
    .where(and(subjectScope, isNull(courseChapters.coveredAt)))
    .orderBy(asc(courseUnits.order), asc(courseChapters.order))
    .limit(1);

  return {
    totalChapters,
    coveredChapters,
    currentChapter: current ?? null,
  };
}
