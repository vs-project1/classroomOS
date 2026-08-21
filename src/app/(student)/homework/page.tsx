import { db } from "@/db";
import { homework, assignmentSubmissions, studentProfiles, students } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth/session";
import { desc, eq } from "drizzle-orm";
import { HomeworkClientWorkspace } from "./homework-client-workspace";

export const dynamic = "force-dynamic";

export default async function HomeworkPage() {
  const user = await getCurrentUser();

  let studentId: string | null = null;
  if (user && (user.role === "STUDENT" || user.role === "CR")) {
    if (user.studentProfileId) {
      const profile = await db.query.studentProfiles.findFirst({
        where: eq(studentProfiles.id, user.studentProfileId),
      });
      if (profile) {
        const std = await db.query.students.findFirst({
          where: eq(students.rollNumber, profile.rollNumber),
        });
        if (std) studentId = std.id;
      }
    }
    if (!studentId && user.email) {
      const std = await db.query.students.findFirst({
        where: eq(students.email, user.email),
      });
      if (std) studentId = std.id;
    }
    if (!studentId) {
      const direct = await db.query.students.findFirst({
        where: eq(students.id, user.id),
      });
      if (direct) studentId = direct.id;
    }
  }

  // Default-deny (post-T1.1): an authenticated STUDENT/CR whose identity cannot be
  // resolved sees nothing — never another student's data, never the whole table.
  // Submissions are ONLY ever queried when scoped to the resolved student.
  const allHomework = await db.query.homework.findMany({
    orderBy: [desc(homework.dueDate)],
    with: {
      subject: true,
      ...(studentId !== null
        ? {
            submissions: {
              where: eq(assignmentSubmissions.studentId, studentId),
              with: { gradedByTeacher: true },
            },
          }
        : {}),
    },
  });

  return (
    <HomeworkClientWorkspace
      allHomework={allHomework.map((h) => ({ ...h, submissions: h.submissions ?? [] }))}
      currentStudentId={studentId}
      currentUserRole={user?.role || "STUDENT"}
    />
  );
}
