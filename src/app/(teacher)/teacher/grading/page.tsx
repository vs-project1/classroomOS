import { requireAuth } from "@/lib/auth";
import { db } from "@/db";
import { assignmentSubmissions, homework, students, subjects } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { GradingSubmissionList } from "./grading-form";

export default async function GradingPage() {
  const user = await requireAuth(["TEACHER", "ADMIN"]);

  if (!user.teacherId) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold tracking-tight">Grade Submissions</h1>
        <div className="p-4 bg-yellow-50 text-yellow-800 rounded-xl border border-yellow-200">
          Your account is not linked to a teacher profile.
        </div>
      </div>
    );
  }

  const submissions = await db
    .select({
      submission: assignmentSubmissions,
      homework: homework,
      student: students,
      subject: subjects
    })
    .from(assignmentSubmissions)
    .innerJoin(homework, eq(homework.id, assignmentSubmissions.homeworkId))
    .innerJoin(subjects, eq(subjects.id, homework.subjectId))
    .innerJoin(students, eq(students.id, assignmentSubmissions.studentId))
    .where(eq(subjects.teacherId, user.teacherId))
    .orderBy(desc(assignmentSubmissions.submittedAt));

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Grade Submissions</h1>
          <p className="text-muted-foreground">Review and grade student submissions.</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent Submissions</CardTitle>
          <CardDescription>Submissions from students across all your subjects.</CardDescription>
        </CardHeader>
        <CardContent>
          <GradingSubmissionList submissions={submissions} />
        </CardContent>
      </Card>
    </div>
  );
}
