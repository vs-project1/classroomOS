import { db } from "@/db";
import { homework, assignmentSubmissions, students, studentProfiles } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth/session";
import { eq, and } from "drizzle-orm";
import { notFound } from "next/navigation";
import { HomeworkDetailClient } from "@/features/assignments/components/homework-detail-client";
import Link from "next/link";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ id: string }> };

export default async function HomeworkDetailPage({ params }: Props) {
  const { id } = await params;
  const user = await getCurrentUser();

  const hw = await db.query.homework.findFirst({
    where: eq(homework.id, id),
    with: { subject: true },
  });
  if (!hw) notFound();

  // Resolve studentId for existing submission lookup (fail closed — no leakage)
  let studentId: string | null = null;
  if (user && (user.role === "STUDENT" || user.role === "CR")) {
    if (user.studentProfileId) {
      const profile = await db.query.studentProfiles.findFirst({ where: eq(studentProfiles.id, user.studentProfileId) });
      if (profile) {
        const s = await db.query.students.findFirst({ where: eq(students.rollNumber, profile.rollNumber) });
        if (s) studentId = s.id;
      }
    }
    if (!studentId && user.email) {
      const s = await db.query.students.findFirst({ where: eq(students.email, user.email) });
      if (s) studentId = s.id;
    }
  }

  let existingSubmission = null;
  if (studentId) {
    existingSubmission = await db.query.assignmentSubmissions.findFirst({
      where: and(eq(assignmentSubmissions.homeworkId, hw.id), eq(assignmentSubmissions.studentId, studentId)),
    });
  }

  return (
    <div className="flex-1 p-6 md:p-8 space-y-4">
      <Link href="/homework" className="text-xs text-muted-foreground hover:text-foreground">
        ← Back to Assignments
      </Link>
      <HomeworkDetailClient
        homework={{
          id: hw.id,
          title: hw.title,
          description: hw.description,
          subjectId: hw.subjectId,
          subject: { id: hw.subject.id, name: hw.subject.name, code: hw.subject.code },
          dueDate: hw.dueDate,
        }}
        existingSubmission={
          existingSubmission
            ? {
                id: existingSubmission.id,
                content: existingSubmission.content,
                fileUrl: existingSubmission.fileUrl,
                fileName: existingSubmission.fileName,
                fileSize: existingSubmission.fileSize,
                status: existingSubmission.status,
              }
            : null
        }
      />
    </div>
  );
}
