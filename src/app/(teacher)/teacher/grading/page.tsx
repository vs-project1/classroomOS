import { requireAuth } from "@/lib/auth";
import { db } from "@/db";
import { assignmentSubmissions, homework, students, subjects } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { FileText, CheckCircle } from "lucide-react";
import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

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
          {submissions.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground border rounded-lg bg-muted/20">
              <CheckCircle className="w-8 h-8 mx-auto mb-2 opacity-20" />
              <p>No submissions found.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {submissions.map(({ submission, homework, student, subject }) => (
                <div key={submission.id} className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 p-4 rounded-lg border bg-card hover:bg-muted/50 transition-colors">
                  <div className="flex items-start gap-3">
                    <div className="bg-primary/10 p-2 rounded-lg shrink-0 mt-1">
                      <FileText className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold">{homework.title}</h3>
                        <Badge variant={submission.status === "graded" ? "default" : (submission.status === "submitted" ? "secondary" : "outline")}>
                          {submission.status}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        <span className="font-medium text-foreground">{student.name}</span> • {subject.name}
                      </p>
                      {submission.submittedAt && (
                        <p className="text-xs text-muted-foreground mt-1">
                          Submitted: {new Date(submission.submittedAt).toLocaleDateString()}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex shrink-0">
                    {/* UI placeholder for grading action */}
                    <button className={cn(buttonVariants({ variant: "outline", size: "sm" }))} disabled>
                      {submission.status === "graded" ? "View Grade" : "Grade Now"}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
