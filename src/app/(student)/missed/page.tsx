import { requireAuth, resolveCurrentStudent } from "@/lib/auth";
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
import { getStudentCohort } from "@/features/routine/queries";
import { getStudentMissedDaysJournal } from "@/features/attendance/queries";

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

  const cohort = await getStudentCohort(student.id, user.id);
  const { missedRecords, sessionsByDateKey, homeworkBySession } =
    await getStudentMissedDaysJournal(student.id, cohort.allowedSubjectIds);

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
