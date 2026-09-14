import { requireAuth } from "@/lib/auth";
import { db } from "@/db";
import { subjects } from "@/db/schema";
import { eq } from "drizzle-orm";
import Link from "next/link";
import { ArrowLeft, Users, CalendarCheck, AlertCircle, Sparkles } from "lucide-react";
import { notFound } from "next/navigation";
import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";
import {
  toRoman,
  toOrdinalSemester,
  areSemestersEqual,
} from "@/lib/utils/roman";
import { getSemesterRosterAttendance } from "@/features/attendance/queries";

export const dynamic = "force-dynamic";

export default async function TeacherRosterPage({
  searchParams,
}: {
  searchParams: Promise<{ semester?: string }>;
}) {
  const user = await requireAuth(["TEACHER"]);

  if (!user.teacherId && user.role !== "ADMIN") {
    return (
      <div className="flex-1 space-y-6 max-w-5xl">
        <div className="p-5 bg-destructive/10 text-destructive-foreground rounded-2xl border border-destructive/20 text-sm font-medium">
          Your account is not linked to a teacher profile. Please contact an administrator.
        </div>
      </div>
    );
  }

  // Get subjects taught by this teacher to find taught semesters
  let teacherSubjects: Array<{ id: string; name: string; code: string; semester: string }> = [];
  if (user.teacherId) {
    teacherSubjects = await db.query.subjects.findMany({
      where: eq(subjects.teacherId, user.teacherId),
    });
  } else if (user.role === "ADMIN") {
    teacherSubjects = await db.query.subjects.findMany();
  }

  const taughtSemesters = [...new Set(teacherSubjects.map((s) => s.semester))];

  if (taughtSemesters.length === 0) {
    return (
      <div className="flex-1 space-y-6 max-w-5xl">
        <div className="p-8 text-center border border-dashed border-border/50 rounded-2xl bg-muted/10">
          <AlertCircle className="w-8 h-8 text-muted-foreground mx-auto mb-2 opacity-80" />
          <h2 className="text-lg font-bold text-foreground">No assigned semesters found</h2>
          <p className="text-sm text-muted-foreground mt-1">
            You do not have any assigned classes or semesters in the system.
          </p>
        </div>
      </div>
    );
  }

  const resolvedParams = await searchParams;
  const rawSemesterParam = resolvedParams?.semester;

  // Fallback to teacher's first semester if none specified
  const activeSemester = rawSemesterParam || taughtSemesters[0];

  // Verify teacher teaches in that semester (or is ADMIN)
  if (user.role !== "ADMIN") {
    const isAuthorized = taughtSemesters.some((s) => areSemestersEqual(s, activeSemester));
    if (!isAuthorized) {
      return notFound();
    }
  }

  const {
    roster,
    totalSessionsLogged: totalDays,
    avgAttendancePercentage: avgAttendance,
  } = await getSemesterRosterAttendance(activeSemester);

  return (
    <div className="flex-1 space-y-8 max-w-5xl">
      {/* Header with Navigation */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Link
            href="/teacher/attendance"
            className={cn(
              buttonVariants({ variant: "ghost", size: "icon" }),
              "rounded-full hover:bg-muted text-muted-foreground"
            )}
            aria-label="Back to Attendance Dashboard"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl md:text-3xl font-bold font-fira-sans tracking-tight text-foreground">
                Attendance Roster
              </h1>
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-primary/10 text-primary border border-primary/20">
                Semester {toRoman(activeSemester)}
              </span>
            </div>
            <p className="text-muted-foreground text-sm mt-0.5">
              {toOrdinalSemester(activeSemester)} • Academic participation and eligibility ledger
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href={`/cr/take-attendance?semester=${encodeURIComponent(toOrdinalSemester(activeSemester))}`}
            className={cn(buttonVariants({ variant: "outline" }), "rounded-xl font-semibold")}
          >
            Take Attendance
          </Link>
        </div>
      </div>

      {/* Semester Switcher Tabs (if teaching multiple semesters) */}
      {taughtSemesters.length > 1 && (
        <div className="flex flex-wrap items-center gap-2 border-b border-border/40 pb-3">
          <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mr-1">
            Semesters:
          </span>
          {taughtSemesters.map((sem) => {
            const isActive = areSemestersEqual(sem, activeSemester);
            return (
              <Link
                key={sem}
                href={`/teacher/attendance/roster?semester=${encodeURIComponent(sem)}`}
                className={cn(
                  "px-3.5 py-1.5 rounded-full text-xs font-bold transition-all",
                  isActive
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
              >
                {toOrdinalSemester(sem)}
              </Link>
            );
          })}
        </div>
      )}

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-6 rounded-2xl border border-border/40 bg-card shadow-sm flex flex-col gap-2">
          <div className="flex items-center gap-2 text-muted-foreground font-medium text-sm">
            <Users className="w-4 h-4 text-primary" />
            Total Students
          </div>
          <div className="text-3xl font-bold font-fira-code text-foreground">{roster.length}</div>
          <p className="text-xs text-muted-foreground">Enrolled in {toOrdinalSemester(activeSemester)}</p>
        </div>

        <div className="p-6 rounded-2xl border border-border/40 bg-card shadow-sm flex flex-col gap-2">
          <div className="flex items-center gap-2 text-muted-foreground font-medium text-sm">
            <CalendarCheck className="w-4 h-4 text-emerald-500" />
            Total Days Logged
          </div>
          <div className="text-3xl font-bold font-fira-code text-foreground">{totalDays}</div>
          <p className="text-xs text-muted-foreground">Daily attendance sessions logged</p>
        </div>

        <div className="p-6 rounded-2xl border border-border/40 bg-card shadow-sm flex flex-col gap-2">
          <div className="flex items-center gap-2 text-muted-foreground font-medium text-sm">
            <Sparkles className="w-4 h-4 text-amber-500" />
            Average Attendance %
          </div>
          <div className={cn(
            "text-3xl font-bold font-fira-code",
            avgAttendance < 80 ? "text-destructive" : "text-emerald-600 dark:text-emerald-400"
          )}>
            {avgAttendance}%
          </div>
          <p className="text-xs text-muted-foreground">Threshold for TU exam eligibility is 80%</p>
        </div>
      </div>

      {/* Roster Table */}
      <div className="rounded-2xl border border-border/40 bg-card shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-muted/40 text-muted-foreground font-semibold border-b border-border/40">
              <tr>
                <th className="px-6 py-4 whitespace-nowrap">Roll No.</th>
                <th className="px-6 py-4 whitespace-nowrap">Student Name</th>
                <th className="px-6 py-4 whitespace-nowrap text-center">Attended Days</th>
                <th className="px-6 py-4 whitespace-nowrap text-center">Absent Days</th>
                <th className="px-6 py-4 whitespace-nowrap text-right">Percentage</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/40">
              {roster.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-muted-foreground italic">
                    No students enrolled in {toOrdinalSemester(activeSemester)}.
                  </td>
                </tr>
              ) : (
                roster.map((row) => {
                  const isSafe = row.percentage >= 80;

                  return (
                    <tr key={row.student.id} className="hover:bg-muted/20 transition-colors">
                      <td className="px-6 py-4 font-fira-code text-muted-foreground font-medium">
                        {row.student.rollNumber}
                      </td>
                      <td className="px-6 py-4 font-semibold text-foreground">
                        {row.student.name}
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className="inline-flex items-center justify-center px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold text-xs">
                          {row.attendedDays} / {totalDays}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        {row.absentDays > 0 ? (
                          <span className="inline-flex items-center justify-center px-2.5 py-0.5 rounded-full bg-destructive/10 text-destructive font-bold text-xs">
                            {row.absentDays}
                          </span>
                        ) : (
                          <span className="text-muted-foreground font-medium">-</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <span
                          className={cn(
                            "font-fira-code font-bold text-sm",
                            isSafe
                              ? "text-emerald-600 dark:text-emerald-400"
                              : "text-destructive"
                          )}
                        >
                          {row.percentage.toFixed(1)}%
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
