import "server-only";
import { eq, and } from "drizzle-orm";
import { db } from "@/db";
import { enrollments, subjects, teachers, users, studentProfiles, students } from "@/db/schema";

/**
 * Throws if user cannot read the course (subject).
 * Allowed: ADMIN, teacher of subject, enrolled student/CR.
 */
export async function assertCanRead(courseId: string, userId: string): Promise<void> {
  if (!courseId) return;
  const user = await db.query.users.findFirst({ where: eq(users.id, userId) });
  if (!user) throw new Error("Unauthorized: user not found");

  if (user.role === "ADMIN") return;

  // Resolve subject
  const subject = await db.query.subjects.findFirst({ where: eq(subjects.id, courseId) });
  if (!subject) throw new Error(`Course not found: ${courseId}`);

  // Teacher check — subjects.teacherId references teachers.id, teachers.email links to users.email
  if (user.role === "TEACHER") {
    const teacher = await db.query.teachers.findFirst({ where: eq(teachers.email, user.email) });
    if (teacher && subject.teacherId === teacher.id) return;
    // Also allow if teacher owns via subject.teacherId null? deny.
    throw new Error("Forbidden: teacher does not own this course");
  }

  // Student / CR check via enrollments
  if (user.role === "STUDENT" || user.role === "CR") {
    const profile = await db.query.studentProfiles.findFirst({
      where: eq(studentProfiles.userId, userId),
    });
    if (profile) {
      const student = await db.query.students.findFirst({
        where: eq(students.rollNumber, profile.rollNumber),
      });
      if (student) {
        const enrollment = await db.query.enrollments.findFirst({
          where: and(eq(enrollments.studentId, student.id), eq(enrollments.subjectId, courseId)),
        });
        if (enrollment) return;
      }
    }
    throw new Error("Forbidden: student not enrolled in this course");
  }

  // Fallback deny
  throw new Error("Forbidden: cannot read course");
}

/**
 * Throws if user cannot write to course.
 * Allowed: ADMIN, teacher of subject.
 */
export async function assertCanWrite(courseId: string, userId: string): Promise<void> {
  if (!courseId) throw new Error("courseId required for write");
  const user = await db.query.users.findFirst({ where: eq(users.id, userId) });
  if (!user) throw new Error("Unauthorized: user not found");
  if (user.role === "ADMIN") return;
  if (user.role === "TEACHER") {
    const subject = await db.query.subjects.findFirst({ where: eq(subjects.id, courseId) });
    if (!subject) throw new Error(`Course not found: ${courseId}`);
    const teacher = await db.query.teachers.findFirst({ where: eq(teachers.email, user.email) });
    if (teacher && subject.teacherId === teacher.id) return;
    throw new Error("Forbidden: teacher does not own this course");
  }
  throw new Error("Forbidden: only teachers and admins can write to this course");
}
