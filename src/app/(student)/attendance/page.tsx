import { resolveCurrentStudent, getCurrentUser } from "@/lib/auth";
import { getStudentDailyAttendance } from "@/features/attendance/queries";
import { Activity, ShieldAlert, CheckCircle2, AlertTriangle, Calendar, CalendarCheck2, History } from "lucide-react";
import { ArcGauge } from "@/components/attendance/arc-gauge";
import { WhatIfCalculator } from "@/features/attendance/components/what-if-calculator";
import { CorrectionDialog } from "@/features/attendance/components/correction-dialog";
import { formatNepaliDate } from "@/lib/nepali-date";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";

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
          Please log in as a student to view your attendance barometer and records.
        </p>
      </div>
    );
  }

  // Fetch daily attendance joined with dailySessions and compute TU 80% metrics
  const {
    records,
    presentCount,
    lateCount,
    excusedCount,
    absentCount,
    totalCount,
    metrics,
  } = await getStudentDailyAttendance(student.id);

  // Format daily sessions list for dispute selection
  const recentSessions = records.map((r) => {
    const d = new Date(r.date);
    const bsDate = formatNepaliDate(d, "YYYY MMMM DD");
    const enDate = new Intl.DateTimeFormat("en-US", {
      timeZone: "Asia/Kathmandu",
      month: "short",
      day: "numeric",
      year: "numeric",
    }).format(d);

    return {
      id: r.id,
      dateFormatted: `${bsDate} (${enDate})`,
      subjectName: "Daily Attendance",
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
            Track daily presence and monitor your 80% TU mandatory exam threshold.
          </p>
        </div>
        <div>
          <CorrectionDialog recentSessions={recentSessions} />
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
                <p className="text-xs text-muted-foreground font-medium">
                  No attendance logged yet — your TU 80% projection starts after the first day.
                </p>
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
                        ? `+${metrics.missableSessions} Missable Day${metrics.missableSessions === 1 ? "" : "s"}`
                        : `Need ${metrics.classesNeededToRecover} day${metrics.classesNeededToRecover === 1 ? "" : "s"} to recover (At Risk <80%)`}
                    </span>
                  </p>
                  <p className="text-xs text-muted-foreground mt-1 font-medium">
                    {metrics.attendedSessions} attended of {metrics.totalSessions} logged days (
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

      {/* Chronological Attendance History Ledger */}
      <div className="rounded-xl border bg-card overflow-hidden shadow-sm flex flex-col">
        <div className="px-6 py-4 border-b border-border/50 bg-muted/10 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <History className="w-4 h-4 text-primary" />
            <h3 className="font-semibold text-sm tracking-tight text-foreground font-fira-sans">
              Attendance History Ledger
            </h3>
          </div>
          <span className="text-xs text-muted-foreground font-medium">
            {records.length} Recorded Day{records.length === 1 ? "" : "s"}
          </span>
        </div>

        {records.length === 0 ? (
          <div className="p-12 text-center text-sm text-muted-foreground flex flex-col items-center justify-center space-y-2">
            <CalendarCheck2 className="w-10 h-10 text-muted-foreground/60 mb-1" />
            <p className="font-semibold text-foreground">No attendance records logged yet</p>
            <p className="text-xs text-muted-foreground max-w-sm">
              Attendance records marked by your Class Representative will appear here chronologically.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-muted/10 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="px-6 py-3 border-b">Date (B.S.)</th>
                  <th className="px-6 py-3 border-b">English Date & Day</th>
                  <th className="px-6 py-3 border-b">Semester</th>
                  <th className="px-6 py-3 border-b text-center">Status</th>
                  <th className="px-6 py-3 border-b text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/30">
                {records.map((r) => {
                  const d = new Date(r.date);
                  const nepaliDate = formatNepaliDate(d, "YYYY MMMM DD");
                  const nepaliWeekday = formatNepaliDate(d, "dddd");
                  const englishDate = new Intl.DateTimeFormat("en-US", {
                    timeZone: "Asia/Kathmandu",
                    weekday: "short",
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  }).format(d);

                  const isDisputable = r.status === "absent" || r.status === "late";

                  return (
                    <tr key={r.id} className="hover:bg-muted/20 transition-colors">
                      <td className="px-6 py-4 font-medium text-foreground whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <Calendar className="w-4 h-4 text-primary shrink-0" />
                          <span className="font-semibold">{nepaliDate}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-muted-foreground whitespace-nowrap">
                        <div className="flex flex-col">
                          <span className="font-medium text-foreground">{englishDate}</span>
                          <span className="text-xs text-muted-foreground">{nepaliWeekday}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-muted-foreground">
                        <span className="text-xs font-semibold bg-muted px-2 py-0.5 rounded-md border border-border/40">
                          {r.semester}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center whitespace-nowrap">
                        {r.status === "present" && (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                            Present
                          </span>
                        )}
                        {r.status === "late" && (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                            Late
                          </span>
                        )}
                        {r.status === "excused" && (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-500/10 text-blue-700 dark:text-blue-400 border border-blue-500/20">
                            <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                            Excused
                          </span>
                        )}
                        {r.status === "absent" && (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-destructive/10 text-destructive border border-destructive/20">
                            <span className="w-1.5 h-1.5 rounded-full bg-destructive" />
                            Absent
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-right whitespace-nowrap">
                        {isDisputable ? (
                          <CorrectionDialog
                            recentSessions={recentSessions}
                            defaultAttendanceId={r.id}
                            trigger={
                              <button
                                type="button"
                                className="inline-flex items-center rounded-md border text-xs font-medium px-2.5 py-1 text-amber-700 bg-amber-500/10 border-amber-500/20 hover:bg-amber-500/20 dark:text-amber-400 dark:border-amber-800 gap-1.5 cursor-pointer transition-colors"
                              >
                                <ShieldAlert className="w-3 h-3" />
                                Dispute
                              </button>
                            }
                          />
                        ) : (
                          <span className="text-xs text-muted-foreground/60">—</span>
                        )}
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
