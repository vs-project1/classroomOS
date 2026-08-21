import { db } from "@/db";
import { assignmentSubmissions, studentProfiles, students } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getCurrentUser, requireAuth } from "@/lib/auth";
import { notFound } from "next/navigation";
import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { ShieldAlert, FileText, ArrowLeft, CheckCircle2 } from "lucide-react";

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ id: string }>;
};

export default async function SubmissionDetailPage({ params }: Props) {
  const { id: submissionId } = await params;
  const user = await requireAuth(["STUDENT", "CR", "TEACHER", "ADMIN"]);

  const submission = await db.query.assignmentSubmissions.findFirst({
    where: eq(assignmentSubmissions.id, submissionId),
    with: {
      homework: {
        with: {
          subject: true,
        },
      },
      student: true,
      gradedByTeacher: true,
    },
  });

  if (!submission) {
    notFound();
  }

  // Strict ownership check for student role
  if (user.role === "STUDENT" || user.role === "CR") {
    let studentId: string | null = null;
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

    if (submission.studentId !== studentId) {
      return (
        <div className="flex flex-col items-center justify-center min-h-[50vh] text-center p-8 border border-destructive/20 rounded-2xl bg-destructive/5 max-w-lg mx-auto my-12">
          <div className="w-16 h-16 rounded-full bg-destructive/10 text-destructive flex items-center justify-center mb-4">
            <ShieldAlert className="w-8 h-8" />
          </div>
          <h1 className="text-2xl font-bold text-foreground mb-2">403 - Forbidden</h1>
          <p className="text-sm text-muted-foreground mb-6">
            Access Denied: You do not have permission to view another student's assignment submission.
          </p>
          <Link href="/homework" className={buttonVariants({ variant: "outline" })}>
            ← Return to My Assignments
          </Link>
        </div>
      );
    }
  }

  return (
    <div className="flex-1 space-y-6 max-w-4xl mx-auto w-full">
      <Link
        href="/homework"
        className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground mb-2 font-medium"
      >
        <ArrowLeft className="w-3.5 h-3.5" /> Back to Assignments
      </Link>

      <div className="rounded-2xl border bg-card p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b pb-4">
          <div>
            <span className="text-xs font-mono font-bold text-primary px-2 py-0.5 rounded bg-primary/10">
              {submission.homework.subject.code}
            </span>
            <h1 className="text-xl font-bold text-foreground mt-2">
              {submission.homework.title}
            </h1>
            <p className="text-xs text-muted-foreground">
              Submitted by {submission.student.name} ({submission.student.rollNumber})
            </p>
          </div>

          <span className="px-3 py-1 rounded-full text-xs font-bold uppercase bg-primary/10 text-primary">
            {submission.status}
          </span>
        </div>

        {submission.content && (
          <div className="space-y-1">
            <h3 className="text-xs font-semibold uppercase text-muted-foreground tracking-wider">
              Written Solution
            </h3>
            <div className="p-4 rounded-xl bg-muted/20 border border-border/40 text-xs font-mono whitespace-pre-wrap">
              {submission.content}
            </div>
          </div>
        )}

        {submission.fileName && (
          <div className="flex items-center gap-2 p-3 rounded-lg border bg-muted/10 text-xs">
            <FileText className="w-4 h-4 text-primary" />
            <span className="font-medium text-foreground">{submission.fileName}</span>
            {submission.fileUrl && (
              <a
                href={submission.fileUrl}
                target="_blank"
                rel="noreferrer"
                className="ml-auto text-primary hover:underline font-semibold"
              >
                Download Attachment
              </a>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
