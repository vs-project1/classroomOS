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
    <div className="flex-1 space-y-6 p-8 pt-6">
      <div className="flex items-center gap-4">
        <Link href="/sessions" className={buttonVariants({ variant: "outline", size: "icon" })}>
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div>
          <h2 className="text-3xl font-bold tracking-tight">{session.subject.name}</h2>
          <p className="text-muted-foreground mt-1 flex items-center gap-2">
            <Clock className="h-4 w-4" />
            {new Intl.DateTimeFormat('en-US', { timeZone: 'Asia/Kathmandu', dateStyle: 'full' }).format(session.sessionDate)} | {formatTime12h(session.startTime)} - {formatTime12h(session.endTime)}
          </p>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BookOpen className="h-5 w-5" />
              Lecture Log
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h4 className="font-semibold text-sm">Topics Covered</h4>
              <p className="text-muted-foreground whitespace-pre-wrap mt-1">{session.lectureLog?.topicsCovered || "None recorded."}</p>
            </div>
            <div>
              <h4 className="font-semibold text-sm">Homework</h4>
              <p className="text-muted-foreground whitespace-pre-wrap mt-1">{session.lectureLog?.homework || "None assigned."}</p>
            </div>
            <div>
              <h4 className="font-semibold text-sm">Notes</h4>
              <p className="text-muted-foreground whitespace-pre-wrap mt-1">{session.lectureLog?.notes || "No notes."}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Attendance Summary
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="bg-green-50 text-green-700 p-4 rounded-lg flex flex-col items-center justify-center">
                <span className="text-3xl font-bold">{totals.present}</span>
                <span className="text-sm font-medium">Present</span>
              </div>
              <div className="bg-red-50 text-red-700 p-4 rounded-lg flex flex-col items-center justify-center">
                <span className="text-3xl font-bold">{totals.absent}</span>
                <span className="text-sm font-medium">Absent</span>
              </div>
              <div className="bg-yellow-50 text-yellow-700 p-4 rounded-lg flex flex-col items-center justify-center">
                <span className="text-3xl font-bold">{totals.late}</span>
                <span className="text-sm font-medium">Late</span>
              </div>
              <div className="bg-slate-100 text-slate-700 p-4 rounded-lg flex flex-col items-center justify-center">
                <span className="text-3xl font-bold">{totals.excused}</span>
                <span className="text-sm font-medium">Excused</span>
              </div>
            </div>

            <div className="space-y-4">
              {Object.entries(groupedAttendance).map(([status, records]) => {
                if (records.length === 0) return null;
                return (
                  <div key={status}>
                    <h4 className="font-semibold text-sm capitalize mb-2">{status} ({records.length})</h4>
                    <div className="flex flex-wrap gap-2">
                      {records.map(record => (
                        <Badge key={record.id} variant={status === 'absent' ? 'destructive' : status === 'present' ? 'default' : 'secondary'}>
                          {record.student.name}
                        </Badge>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
