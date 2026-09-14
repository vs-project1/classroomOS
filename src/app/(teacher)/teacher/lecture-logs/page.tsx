import { db } from "@/db";
import { classSessions, subjects, lectureLogs } from "@/db/schema";
import { desc, eq, inArray } from "drizzle-orm";
import { requireAuth } from "@/lib/auth";
import Link from "next/link";
import { formatTime12h } from "@/lib/timezone";
import { FileText, Calendar, Clock, BookOpen, Plus } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { formatNepaliDate } from "@/lib/nepali-date";

export const dynamic = "force-dynamic";

type Props = {
  searchParams: Promise<{ subject?: string }>;
};

const nptDayFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Asia/Kathmandu",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

export default async function TeacherLectureLogsPage({ searchParams }: Props) {
  const user = await requireAuth(["TEACHER"]);
  const { subject = "" } = await searchParams;

  if (!user.teacherId) {
    return (
      <div className="flex-1 space-y-6 max-w-5xl">
        <h1 className="text-3xl md:text-4xl font-bold font-fira-sans tracking-tight text-foreground">Lecture Logs</h1>
        <div className="p-5 bg-destructive/10 text-destructive-foreground rounded-2xl border border-destructive/20 text-sm font-medium">
          Your account is not linked to a teacher profile. Please contact an administrator.
        </div>
      </div>
    );
  }

  // Find all subjects taught by this teacher
  const assignedSubjects = await db.query.subjects.findMany({
    where: eq(subjects.teacherId, user.teacherId),
    orderBy: subjects.name,
  });

  const subjectIds = assignedSubjects.map(s => s.id);
  
  // If they have no subjects, show empty state
  if (subjectIds.length === 0) {
    return (
      <div className="flex-1 space-y-6 max-w-5xl">
        <h1 className="text-3xl md:text-4xl font-bold font-fira-sans tracking-tight text-foreground">Lecture Logs</h1>
        <div className="py-12 text-center text-sm text-muted-foreground rounded-2xl border border-dashed border-border/40 bg-card">
          You are not assigned to any subjects yet.
        </div>
      </div>
    );
  }

  // Fetch class sessions with lecture logs
  // If a subject filter is applied, only show that subject, else show all assigned subjects
  const filterIds = subject && subjectIds.includes(subject) ? [subject] : subjectIds;

  const logs = await db.query.classSessions.findMany({
    where: inArray(classSessions.subjectId, filterIds),
    with: {
      subject: true,
      lectureLog: true,
    },
    orderBy: [desc(classSessions.sessionDate), desc(classSessions.startTime)],
  });

  return (
    <div className="flex-1 space-y-6 max-w-5xl">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl md:text-4xl font-bold font-fira-sans tracking-tight text-foreground">Lecture Logs</h1>
          <p className="text-muted-foreground mt-1 text-sm">Review topics covered in your classes or record lecture notes.</p>
        </div>
        <Link
          href="/cr/log-session"
          className={buttonVariants({ variant: "default", size: "sm", className: "gap-1.5 font-semibold" })}
        >
          <Plus className="w-4 h-4" /> Log Class Session
        </Link>
      </div>

      <div className="flex items-center gap-2 overflow-x-auto pb-2">
        <Link
          href="/teacher/lecture-logs"
          className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
            !subject 
              ? "bg-primary text-primary-foreground shadow-sm" 
              : "bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground"
          }`}
        >
          All Subjects
        </Link>
        {assignedSubjects.map((subj) => (
          <Link
            key={subj.id}
            href={`/teacher/lecture-logs?subject=${subj.id}`}
            className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
              subject === subj.id
                ? "bg-primary text-primary-foreground shadow-sm" 
                : "bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground"
            }`}
          >
            {subj.name}
          </Link>
        ))}
      </div>

      <div className="grid gap-4">
        {logs.length === 0 ? (
          <div className="py-12 text-center text-sm text-muted-foreground rounded-2xl border border-dashed border-border/40 bg-card">
            No lecture logs found. You and class representatives can log session topics and homework here.
          </div>
        ) : (
          logs.map((session) => {
            const log = session.lectureLog;
            if (!log) return null;

            return (
              <div 
                key={session.id} 
                className="group relative flex flex-col gap-4 rounded-2xl border border-border/40 bg-card p-6 shadow-sm transition-all hover:border-border/80"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2">
                      <span className="inline-flex items-center rounded-md bg-primary/10 px-2 py-1 text-xs font-medium text-primary ring-1 ring-inset ring-primary/20">
                        <BookOpen className="mr-1.5 h-3 w-3" />
                        {session.subject.name}
                      </span>
                    </div>
                    <h3 className="font-semibold text-lg leading-tight mt-2">
                      {log.topicsCovered}
                    </h3>
                    <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground mt-2">
                      <div className="flex items-center gap-1.5">
                        <Calendar className="h-4 w-4 text-primary" />
                        <span className="font-semibold text-foreground">
                          {formatNepaliDate(session.sessionDate)}
                        </span>
                        <time dateTime={session.sessionDate.toISOString()} className="text-xs text-muted-foreground">
                          ({nptDayFormatter.format(session.sessionDate)})
                        </time>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Clock className="h-4 w-4" />
                        <span>
                          {formatTime12h(session.startTime)} - {formatTime12h(session.endTime)}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {(log.notes || log.homework) && (
                  <div className="mt-2 space-y-3 border-t border-border/40 pt-4">
                    {log.notes && (
                      <div>
                        <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">
                          Notes
                        </h4>
                        <p className="text-sm text-foreground/90 leading-relaxed whitespace-pre-wrap">
                          {log.notes}
                        </p>
                      </div>
                    )}
                    {log.homework && (
                      <div>
                        <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">
                          Homework
                        </h4>
                        <p className="text-sm text-foreground/90 leading-relaxed whitespace-pre-wrap">
                          {log.homework}
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
