import { requireAuth } from "@/lib/auth";
import { db } from "@/db";
import { subjects, enrollments, students, studentProfiles } from "@/db/schema";
import { eq } from "drizzle-orm";
import Link from "next/link";
import { CheckCircle, Users, AlertCircle, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";

export const dynamic = "force-dynamic";

export default async function TeacherAttendancePage() {
  const user = await requireAuth(["TEACHER", "ADMIN"]);

  if (!user.teacherId) {
    return (
      <div className="flex-1 space-y-6 max-w-5xl">
        <h1 className="text-3xl font-bold font-fira-sans tracking-tight text-foreground">Attendance Dashboard</h1>
        <div className="p-5 bg-destructive/10 text-destructive-foreground rounded-2xl border border-destructive/20 text-sm font-medium flex items-center gap-2">
          <AlertCircle className="h-5 w-5" />
          Your account is not linked to a teacher profile. Please contact an administrator.
        </div>
      </div>
    );
  }

  // Get subjects taught by this teacher
  const teacherSubjects = await db.query.subjects.findMany({
    where: eq(subjects.teacherId, user.teacherId),
    with: {
      enrollments: {
        with: {
          student: true,
        },
      },
      classSessions: true,
    },
  });

  return (
    <div className="flex-1 space-y-8 max-w-5xl">
      <div className="flex flex-col gap-1.5 pb-6 border-b border-border/40">
        <h1 className="text-3xl md:text-4xl font-bold font-fira-sans tracking-tight text-foreground">
          Attendance Dashboard
        </h1>
        <p className="text-muted-foreground text-base max-w-2xl">
          Manage attendance rosters and monitor class participation.
        </p>
      </div>

      {teacherSubjects.length === 0 ? (
        <div className="py-20 text-center flex flex-col items-center justify-center border border-dashed border-border/50 rounded-3xl bg-muted/20">
          <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
            <CheckCircle className="w-8 h-8 text-primary" />
          </div>
          <h2 className="text-xl font-bold text-foreground">No classes found</h2>
          <p className="text-muted-foreground mt-2 max-w-sm">
            You don't have any assigned subjects yet. Once you do, you'll be able to manage attendance here.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {teacherSubjects.map((subject) => {
            const studentCount = subject.enrollments?.length || 0;
            const sessionCount = subject.classSessions?.length || 0;

            return (
              <div
                key={subject.id}
                className="group flex flex-col overflow-hidden rounded-3xl border border-border/50 bg-card p-6 shadow-sm transition-all"
              >
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <span className="inline-flex h-7 items-center rounded-full bg-primary/10 px-3 text-[11px] font-bold uppercase tracking-wider text-primary">
                      {subject.code}
                    </span>
                    <h3 className="font-fira-sans text-xl font-bold leading-tight text-foreground">
                      {subject.name}
                    </h3>
                  </div>
                </div>

                <div className="mt-6 mb-8 flex gap-6">
                  <div className="space-y-1">
                    <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Students</p>
                    <p className="text-2xl font-bold text-foreground flex items-center gap-2">
                      <Users className="h-5 w-5 text-primary" />
                      {studentCount}
                    </p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Sessions</p>
                    <p className="text-2xl font-bold text-foreground flex items-center gap-2">
                      <CheckCircle className="h-5 w-5 text-emerald-500" />
                      {sessionCount}
                    </p>
                  </div>
                </div>

                <div className="mt-auto flex flex-wrap gap-3 pt-4 border-t border-border/40">
                  <Link
                    href={`/teacher/attendance/roster?subjectId=${subject.id}`}
                    className={cn(buttonVariants({ variant: "default" }), "rounded-xl font-semibold")}
                  >
                    View Roster <ArrowRight className="ml-1.5 h-4 w-4" />
                  </Link>
                  <Link
                    href={`/teacher/lecture-logs?subject=${subject.id}`}
                    className={cn(buttonVariants({ variant: "outline" }), "rounded-xl font-semibold")}
                  >
                    Class History
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
