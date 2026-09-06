import { requireAuth } from "@/lib/auth";
import { db } from "@/db";
import { subjects, enrollments, attendanceCorrectionRequests, attendance, classSessions, students } from "@/db/schema";
import { eq, and, desc } from "drizzle-orm";
import Link from "next/link";
import { CheckCircle, Users, AlertCircle, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";
import { DisputeActions } from "@/features/attendance/components/dispute-actions";
import { formatNepaliDate } from "@/lib/nepali-date";

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

  // Get subjects taught by this teacher and pending disputes in parallel
  const [teacherSubjects, pendingDisputes] = await Promise.all([
    db.query.subjects.findMany({
      where: eq(subjects.teacherId, user.teacherId),
      with: {
        enrollments: {
          with: {
            student: true,
          },
        },
        classSessions: true,
      },
    }),
    db
      .select({
        id: attendanceCorrectionRequests.id,
        requestedStatus: attendanceCorrectionRequests.requestedStatus,
        reason: attendanceCorrectionRequests.reason,
        status: attendanceCorrectionRequests.status,
        createdAt: attendanceCorrectionRequests.createdAt,
        studentName: students.name,
        studentRoll: students.rollNumber,
        subjectName: subjects.name,
        subjectCode: subjects.code,
        sessionDate: classSessions.sessionDate,
        startTime: classSessions.startTime,
        endTime: classSessions.endTime,
      })
      .from(attendanceCorrectionRequests)
      .innerJoin(attendance, eq(attendanceCorrectionRequests.attendanceId, attendance.id))
      .innerJoin(classSessions, eq(attendance.classSessionId, classSessions.id))
      .innerJoin(subjects, eq(classSessions.subjectId, subjects.id))
      .innerJoin(students, eq(attendanceCorrectionRequests.studentId, students.id))
      .where(
        and(
          eq(attendanceCorrectionRequests.status, "pending"),
          user.role === "ADMIN" ? undefined : eq(subjects.teacherId, user.teacherId)
        )
      )
      .orderBy(desc(attendanceCorrectionRequests.createdAt)),
  ]);

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

      {/* Pending Attendance Disputes Section */}
      <div className="space-y-4 pt-6 border-t border-border/40">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <h2 className="text-2xl font-bold font-fira-sans tracking-tight text-foreground">
                Attendance Dispute Requests
              </h2>
              {pendingDisputes.length > 0 && (
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                  {pendingDisputes.length} pending
                </span>
              )}
            </div>
            <p className="text-sm text-muted-foreground">
              Review and resolve attendance correction requests submitted by students for your lectures.
            </p>
          </div>
        </div>

        {pendingDisputes.length === 0 ? (
          <div className="p-8 text-center border border-dashed border-border/50 rounded-2xl bg-muted/10">
            <CheckCircle className="w-8 h-8 text-emerald-500 mx-auto mb-2 opacity-80" />
            <p className="text-sm font-semibold text-foreground">No pending disputes</p>
            <p className="text-xs text-muted-foreground mt-1">All attendance correction requests have been addressed.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {pendingDisputes.map((dispute) => (
              <div
                key={dispute.id}
                className="rounded-2xl border border-border/50 bg-card p-5 shadow-sm space-y-4"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-foreground">{dispute.studentName}</span>
                      <span className="text-xs text-muted-foreground font-mono">({dispute.studentRoll})</span>
                      <span className="text-[11px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-primary/10 text-primary">
                        {dispute.subjectCode}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {dispute.subjectName} • {formatNepaliDate(dispute.sessionDate, "YYYY MMMM DD")} ({dispute.startTime} - {dispute.endTime})
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">Requested:</span>
                    <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20 capitalize">
                      {dispute.requestedStatus}
                    </span>
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-muted/30 border border-border/30 text-xs">
                  <span className="font-semibold text-foreground">Reason: </span>
                  <span className="text-muted-foreground">{dispute.reason}</span>
                </div>

                <div className="pt-2 border-t border-border/30">
                  <DisputeActions disputeId={dispute.id} />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

