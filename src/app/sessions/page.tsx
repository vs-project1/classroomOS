import { db } from "@/db";
import { classSessions } from "@/db/schema";
import { desc } from "drizzle-orm";
import Link from "next/link";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatTime12h } from "@/lib/time";

export default async function SessionsPage() {
  const allSessions = await db.query.classSessions.findMany({
    with: {
      subject: true,
      lectureLog: true,
      attendance: true,
    },
    orderBy: [desc(classSessions.sessionDate)],
  });

  return (
    <div className="flex-1 space-y-4 p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">Class Sessions</h2>
        <Link href="/sessions/new" className={buttonVariants()}>
          Log New Session
        </Link>
      </div>

      <div className="rounded-md border mt-4">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Subject</TableHead>
              <TableHead>Topics</TableHead>
              <TableHead>Attendance</TableHead>
              <TableHead className="w-20"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {allSessions.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="h-24 text-center">
                  No sessions logged yet.
                </TableCell>
              </TableRow>
            ) : (
              allSessions.map((session) => {
                const presentCount = session.attendance.filter(a => a.status === 'present').length;
                const absentCount = session.attendance.filter(a => a.status === 'absent').length;
                const lateCount = session.attendance.filter(a => a.status === 'late').length;
                const excusedCount = session.attendance.filter(a => a.status === 'excused').length;

                return (
                  <TableRow key={session.id}>
                    <TableCell className="font-medium">
                      <Link href={`/sessions/${session.id}`} className="hover:underline">
                        {new Intl.DateTimeFormat('en-US', { timeZone: 'Asia/Kathmandu', dateStyle: 'medium' }).format(new Date(session.sessionDate))}<br/>
                        <span className="text-xs text-muted-foreground">{formatTime12h(session.startTime)} - {formatTime12h(session.endTime)}</span>
                      </Link>
                    </TableCell>
                    <TableCell>{session.subject?.name}</TableCell>
                    <TableCell className="max-w-[200px] truncate">
                      {session.lectureLog?.topicsCovered}
                    </TableCell>
                    <TableCell className="text-sm">
                      <span className="text-green-600 font-medium">{presentCount} Present</span>
                      {absentCount > 0 && <span className="ml-2 text-destructive">{absentCount} Absent</span>}
                      {lateCount > 0 && <span className="ml-2 text-orange-500">{lateCount} Late</span>}
                      {excusedCount > 0 && <span className="ml-2 text-blue-500">{excusedCount} Excused</span>}
                    </TableCell>
                    <TableCell>
                      <Link href={`/sessions/${session.id}`} className={buttonVariants({ variant: "ghost", size: "sm" })}>
                        View
                      </Link>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
