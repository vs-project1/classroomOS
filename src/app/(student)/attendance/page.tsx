import { db } from "@/db";
import { attendance, subjects, enrollments } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { resolveCurrentStudent, getCurrentUser } from "@/lib/auth";
import { calculateAttendanceMetrics } from "@/lib/attendance";
import { Activity, ShieldAlert, CheckCircle2, AlertTriangle } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { ArcGauge } from "@/components/attendance/arc-gauge";
import { WhatIfCalculator } from "./what-if-calculator";
import { CorrectionDialog } from "./correction-dialog";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function AttendancePage() {
  // Teachers/admins have dedicated attendance surfaces — redirect them
  const _viewer = await getCurrentUser();
  if (_viewer?.role === "TEACHER") redirect("/teacher/attendance");
  if (_viewer?.role === "ADMIN") redirect("/admin/attendance");

  const student = await resolveCurrentStudent();

  if (!student) {
    return (
      <div className="flex flex-col items-center justify-center h-[50vh] space-y-4 max-w-md mx-auto text-center border rounded-xl border-dashed bg-muted/5 p-6">
        <div className="h-16 w-16 bg-muted/30 rounded-full flex items-center justify-center mb-2">
          <Activity className="w-8 h-8 text-muted-foreground" />
        </div>
        <h3 className="text-xl font-semibold font-fira-sans tracking-tight">No Student Context Found</h3>
        <p className="text-muted-foreground text-sm leading-relaxed">
          Please log in as a student to view your attendance barometer and lecture records.
        </p>
      </div>
    );
  }

  // Fetch all attendance for this student with relations
  const records = await db.query.attendance.findMany({
    where: eq(attendance.studentId, student.id),
    orderBy: [desc(attendance.createdAt)],
    with: {
      classSession: {
        with: {
          subject: true,
        },
      },
    },
  });

  const presentCount = records.filter((r) => r.status === "present").length;
  const lateCount = records.filter((r) => r.status === "late").length;
  const excusedCount = records.filter((r) => r.status === "excused").length;
  const absentCount = records.filter((r) => r.status === "absent").length;
  const totalCount = records.length;
  // Late counts as attended (present), excused excluded from denominator per TU guidance
  const attendedForMetrics = presentCount + lateCount;
  const effectiveTotal = Math.max(attendedForMetrics, totalCount - excusedCount);

  const metrics = calculateAttendanceMetrics(attendedForMetrics, effectiveTotal, {
    late: lateCount,
    excused: excusedCount,
    absent: absentCount,
  }, 80);

  // Group stats by subject
  const subjectStats: Record<string, { id: string; name: string; code: string; total: number; present: number }> = {};

  // First fetch enrolled subjects to ensure all subjects are listed even if 0 sessions
  const studentEnrollments = await db.query.enrollments.findMany({
    where: eq(enrollments.studentId, student.id),
    with: { subject: true },
  });

  for (const enr of studentEnrollments) {
    if (enr.subject) {
      subjectStats[enr.subject.id] = {
        id: enr.subject.id,
        name: enr.subject.name,
        code: enr.subject.code,
        total: 0,
        present: 0,
      };
    }
  }

  // If no enrollments found, show empty state — never fall back to full catalog
  // (prevents leaking every subject at 0/0 → 100% SAFE). Records for unenrolled
  // subjects still surface via the loop below if attendance exists.

  for (const record of records) {
    const subj = record.classSession?.subject;
    if (subj) {
      if (!subjectStats[subj.id]) {
        subjectStats[subj.id] = { id: subj.id, name: subj.name, code: subj.code, total: 0, present: 0 };
      }
      // Excused excluded from denominator; late counts as present
      if (record.status === "excused") continue;
      subjectStats[subj.id].total++;
      if (record.status === "present" || record.status === "late") {
        subjectStats[subj.id].present++;
      }
    }
  }

  const subjectList = Object.values(subjectStats)
    .map((stat) => {
      const subMetrics = calculateAttendanceMetrics(stat.present, stat.total, undefined, 80);
      return {
        ...stat,
        metrics: subMetrics,
      };
    })
    .sort((a, b) => b.metrics.percentage - a.metrics.percentage);

  // Format session list for dispute selection
  const sessionOptions = records.map((r) => {
    const sessionDate = r.classSession?.sessionDate
      ? new Intl.DateTimeFormat("en-US", {
          timeZone: "Asia/Kathmandu",
          month: "short",
          day: "numeric",
          year: "numeric",
        }).format(new Date(r.classSession.sessionDate))
      : "Unknown Date";

    return {
      id: r.id,
      dateFormatted: sessionDate,
      subjectName: r.classSession?.subject?.name || "Lecture Session",
      status: r.status,
    };
  });

  const isSafe = metrics.category === "SAFE";
  const isDanger = metrics.category === "DANGER";
  const isCaution = metrics.category === "CAUTION";

  return (
    <div className="flex-1 space-y-8 max-w-6xl mx-auto w-full">
      {/* Header & Dispute Trigger */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pb-6 border-b border-border/40">
        <div>
          <h2 className="text-2xl md:text-3xl font-bold font-fira-sans tracking-tight text-foreground">
            Attendance
          </h2>
          <p className="text-muted-foreground text-sm mt-1 max-w-2xl">
            Track lecture presence across your subjects and monitor your 80% TU mandatory exam threshold.
          </p>
        </div>
        <div>
          <CorrectionDialog recentSessions={sessionOptions} />
        </div>
      </div>

      {/* Top Grid: Barometer & What-If Calculator */}
      <div className="grid gap-6 md:grid-cols-12">
        {/* Overall Barometer Card */}
        <div className="md:col-span-6 rounded-xl border bg-card p-6 flex flex-col justify-between shadow-sm">
          <div className="flex justify-between items-start mb-4">
            <div className="flex items-center gap-2">
              <ShieldAlert className={`w-5 h-5 ${isSafe ? "text-emerald-500" : isDanger ? "text-destructive" : "text-amber-500"}`} />
              <h3 className="font-semibold text-xs tracking-wider uppercase text-muted-foreground">
                TU 80% Mandate Barometer
              </h3>
            </div>
            <span
              className={`px-2.5 py-0.5 rounded-full text-xs font-bold border ${
                isSafe
                  ? "text-emerald-700 bg-emerald-500/10 border-emerald-500/20 dark:text-emerald-400 dark:bg-emerald-950/50 dark:border-emerald-800"
                  : isDanger
                  ? "text-destructive bg-destructive/10 border-destructive/20"
                  : "text-amber-700 bg-amber-500/10 border-amber-500/20 dark:text-amber-400 dark:bg-amber-950/50 dark:border-amber-800"
              }`}
            >
              {metrics.category}
            </span>
          </div>

            <div className="flex flex-col items-center justify-center py-2 text-center">
              <div className="flex justify-center py-2">
                <ArcGauge value={metrics.percentage} category={metrics.category} />
              </div>

            <div className="w-full bg-muted/30 rounded-xl p-3.5 border border-border/40">
              {totalCount === 0 ? (
                <p className="text-xs text-muted-foreground font-medium">No lectures logged yet — your TU 80% projection starts after the first session.</p>
              ) : (
                <>
                  <p className="text-xs font-semibold text-foreground">
                    Safety Buffer:{" "}
                    <span
                      className={
                        isSafe
                          ? "text-emerald-600 dark:text-emerald-400 font-bold"
                          : "text-destructive font-bold"
                      }
                    >
                      {isSafe
                        ? `+${metrics.missableSessions} Missable Session${metrics.missableSessions === 1 ? "" : "s"}`
                        : `Need ${metrics.classesNeededToRecover} class${metrics.classesNeededToRecover === 1 ? "" : "es"} to recover (At Risk <80%)`}
                    </span>
                  </p>
                  <p className="text-xs text-muted-foreground mt-1 font-medium">
                    {metrics.attendedSessions} attended of {metrics.totalSessions} logged lectures (
                    {metrics.absentSessions} absent, {metrics.lateSessions} late, {metrics.excusedSessions} excused)
                  </p>
                </>
              )}
            </div>
          </div>
        </div>

        {/* What-If Simulator Card */}
        <div className="md:col-span-6 flex flex-col">
          <WhatIfCalculator
            initialAttended={metrics.attendedSessions}
            initialTotal={metrics.totalSessions}
          />
        </div>
      </div>

      {/* Subject Breakdown Table */}
      <div className="rounded-xl border bg-card overflow-hidden shadow-sm flex flex-col">
        <div className="px-6 py-4 border-b border-border/50 bg-muted/10 flex items-center justify-between">
          <h3 className="font-semibold text-xs tracking-wider uppercase text-muted-foreground">
            Subject Breakdown Matrix
          </h3>
          <span className="text-xs text-muted-foreground font-medium">
            {subjectList.length} Enrolled Subject{subjectList.length === 1 ? "" : "s"}
          </span>
        </div>
        {subjectList.length === 0 ? (
          <div className="p-8 text-center text-sm text-muted-foreground">
            <p>No enrollments found. Contact administration to get enrolled in subjects.</p>
            <p className="text-xs mt-1">Once enrolled, your per-subject attendance will appear here.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-muted/10 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="px-6 py-3 border-b">Module</th>
                  <th className="px-6 py-3 border-b text-right">Attended</th>
                  <th className="px-6 py-3 border-b text-right">Total</th>
                  <th className="px-6 py-3 border-b">Progress</th>
                  <th className="px-6 py-3 border-b text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/30">
                {subjectList.map((subj) => {
                  const subSafe = subj.metrics.category === "SAFE";
                  const subDanger = subj.metrics.category === "DANGER";
                  return (
                    <tr key={subj.id} className="hover:bg-muted/20 transition-colors">
                      <td className="px-6 py-4 font-medium text-foreground">
                        <div className="flex items-center gap-2">
                          <span>{subj.name}</span>
                          <span className="text-xs bg-muted text-foreground px-2 py-0.5 rounded-md font-bold border border-border/40">
                            {subj.code}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right tabular-nums text-muted-foreground font-medium">
                        {subj.present}
                      </td>
                      <td className="px-6 py-4 text-right tabular-nums text-muted-foreground font-medium">
                        {subj.total}
                      </td>
                      <td className="px-6 py-4 w-40">
                        <Progress
                          value={subj.metrics.percentage}
                          className={`h-1.5 rounded-full bg-muted ${
                            subSafe
                              ? "[&>div]:bg-emerald-500"
                              : subDanger
                              ? "[&>div]:bg-destructive"
                              : "[&>div]:bg-amber-500"
                          }`}
                        />
                      </td>
                      <td className="px-6 py-4 text-right">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold tabular-nums ${
                            subSafe
                              ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
                              : subDanger
                              ? "bg-destructive/10 text-destructive"
                              : "bg-amber-500/10 text-amber-700 dark:text-amber-400"
                          }`}
                        >
                          {subj.metrics.percentage}%
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
