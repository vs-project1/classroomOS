import "server-only";

import { eq, and } from "drizzle-orm";
import { db } from "@/db";
import {
  enrollments,
  subjects,
  users,
  students,
  teachers,
  files,
  assignmentSubmissions,
  homework,
  courseChapters,
  courseUnits,
} from "@/db/schema";
import { toSemesterNumber } from "@/lib/semester";

/**
 * Resolve student.id(s) owned by a given users.id.
 * Returns empty array if no link exists.
 */
async function resolveStudentIds(userId: string): Promise<string[]> {
  const student = await db.query.students.findFirst({
    where: eq(students.userId, userId),
  });
  return student ? [student.id] : [];
}

async function resolveTeacherId(userId: string): Promise<string | null> {
  const u = await db.query.users.findFirst({ where: eq(users.id, userId) });
  if (!u) return null;
  const t = await db.query.teachers.findFirst({ where: eq(teachers.email, u.email) });
  return t?.id ?? null;
}

/**
 * Assert the user can READ the given course (subject).
 * Allowed if:
 * - ADMIN
 * - Teacher of the subject (subjects.teacherId matches user's teacher record)
 * - Student enrolled in the subject (enrollments)
 *
 * Throws on forbidden / not found.
 */
export async function assertCanRead(courseId: string, userId: string): Promise<void> {
  if (!courseId || !userId) {
    throw new Error("Forbidden: missing course or user");
  }

  const user = await db.query.users.findFirst({ where: eq(users.id, userId) });
  if (!user || !user.isActive) {
    throw new Error("Forbidden: user not found or inactive");
  }

  if (user.role === "ADMIN") return;

  const subject = await db.query.subjects.findFirst({ where: eq(subjects.id, courseId) });
  if (!subject) {
    throw new Error(`Forbidden: course ${courseId} not found`);
  }

  // Teacher ownership check via teachers table (matched by email)
  const teacherId = await resolveTeacherId(userId);
  if (teacherId && subject.teacherId === teacherId) {
    return;
  }

  // Student enrollment check
  const studentIds = await resolveStudentIds(userId);
  if (studentIds.length > 0) {
    for (const sid of studentIds) {
      const enr = await db.query.enrollments.findFirst({
        where: and(eq(enrollments.studentId, sid), eq(enrollments.subjectId, courseId)),
      });
      if (enr) return;
    }
  }

  // Fallback to semester-level cohort matching for students/CRs
  if (user.role === "STUDENT" || user.role === "CR") {
    const student = await db.query.students.findFirst({
      where: eq(students.userId, userId),
    });
    if (student && student.semester != null && subject.semester != null) {
      if (toSemesterNumber(student.semester) === toSemesterNumber(subject.semester)) {
        return;
      }
    }
  }

  // CR is also a student; same enrollment check above covers CR.
  throw new Error(`Forbidden: user ${userId} has no read access to course ${courseId}`);
}

export type FileRecord = typeof files.$inferSelect;

/**
 * Assert the user has permission to read/preview a specific file record.
 * Allowed if:
 * - User is ADMIN
 * - User is the file's owner (ownerId)
 * - File is linked to a course (courseId) and user can read course
 * - File is linked to a chapter (chapterId) and user can read that chapter's course
 * - File is linked to a submission (submissionId) and user is the author or course teacher
 * - File is linked to a notice (noticeId) — active users can view broadcast notices
 */
export async function assertCanReadFile(file: FileRecord, userId: string): Promise<void> {
  if (!file || !userId) {
    throw new Error("Forbidden: missing file or user");
  }

  const user = await db.query.users.findFirst({ where: eq(users.id, userId) });
  if (!user || !user.isActive) {
    throw new Error("Forbidden: user not found or inactive");
  }

  // 1. ADMIN can view all files
  if (user.role === "ADMIN") return;

  // 2. File owner can always view their own files
  if (file.ownerId === userId) return;

  // 3. File linked to course (subject)
  if (file.courseId) {
    return assertCanRead(file.courseId, userId);
  }

  // 4. File linked to chapter -> resolve course
  if (file.chapterId) {
    const chapter = await db.query.courseChapters.findFirst({
      where: eq(courseChapters.id, file.chapterId),
    });
    if (chapter?.unitId) {
      const unit = await db.query.courseUnits.findFirst({
        where: eq(courseUnits.id, chapter.unitId),
      });
      if (unit?.subjectId) {
        return assertCanRead(unit.subjectId, userId);
      }
    }
  }

  // 5. File linked to submission
  if (file.submissionId) {
    const submission = await db.query.assignmentSubmissions.findFirst({
      where: eq(assignmentSubmissions.id, file.submissionId),
    });
    if (submission) {
      const studentIds = await resolveStudentIds(userId);
      if (studentIds.includes(submission.studentId)) return;

      if (user.role === "TEACHER" && submission.homeworkId) {
        const hw = await db.query.homework.findFirst({
          where: eq(homework.id, submission.homeworkId),
        });
        if (hw?.subjectId) {
          const teacherId = await resolveTeacherId(userId);
          const subject = await db.query.subjects.findFirst({
            where: eq(subjects.id, hw.subjectId),
          });
          if (teacherId && subject?.teacherId === teacherId) return;
        }
      }
    }
    throw new Error("Forbidden: you cannot access this submission file");
  }

  // 6. File linked to notice — broadcast notice attachment
  if (file.noticeId) {
    return;
  }

  // 7. Fallback: deny non-course, unlinked files from unauthorized users
  throw new Error("Forbidden: you do not have permission to preview this file");
}
