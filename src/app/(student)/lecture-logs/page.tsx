import { db } from "@/db";
import { classSessions, enrollments } from "@/db/schema";
import { desc, eq, inArray } from "drizzle-orm";
import { requireAuth, resolveCurrentStudent } from "@/lib/auth";
import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { formatTime12h } from "@/lib/time";
import { SectionCard } from "@/components/student/section-card";
import { FileText, Calendar, Clock } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function LectureLogsPage() {
  const user = await requireAuth(["STUDENT", "CR", "ADMIN", "TEACHER"]);
  const student = await resolveCurrentStudent();

  let enrolledSubjectIds: string[] = [];

  if (student) {
    const userEnrollments = await db.query.enrollments.findMany({
      where: eq(enrollments.studentId, student.id),
    });
    enrolledSubjectIds = userEnrollments.map((e) => e.subjectId);
  }

  const allSessions = await db.query.classSessions.findMany({
    where: enrolledSubjectIds.length > 0
      ? inArray(classSessions.subjectId, enrolledSubjectIds)
      : undefined,
    with: {
      subject: true,
      lectureLog: true,
    },
    orderBy: [desc(classSessions.sessionDate), desc(classSessions.startTime)],
  });

  return (
    <div className="flex-1 space-y-8 max-w-5xl">
      <div className="flex flex-col gap-1.5 pb-6 border-b border-border/40">
        <h2 className="text-2xl md:text-3xl font-bold font-fira-sans tracking-tight text-foreground">Session Logs</h2>
        <p className="text-muted-foreground text-sm max-w-2xl">Review syllabus coverage and topics covered in previous lectures.</p>
      </div>

      <div className="space-y-3">
        {allSessions.length === 0 ? (
          <div className="py-12 text-center text-sm text-muted-foreground border border-dashed rounded-lg">
            No lecture logs available yet.
          </div>
        ) : (
          allSessions.map((session) => (
            <Link 
              href={`/sessions/${session.id}`} 
              key={session.id}
              className="group block p-5 rounded-xl border bg-card hover:bg-muted/30 transition-colors"
            >
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div className="flex-1 min-w-[200px]">
                  <h3 className="font-semibold">{session.subject?.name}</h3>
                  <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground mt-2">
                    <div className="flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5" />
                      {new Intl.DateTimeFormat('en-US', { timeZone: 'Asia/Kathmandu', dateStyle: 'medium' }).format(new Date(session.sessionDate))}
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5" />
                      {formatTime12h(session.startTime)} - {formatTime12h(session.endTime)}
                    </div>
                  </div>
                </div>
                
                <div className="flex-[2] md:border-l md:pl-6 text-sm text-muted-foreground">
                  <span className="font-medium text-foreground text-xs uppercase tracking-wider block mb-1">Topics</span>
                  <p className="line-clamp-2">
                    {session.lectureLog?.topicsCovered || <span className="italic opacity-50">No topics logged.</span>}
                  </p>
                </div>
                
                <div className="shrink-0 pt-2 md:pt-0">
                  <div className={buttonVariants({ variant: "ghost", size: "sm", className: "w-full md:w-auto text-muted-foreground group-hover:text-foreground" })}>
                    <FileText className="w-4 h-4 mr-2" /> View Session
                  </div>
                </div>
              </div>
            </Link>
          ))
        )}
      </div>
    </div>
  );
}
