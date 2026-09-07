import { db } from "@/db";
import {
  dailyAttendance,
  dailySessions,
  classSessions,
  enrollments,
  homework,
  studentProfiles,
  subjects,
} from "@/db/schema";
import { and, desc, asc, eq, inArray, gte, lte, or } from "drizzle-orm";
import { requireAuth, resolveCurrentStudent } from "@/lib/auth";
import { toRoman } from "@/lib/utils/roman";
import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { formatTime12h } from "@/lib/timezone";
import {
  Calendar,
  Clock,
  Book,
  FileText,
  FolderOpen,
  CheckCircle2,
  AlertCircle,
  ShieldAlert,
  ArrowRight,
  BookOpen,
} from "lucide-react";
import { formatNepaliDate } from "@/lib/nepali-date";

export const dynamic = "force-dynamic";

export default async function MissedPage() {
  const user = await requireAuth(["STUDENT", "CR", "ADMIN", "TEACHER"]);
  const student = await resolveCurrentStudent();

  if (!student) {
    return (
      <div className="flex flex-col items-center justify-center h-[50vh] space-y-4 max-w-md mx-auto text-center border rounded-xl border-dashed bg-muted/5 p-6">
        <div className="h-16 w-16 bg-muted/30 rounded-full flex items-center justify-center mb-2">
          <AlertCircle className="w-8 h-8 text-muted-foreground" />
        </div>
        <h3 className="text-xl font-semibold font-fira-sans tracking-tight">No Student Context Found</h3>
        <p className="text-muted-foreground text-sm leading-relaxed">
          Please log in as a student to view your missed classes journal.
        </p>
      </div>
    );
  }

  // 1. Query daily attendance records where status is absent or late
  const missedRecords = await db
    .select({
      id: dailyAttendance.id,
      status: dailyAttendance.status,
      date: dailySessions.date,
      semester: dailySessions.semester,
    })
    .from(dailyAttendance)
    .innerJoin(dailySessions, eq(dailyAttendance.dailySessionId, dailySessions.id))
    .where(
      and(
        eq(dailyAttendance.studentId, student.id),
        inArray(dailyAttendance.status, ["absent", "late"])
      )
    )
    .orderBy(desc(dailySessions.date));

  // 2. Empty state: No missed days
  if (missedRecords.length === 0) {
    return (
      <div className="flex-1 space-y-8 max-w-5xl mx-auto w-full">
        <div className="flex flex-col gap-1.5 pb-6 border-b border-border/40">
          <h1 className="text-2xl md:text-3xl font-bold font-fira-sans tracking-tight text-foreground">
            Missed Classes Catch-Up Journal
          </h1>
          <p className="text-muted-foreground text-sm max-w-2xl">
            Review topics, notes, and assignments from lectures conducted on days you were absent or late.
          </p>
        </div>

        <div className="py-16 text-center text-sm border border-dashed rounded-2xl bg-card p-8 flex flex-col items-center justify-center space-y-3">
          <div className="w-14 h-14 rounded-full bg-emerald-500/10 text-emerald-600 flex items-center justify-center mb-1">
            <CheckCircle2 className="w-8 h-8" />
          </div>
          <h2 className="text-lg font-bold text-foreground">
            No missed days — excellent attendance!
          </h2>
          <p className="text-muted-foreground text-sm max-w-md">
            You have maintained perfect attendance across your scheduled college days. Keep up the consistent streak!
          </p>
          <div className="pt-2">
            <Link
              href="/attendance"
              className={buttonVariants({ variant: "outline", size: "sm" })}
            >
              View Attendance Barometer
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // 3. Resolve subjects for the student's cohort to prevent cross-semester leaks
  const userEnrollments = await db.query.enrollments.findMany({
    where: eq(enrollments.studentId, student.id),
  });
  let subjectIds = userEnrollments.map((e) => e.subjectId);

  if (subjectIds.length === 0) {
    let semInt = 1;
    if (user.studentProfileId) {
      const profile = await db.query.studentProfiles.findFirst({
        where: eq(studentProfiles.id, user.studentProfileId),
      });
      if (profile?.semester != null) semInt = profile.semester;
    } else if (student.semester) {
      const match = student.semester.match(/\d+/);
      if (match) semInt = parseInt(match[0], 10);
    }
    const roman = toRoman(semInt);
    const mappedSubjects = await db
      .select({ id: subjects.id })
      .from(subjects)
      .where(eq(subjects.semester, roman));
    subjectIds = mappedSubjects.map((s) => s.id);
  }

  // 4. Build day window filters for all missed dates
  const dateKeys = Array.from(
    new Set(
      missedRecords.map((r) =>
        new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kathmandu" }).format(new Date(r.date))
      )
    )
  );

  const dayConditions = dateKeys.map((k) => {
    const start = new Date(`${k}T00:00:00.000Z`);
    const end = new Date(`${k}T23:59:59.999Z`);
    return and(gte(classSessions.sessionDate, start), lte(classSessions.sessionDate, end));
  });

  const sessionWhere = and(
    subjectIds.length > 0 ? inArray(classSessions.subjectId, subjectIds) : undefined,
    dayConditions.length > 0 ? or(...dayConditions) : undefined
  );

  const sessions = await db.query.classSessions.findMany({
    where: sessionWhere,
    with: {
      subject: true,
      lectureLog: true,
    },
    orderBy: [desc(classSessions.sessionDate), asc(classSessions.startTime)],
  });

  // Group classSessions by date string (YYYY-MM-DD in Asia/Kathmandu)
  const sessionsByDateKey = new Map<string, typeof sessions>();
  for (const session of sessions) {
    const sKey = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kathmandu" }).format(
      new Date(session.sessionDate)
    );
    const list = sessionsByDateKey.get(sKey) ?? [];
    list.push(session);
    sessionsByDateKey.set(sKey, list);
  }

  // 5. Query homework linked to any of these sessions
  const sessionIds = sessions.map((s) => s.id);
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
    <div className="flex-1 space-y-8 max-w-5xl mx-auto w-full">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pb-6 border-b border-border/40">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold font-fira-sans tracking-tight text-foreground">
            Missed Classes Catch-Up Journal
          </h1>
          <p className="text-muted-foreground text-sm mt-1 max-w-2xl">
            Review syllabus topics, teacher notes, and homework assigned during your absences to catch up smoothly.
          </p>
        </div>
        <div>
          <Link
            href="/attendance"
            className={buttonVariants({ variant: "outline", size: "sm" })}
          >
            <ShieldAlert className="w-3.5 h-3.5 text-amber-500 mr-1.5" />
            Attendance Hub
          </Link>
        </div>
      </div>

      {/* Journal entries grouped by missed day */}
      <div className="space-y-6">
        {missedRecords.map((record) => {
          const d = new Date(record.date);
          const bsDate = formatNepaliDate(d, "YYYY MMMM DD, dddd");
          const adDate = new Intl.DateTimeFormat("en-US", {
            timeZone: "Asia/Kathmandu",
            weekday: "long",
            year: "numeric",
            month: "short",
            day: "numeric",
          }).format(d);
          const dateKey = new Intl.DateTimeFormat("en-CA", {
            timeZone: "Asia/Kathmandu",
          }).format(d);

          const daySessions = sessionsByDateKey.get(dateKey) ?? [];
          const isAbsent = record.status === "absent";

          return (
            <div
              key={record.id}
              className="rounded-2xl border bg-card overflow-hidden shadow-xs"
            >
              {/* Day Header */}
              <div className="px-6 py-4 bg-muted/20 border-b border-border/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-background rounded-xl border border-border/40 shadow-2xs">
                    <Calendar className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold text-base text-foreground font-fira-sans">
                        {bsDate}
                      </h3>
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold border ${
                          isAbsent
                            ? "bg-destructive/10 text-destructive border-destructive/20"
                            : "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20"
                        }`}
                      >
                        {isAbsent ? "Absent" : "Late"}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground">{adDate}</p>
                  </div>
                </div>

                <Link
                  href="/attendance"
                  className="text-xs font-medium text-amber-700 dark:text-amber-400 hover:underline inline-flex items-center gap-1 self-start sm:self-auto cursor-pointer"
                >
                  <ShieldAlert className="w-3.5 h-3.5" />
                  Marked in error? Dispute Attendance →
                </Link>
              </div>

              {/* Day Lectures */}
              <div className="p-6 space-y-6">
                {daySessions.length === 0 ? (
                  <div className="py-6 text-center text-xs text-muted-foreground italic border rounded-xl border-dashed bg-muted/5">
                    No academic lecture logs were recorded for this date.
                  </div>
                ) : (
                  daySessions.map((session, idx) => {
                    const sessionHw = homeworkBySession.get(session.id) ?? [];

                    return (
                      <div
                        key={session.id}
                        className={`space-y-4 ${
                          idx > 0 ? "pt-6 border-t border-border/30" : ""
                        }`}
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <BookOpen className="w-4 h-4 text-primary shrink-0" />
                            <h4 className="font-semibold text-sm text-foreground">
                              {session.subject?.name}
                            </h4>
                            {session.subject?.code && (
                              <span className="text-[11px] bg-muted px-2 py-0.5 rounded-md font-mono font-semibold border border-border/40">
                                {session.subject.code}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                            <Clock className="w-3.5 h-3.5 shrink-0" />
                            <span>
                              {formatTime12h(session.startTime)} - {formatTime12h(session.endTime)}
                            </span>
                          </div>
                        </div>

                        {/* Topics Covered & Notes */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="rounded-xl border border-border/40 bg-muted/10 p-3.5">
                            <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground block mb-1">
                              Topics Covered
                            </span>
                            <p className="text-xs text-foreground leading-relaxed">
                              {session.lectureLog?.topicsCovered || (
                                <span className="text-muted-foreground italic">
                                  No topics logged for this lecture.
                                </span>
                              )}
                            </p>
                          </div>

                          <div className="rounded-xl border border-border/40 bg-muted/10 p-3.5">
                            <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground block mb-1">
                              Teacher Notes
                            </span>
                            <p className="text-xs text-foreground leading-relaxed">
                              {session.lectureLog?.notes || (
                                <span className="text-muted-foreground italic">
                                  No additional teacher notes.
                                </span>
                              )}
                            </p>
                          </div>
                        </div>

                        {/* Assigned Homework */}
                        {sessionHw.length > 0 && (
                          <div className="rounded-xl border border-border/40 bg-muted/10 p-3.5">
                            <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground block mb-2">
                              Assigned Homework
                            </span>
                            <ul className="space-y-2">
                              {sessionHw.map((hw) => (
                                <li
                                  key={hw.id}
                                  className="flex items-center justify-between text-xs gap-3"
                                >
                                  <Link
                                    href="/homework"
                                    className="font-medium text-foreground hover:text-primary transition-colors inline-flex items-center gap-1.5 truncate"
                                  >
                                    <Book className="w-3.5 h-3.5 text-primary shrink-0" />
                                    <span className="truncate">{hw.title}</span>
                                  </Link>
                                  <span className="text-[11px] text-muted-foreground whitespace-nowrap tabular-nums">
                                    Due: {formatNepaliDate(new Date(hw.dueDate))}
                                  </span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}

                        {/* Quick links */}
                        <div className="flex items-center gap-4 text-xs pt-1">
                          {session.subject?.slug && (
                            <Link
                              href={`/subjects/${session.subject.slug}`}
                              className="inline-flex items-center gap-1 text-primary hover:underline"
                            >
                              <FolderOpen className="w-3.5 h-3.5" /> Subject Resources
                            </Link>
                          )}
                          <Link
                            href={`/sessions/${session.id}`}
                            className="inline-flex items-center gap-1 text-primary hover:underline"
                          >
                            <FileText className="w-3.5 h-3.5" /> Full Session Details
                          </Link>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
