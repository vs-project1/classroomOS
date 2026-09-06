import "server-only";

import { eq, and } from "drizzle-orm";
import { db } from "@/db";
import { enrollments, subjects, users, studentProfiles, students, teachers } from "@/db/schema";

/**
 * Resolve student.id(s) owned by a given users.id via studentProfiles -> students.
 * Returns empty array if no link exists.
 */
async function resolveStudentIds(userId: string): Promise<string[]> {
  const profiles = await db.query.studentProfiles.findMany({
    where: eq(studentProfiles.userId, userId),
  });

  if (profiles.length === 0) return [];

  const rollNumbers = profiles.map((p) => p.rollNumber);
  // Fetch students matching those rollNumbers
  const matched: string[] = [];
  for (const rn of rollNumbers) {
    const st = await db.query.students.findFirst({
      where: eq(students.rollNumber, rn),
    });
    if (st) matched.push(st.id);
  }
  return matched;
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

  // CR is also a student; same enrollment check above covers CR.
  throw new Error(`Forbidden: user ${userId} has no read access to course ${courseId}`);
}
