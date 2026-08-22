import { db } from "@/db";
import { attendance, classSessions, type Student, type AttendanceStatus } from "@/db/schema";
import { and, eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { ArrowLeft, BookOpen, Clock, Users } from "lucide-react";
import { formatTime12h } from "@/lib/time";
import { getCurrentUser, resolveCurrentStudent } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function SessionDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getCurrentUser();
  const isStudentOnly = !user || user.role === "STUDENT";

  const session = await db.query.classSessions.findFirst({
    where: eq(classSessions.id, id),
    with: {
      subject: true,
      lectureLog: true,
    },
  });

  if (!session) {
    notFound();
  }

  // Students only ever see their own attendance record — never the roster.
  let ownAttendance: { status: AttendanceStatus } | null = null;
  type RosterRecord = {
    id: string;
    status: string;
    student: Student;
  };
  let totals: { present: number; absent: number; late: number; excused: number } | null = null;
  let groupedAttendance: Record<string, RosterRecord[]> | null = null;

  if (isStudentOnly) {
    const student = await resolveCurrentStudent();
    if (student) {
      const record = await db.query.attendance.findFirst({
        where: and(
          eq(attendance.classSessionId, id),
          eq(attendance.studentId, student.id)
        ),
      });
      ownAttendance = record ? { status: record.status as AttendanceStatus } : null;
    }
  } else {
    const rows = await db.query.attendance.findMany({
      where: eq(attendance.classSessionId, id),
      with: { student: true },
    });

    // Aggregate attendance
    totals = {
      present: rows.filter(a => a.status === 'present').length,
      absent: rows.filter(a => a.status === 'absent').length,
      late: rows.filter(a => a.status === 'late').length,
      excused: rows.filter(a => a.status === 'excused').length,
    };

    // Group students
    groupedAttendance = {
      present: rows.filter(a => a.status === 'present').sort((a, b) => a.student.name.localeCompare(b.student.name)),
      late: rows.filter(a => a.status === 'late').sort((a, b) => a.student.name.localeCompare(b.student.name)),
      absent: rows.filter(a => a.status === 'absent').sort((a, b) => a.student.name.localeCompare(b.student.name)),
      excused: rows.filter(a => a.status === 'excused').sort((a, b) => a.student.name.localeCompare(b.student.name)),
    };
  }

  return (
    <div className="flex-1 space-y-8 max-w-6xl">
      <div className="flex items-center gap-4">
        <Link href="/lecture-logs" className={buttonVariants({ variant: "ghost", size: "icon" })}>
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">{session.subject.name}</h2>
          <p className="text-muted-foreground mt-1 flex items-center gap-2 text-sm">
            <Clock className="h-4 w-4" />
            {new Intl.DateTimeFormat('en-US', { timeZone: 'Asia/Kathmandu', dateStyle: 'full' }).format(session.sessionDate)} | {formatTime12h(session.startTime)} - {formatTime12h(session.endTime)}
          </p>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <div className="rounded-xl border bg-card p-6">
          <div className="flex items-center gap-2 mb-6">
            <BookOpen className="h-5 w-5 text-muted-foreground" />
            <h3 className="font-medium text-lg">Session Log</h3>
          </div>
          <div className="space-y-6">
            <div>
              <h4 className="text-xs uppercase tracking-wider font-medium text-muted-foreground mb-2">Topics Covered</h4>
              <p className="text-foreground whitespace-pre-wrap">{session.lectureLog?.topicsCovered || "None recorded."}</p>
            </div>
            <div>
              <h4 className="text-xs uppercase tracking-wider font-medium text-muted-foreground mb-2">Homework</h4>
              <p className="text-foreground whitespace-pre-wrap">{session.lectureLog?.homework || "None assigned."}</p>
            </div>
            <div>
              <h4 className="text-xs uppercase tracking-wider font-medium text-muted-foreground mb-2">Notes</h4>
              <p className="text-foreground whitespace-pre-wrap">{session.lectureLog?.notes || "No notes."}</p>
            </div>
          </div>
        </div>

        {isStudentOnly ? (
          <div className="rounded-xl border bg-card p-6">
            <div className="flex items-center gap-2 mb-6">
              <Users className="h-5 w-5 text-muted-foreground" />
              <h3 className="font-medium text-lg">Your Attendance</h3>
            </div>
            {ownAttendance ? (
              <div className="space-y-3">
                <span
                  className={`px-2.5 py-1 text-xs font-medium rounded-md border ${
                    ownAttendance.status === "present"
                      ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                      : ownAttendance.status === "absent"
                        ? "bg-red-50 text-red-700 border-red-200"
                        : ownAttendance.status === "late"
                          ? "bg-amber-50 text-amber-700 border-amber-200"
                          : "bg-blue-50 text-blue-700 border-blue-200"
                  }`}
                >
                  {ownAttendance.status}
                </span>
                <p className="text-sm text-muted-foreground">
                  Your attendance for this session is shown above. Class-wide details are not available to students.
                </p>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No attendance has been recorded for you in this session yet.</p>
            )}
          </div>
        ) : (
          <div className="rounded-xl border bg-card p-6">
            <div className="flex items-center gap-2 mb-6">
              <Users className="h-5 w-5 text-muted-foreground" />
              <h3 className="font-medium text-lg">Attendance Summary</h3>
            </div>

            <div className="grid grid-cols-4 gap-4 mb-8">
              <div className="flex flex-col">
                <span className="text-2xl font-semibold text-emerald-600">{totals!.present}</span>
                <span className="text-xs font-medium text-muted-foreground">Present</span>
              </div>
              <div className="flex flex-col">
                <span className="text-2xl font-semibold text-red-600">{totals!.absent}</span>
                <span className="text-xs font-medium text-muted-foreground">Absent</span>
              </div>
              <div className="flex flex-col">
                <span className="text-2xl font-semibold text-amber-600">{totals!.late}</span>
                <span className="text-xs font-medium text-muted-foreground">Late</span>
              </div>
              <div className="flex flex-col">
                <span className="text-2xl font-semibold text-blue-600">{totals!.excused}</span>
                <span className="text-xs font-medium text-muted-foreground">Excused</span>
              </div>
            </div>

            <div className="space-y-6 border-t pt-6">
              {Object.entries(groupedAttendance!).map(([status, records]) => {
                if (records.length === 0) return null;

                const statusColors = {
                  present: "bg-emerald-50 text-emerald-700 border-emerald-200",
                  absent: "bg-red-50 text-red-700 border-red-200",
                  late: "bg-amber-50 text-amber-700 border-amber-200",
                  excused: "bg-blue-50 text-blue-700 border-blue-200"
                };

                return (
                  <div key={status}>
                    <h4 className="text-xs uppercase tracking-wider font-medium text-muted-foreground mb-3">{status} ({records.length})</h4>
                    <div className="flex flex-wrap gap-2">
                      {records.map(record => (
                        <span key={record.id} className={`px-2.5 py-1 text-xs font-medium rounded-md border ${statusColors[status as keyof typeof statusColors]}`}>
                          {record.student.name}
                        </span>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
