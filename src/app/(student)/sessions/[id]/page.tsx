import { db } from "@/db";
import { classSessions } from "@/db/schema";
import { eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { ArrowLeft, BookOpen, Clock, Users } from "lucide-react";
import { formatTime12h } from "@/lib/time";

export const dynamic = "force-dynamic";

export default async function SessionDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const session = await db.query.classSessions.findFirst({
    where: eq(classSessions.id, id),
    with: {
      subject: true,
      lectureLog: true,
      attendance: {
        with: {
          student: true,
        }
      }
    }
  });

  if (!session) {
    notFound();
  }

  // Aggregate attendance
  const totals = {
    present: session.attendance.filter(a => a.status === 'present').length,
    absent: session.attendance.filter(a => a.status === 'absent').length,
    late: session.attendance.filter(a => a.status === 'late').length,
    excused: session.attendance.filter(a => a.status === 'excused').length,
  };

  // Group students
  const groupedAttendance = {
    present: session.attendance.filter(a => a.status === 'present').sort((a, b) => a.student.name.localeCompare(b.student.name)),
    late: session.attendance.filter(a => a.status === 'late').sort((a, b) => a.student.name.localeCompare(b.student.name)),
    absent: session.attendance.filter(a => a.status === 'absent').sort((a, b) => a.student.name.localeCompare(b.student.name)),
    excused: session.attendance.filter(a => a.status === 'excused').sort((a, b) => a.student.name.localeCompare(b.student.name)),
  };

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

        <div className="rounded-xl border bg-card p-6">
          <div className="flex items-center gap-2 mb-6">
            <Users className="h-5 w-5 text-muted-foreground" />
            <h3 className="font-medium text-lg">Attendance Summary</h3>
          </div>
          
          <div className="grid grid-cols-4 gap-4 mb-8">
            <div className="flex flex-col">
              <span className="text-2xl font-semibold text-emerald-600">{totals.present}</span>
              <span className="text-xs font-medium text-muted-foreground">Present</span>
            </div>
            <div className="flex flex-col">
              <span className="text-2xl font-semibold text-red-600">{totals.absent}</span>
              <span className="text-xs font-medium text-muted-foreground">Absent</span>
            </div>
            <div className="flex flex-col">
              <span className="text-2xl font-semibold text-amber-600">{totals.late}</span>
              <span className="text-xs font-medium text-muted-foreground">Late</span>
            </div>
            <div className="flex flex-col">
              <span className="text-2xl font-semibold text-blue-600">{totals.excused}</span>
              <span className="text-xs font-medium text-muted-foreground">Excused</span>
            </div>
          </div>

          <div className="space-y-6 border-t pt-6">
            {Object.entries(groupedAttendance).map(([status, records]) => {
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
      </div>
    </div>
  );
}
