import { db } from "@/db";
import { attendance, classSessions, enrollments, homework } from "@/db/schema";
import { and, desc, eq, inArray } from "drizzle-orm";
import { requireAuth, resolveCurrentStudent } from "@/lib/auth";
import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { formatTime12h } from "@/lib/time";
import { Calendar, Clock, Book, FileText, FolderOpen } from "lucide-react";
import { formatNepaliDate, formatNepaliDateTime } from "@/lib/nepali-date";

export const dynamic = "force-dynamic";

export default async function MissedPage() {
  const user = await requireAuth(["STUDENT", "CR", "ADMIN", "TEACHER"]);
  const student = await resolveCurrentStudent();

  let enrolledSubjectIds: string[] = [];

  if (student) {
    const userEnrollments = await db.query.enrollments.findMany({
      where: eq(enrollments.studentId, student.id),
    });
    enrolledSubjectIds = userEnrollments.map((e) => e.subjectId);
  }

  const missedAttendance =
    student && enrolledSubjectIds.length > 0
      ? await db
          .select({ classSessionId: attendance.classSessionId })
          .from(attendance)
          .innerJoin(classSessions, eq(attendance.classSessionId, classSessions.id))
          .where(
            and(
              eq(attendance.studentId, student.id),
              inArray(classSessions.subjectId, enrolledSubjectIds),
              inArray(attendance.status, ["absent", "late"]),
            ),
          )
          .orderBy(desc(classSessions.sessionDate))
      : [];

  const sessionIds = missedAttendance.map((a) => a.classSessionId);

  const sessions =
    sessionIds.length > 0
      ? await db.query.classSessions.findMany({
          where: inArray(classSessions.id, sessionIds),
          with: {
            subject: true,
            lectureLog: true,
          },
          orderBy: [desc(classSessions.sessionDate), desc(classSessions.startTime)],
        })
      : [];

  const linkedHomework =
    sessionIds.length > 0
      ? await db.query.homework.findMany({
          where: inArray(homework.sessionId, sessionIds),
        })
      : [];

  const homeworkBySession = new Map<string, typeof linkedHomework>();
  for (const hw of linkedHomework) {
    if (!hw.sessionId) continue;
    const list = homeworkBySession.get(hw.sessionId) ?? [];
    list.push(hw);
    homeworkBySession.set(hw.sessionId, list);
  }

  return (
    <div className="flex-1 space-y-8 max-w-5xl">
      <div className="flex flex-col gap-1.5 pb-6 border-b border-border/40">
        <h2 className="text-2xl md:text-3xl font-bold font-fira-sans tracking-tight text-foreground">What You Missed</h2>
        <p className="text-muted-foreground text-sm max-w-2xl">Catch up on sessions you were absent from or arrived late to.</p>
      </div>

      <div className="space-y-3">
        {sessions.length === 0 ? (
          <div className="py-12 text-center text-sm text-muted-foreground border border-dashed rounded-lg">
            No missed classes — nice!
          </div>
        ) : (
          sessions.map((session) => (
            <div key={session.id} className="p-5 rounded-xl border bg-card">
              <div className="flex flex-col gap-6 md:flex-row md:items-start justify-between">
                <div className="flex-1 min-w-[200px]">
                  <h3 className="font-semibold">{session.subject?.name}</h3>
                  <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground mt-2">
                    <div className="flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5" />
                      {formatNepaliDate(new Date(session.sessionDate))}
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5" />
                      {formatTime12h(session.startTime)} - {formatTime12h(session.endTime)}
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-x-4 gap-y-1 mt-4 text-xs">
                    {session.subject?.slug && (
                      <Link href={`/subjects/${session.subject.slug}`} className="inline-flex items-center gap-1.5 text-primary hover:underline">
                        <FolderOpen className="w-3.5 h-3.5" /> Resources
                      </Link>
                    )}
                    <Link href={`/sessions/${session.id}`} className="inline-flex items-center gap-1.5 text-primary hover:underline">
                      <FileText className="w-3.5 h-3.5" /> View Session
                    </Link>
                  </div>
                </div>

                <div className="flex-[2] md:border-l md:pl-6 text-sm text-muted-foreground space-y-4">
                  <div>
                    <span className="font-medium text-foreground text-xs uppercase tracking-wider block mb-1">Topics</span>
                    <p>{session.lectureLog?.topicsCovered || <span className="italic opacity-50">No topics logged.</span>}</p>
                  </div>
                  <div>
                    <span className="font-medium text-foreground text-xs uppercase tracking-wider block mb-1">Notes</span>
                    <p>{session.lectureLog?.notes || <span className="italic opacity-50">No notes logged.</span>}</p>
                  </div>
                  <div>
                    <span className="font-medium text-foreground text-xs uppercase tracking-wider block mb-1">Homework</span>
                    {(homeworkBySession.get(session.id)?.length ?? 0) === 0 ? (
                      <p className="italic opacity-50">No homework assigned for this session.</p>
                    ) : (
                      <ul className="space-y-2">
                        {(homeworkBySession.get(session.id) ?? []).map((hw) => (
                          <li key={hw.id} className="flex items-center justify-between gap-3">
                            <Link href="/homework" className="inline-flex items-center gap-1.5 hover:text-foreground transition-colors min-w-0">
                              <Book className="w-3.5 h-3.5 shrink-0" />
                              <span className="truncate">{hw.title}</span>
                            </Link>
                            <span className="shrink-0 text-xs whitespace-nowrap">
                              Due{" "}
                              {formatNepaliDate(new Date(hw.dueDate))}
                            </span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
