import { requireAuth } from "@/lib/auth";
import { db } from "@/db";
import { subjects, classSessions, attendance, attendanceCorrectionRequests, students } from "@/db/schema";
import { eq, desc, count, and } from "drizzle-orm";
import Link from "next/link";
import { CheckCircle, Clock, Users, AlertTriangle } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function TeacherAttendancePage() {
  const user = await requireAuth(["TEACHER", "ADMIN"]);

  if (!user.teacherId && user.role !== "ADMIN") {
    return (
      <div className="flex flex-col items-center justify-center h-[40vh] space-y-4 max-w-md mx-auto text-center border rounded-xl border-dashed bg-muted/5 p-6">
        <Users className="w-8 h-8 text-muted-foreground" />
        <h3 className="text-lg font-semibold">No Teacher Profile Linked</h3>
        <p className="text-muted-foreground text-sm">Your account is not linked to a teacher profile. Contact administration.</p>
      </div>
    );
  }

  // Admin sees all sessions; teacher sees only assigned subjects
  const assignedSubjects = user.teacherId
    ? await db.select().from(subjects).where(eq(subjects.teacherId, user.teacherId))
    : await db.select().from(subjects);

  if (assignedSubjects.length === 0) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl md:text-3xl font-bold tracking-tight">Attendance</h2>
          <p className="text-muted-foreground text-sm mt-1">Manage class attendance for your subjects.</p>
        </div>
        <div className="rounded-xl border border-dashed bg-muted/5 p-8 text-center">
          <p className="text-sm text-muted-foreground">No subjects assigned to you yet.</p>
          <Link href="/subjects" className="text-sm text-primary underline mt-2 inline-block">Browse subjects</Link>
        </div>
      </div>
    );
  }

  const subjectIds = assignedSubjects.map((s) => s.id);

  // Fetch recent sessions for these subjects with attendance counts
  const sessions = await db.query.classSessions.findMany({
    where: (cs, { inArray }) => inArray(cs.subjectId, subjectIds),
    orderBy: [desc(classSessions.sessionDate)],
    with: {
      subject: true,
      attendance: true,
    },
    limit: 50,
  });

  // Pending disputes for teacher's subjects
  let pendingDisputes: { id: string; studentName: string; subjectName: string; reason: string }[] = [];
  if (sessions.length > 0) {
    // Use join to find disputes scoped to teacher subjects
    const disputeRows = await db
      .select({
        id: attendanceCorrectionRequests.id,
        reason: attendanceCorrectionRequests.reason,
        studentName: students.name,
        subjectName: subjects.name,
      })
      .from(attendanceCorrectionRequests)
      .innerJoin(attendance, eq(attendanceCorrectionRequests.attendanceId, attendance.id))
      .innerJoin(classSessions, eq(attendance.classSessionId, classSessions.id))
      .innerJoin(subjects, eq(classSessions.subjectId, subjects.id))
      .innerJoin(students, eq(attendanceCorrectionRequests.studentId, students.id))
      .where(
        and(
          eq(attendanceCorrectionRequests.status, "pending"),
          user.teacherId ? eq(subjects.teacherId, user.teacherId) : undefined
        )
      )
      .orderBy(desc(attendanceCorrectionRequests.createdAt))
      .limit(5);
    pendingDisputes = disputeRows;
  }

  return (
    <div className="flex-1 space-y-6 max-w-6xl mx-auto w-full">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pb-6 border-b border-border/40">
        <div>
          <h2 className="text-2xl md:text-3xl font-bold tracking-tight">Attendance</h2>
          <p className="text-muted-foreground text-sm mt-1 max-w-2xl">
            Review class sessions, attendance rosters and pending correction requests for your assigned subjects.
          </p>
        </div>
        <Link
          href="/teacher/lecture-logs"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border bg-card text-sm font-medium hover:bg-muted transition-colors"
        >
          <Clock className="w-4 h-4" /> Class History
        </Link>
      </div>

      {pendingDisputes.length > 0 && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 dark:bg-amber-950/30 p-4">
          <div className="flex items-center gap-2 text-sm font-semibold text-amber-800 dark:text-amber-200">
            <AlertTriangle className="w-4 h-4" /> {pendingDisputes.length} pending correction request{pendingDisputes.length === 1 ? "" : "s"}
          </div>
          <ul className="mt-2 space-y-1 text-xs text-amber-800/80 dark:text-amber-200/80">
            {pendingDisputes.map((d) => (
              <li key={d.id} className="truncate">
                {d.studentName} — {d.subjectName}: {d.reason.slice(0, 80)}
              </li>
            ))}
          </ul>
          <Link href="/admin/attendance" className="text-xs font-medium text-amber-800 dark:text-amber-300 underline mt-2 inline-block">
            Review requests
          </Link>
        </div>
      )}

      <div className="rounded-xl border bg-card overflow-hidden shadow-sm">
        <div className="px-6 py-4 border-b border-border/50 bg-muted/10 flex items-center justify-between">
          <h3 className="font-semibold text-xs tracking-wider uppercase text-muted-foreground">Recent Class Sessions</h3>
          <span className="text-xs text-muted-foreground">{sessions.length} session{sessions.length === 1 ? "" : "s"}</span>
        </div>
        {sessions.length === 0 ? (
          <div className="p-12 text-center">
            <CheckCircle className="w-8 h-8 text-muted-foreground mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">No sessions logged yet for your subjects.</p>
            <p className="text-xs text-muted-foreground mt-1">Sessions appear here after you or your CR logs them.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-muted/10 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="px-6 py-3 border-b">Date</th>
                  <th className="px-6 py-3 border-b">Subject</th>
                  <th className="px-6 py-3 border-b">Time</th>
                  <th className="px-6 py-3 border-b text-right">Present</th>
                  <th className="px-6 py-3 border-b text-right">Total</th>
                  <th className="px-6 py-3 border-b text-right">Rate</th>
                  <th className="px-6 py-3 border-b"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/30">
                {sessions.map((s) => {
                  const total = s.attendance.length;
                  const present = s.attendance.filter((a) => a.status === "present" || a.status === "late").length;
                  const pct = total === 0 ? 0 : Math.round((present / total) * 100);
                  const dateStr = new Intl.DateTimeFormat("en-CA", {
                    timeZone: "Asia/Kathmandu",
                    year: "numeric",
                    month: "short",
                    day: "numeric",
                  }).format(new Date(s.sessionDate));
                  return (
                    <tr key={s.id} className="hover:bg-muted/20">
                      <td className="px-6 py-3 font-medium tabular-nums">{dateStr}</td>
                      <td className="px-6 py-3">
                        <span className="font-medium">{s.subject?.name}</span>
                        <span className="ml-2 text-xs bg-muted px-1.5 py-0.5 rounded border">{s.subject?.code}</span>
                      </td>
                      <td className="px-6 py-3 tabular-nums text-muted-foreground">{s.startTime}–{s.endTime}</td>
                      <td className="px-6 py-3 text-right tabular-nums">{present}</td>
                      <td className="px-6 py-3 text-right tabular-nums">{total}</td>
                      <td className="px-6 py-3 text-right tabular-nums font-semibold">{pct}%</td>
                      <td className="px-6 py-3 text-right">
                        <Link href={`/lecture-logs`} className="text-xs font-medium text-primary hover:underline">
                          View
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="rounded-xl border border-dashed bg-muted/20 p-4 text-xs text-muted-foreground">
        Looking for a student&apos;s TU 80% barometer? Students see their own barometer at <span className="font-mono">/attendance</span>. As a teacher you manage rosters here and review disputes at <Link href="/admin/attendance" className="text-primary underline">Attendance Reviews</Link>.
      </div>
    </div>
  );
}
