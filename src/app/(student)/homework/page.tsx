import { db } from "@/db";
import { homework, assignmentSubmissions, students, enrollments, subjects } from "@/db/schema";
import { toSemesterNumber } from "@/lib/semester";
import { getCurrentUser } from "@/lib/auth/session";
import { and, desc, eq, inArray } from "drizzle-orm";
import { HomeworkClientWorkspace } from "@/features/assignments/components/homework-client-workspace";

export const dynamic = "force-dynamic";

export default async function HomeworkPage() {
  const user = await getCurrentUser();
  if (user?.role === "TEACHER") {
    const { redirect } = await import("next/navigation");
    redirect("/teacher/homework");
  }
  if (user?.role === "ADMIN") {
    const { redirect } = await import("next/navigation");
    redirect("/admin/homework");
  }

  let studentId: string | null = user?.studentId ?? null;
  let resolvedStudent = null;

  if (user && (user.role === "STUDENT" || user.role === "CR")) {
    if (studentId) {
      resolvedStudent = await db.query.students.findFirst({
        where: eq(students.id, studentId),
      });
    } else {
      resolvedStudent = await db.query.students.findFirst({
        where: eq(students.userId, user.id),
      });
      if (resolvedStudent) {
        studentId = resolvedStudent.id;
      } else if (user.email) {
        resolvedStudent = await db.query.students.findFirst({
          where: eq(students.email, user.email),
        });
        if (resolvedStudent) studentId = resolvedStudent.id;
      }
    }
  }

  // Fail closed: if the student identity cannot be resolved, enrolledSubjectIds
  // stays empty and the listing below returns [] — never another student's data,
  // never the whole table. Submissions are ONLY queried for the resolved student.
  let enrolledSubjectIds: string[] = [];
  if (studentId) {
    const userEnrollments = await db.query.enrollments.findMany({
      where: eq(enrollments.studentId, studentId),
    });
    enrolledSubjectIds = userEnrollments.map((e) => e.subjectId);

    if (enrolledSubjectIds.length === 0 && resolvedStudent?.semester != null) {
      const semNum = toSemesterNumber(resolvedStudent.semester);
      const mappedSubjects = await db.select({ id: subjects.id }).from(subjects).where(and(eq(subjects.semester, semNum), eq(subjects.isActive, true)));
      enrolledSubjectIds = mappedSubjects.map((s) => s.id);
    }
  }

  const scopedHomework =
    enrolledSubjectIds.length === 0
      ? []
      : await db.query.homework.findMany({
          where: inArray(homework.subjectId, enrolledSubjectIds),
          orderBy: [desc(homework.dueDate)],
          with: {
            subject: true,
            submissions: {
              where: eq(assignmentSubmissions.studentId, studentId as string),
              with: { gradedByTeacher: true },
            },
          },
        });

  return (
    <>
      {!studentId && (
        <div className="max-w-6xl mx-auto w-full py-16 px-4 text-center text-sm text-muted-foreground rounded-xl border border-dashed bg-muted/5">
          We couldn&rsquo;t confirm your student account, so no assignments are shown. Please log
          in with your student account or contact your class coordinator.
        </div>
      )}
      <HomeworkClientWorkspace
        allHomework={scopedHomework.map((h) => ({ ...h, submissions: h.submissions ?? [] }))}
        currentStudentId={studentId}
        currentUserRole={user?.role || "STUDENT"}
      />
    </>
  );
}
