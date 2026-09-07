import { requireAuth } from "@/lib/auth";
import { db } from "@/db";
import {
  subjects,
  weeklyRoutine,
  homework,
  attendanceCorrectionRequests,
  dailyAttendance,
  dailySessions,
} from "@/db/schema";
import { eq, and, inArray, count } from "drizzle-orm";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CalendarRange, BookOpen, Clock, AlertCircle, ArrowRight } from "lucide-react";
import Link from "next/link";
import { getSemesterVariants } from "@/lib/utils/roman";

export default async function TeacherDashboard() {
  const user = await requireAuth(["TEACHER", "ADMIN"]);
  
  if (!user.teacherId) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold tracking-tight">Teacher Dashboard</h1>
        <div className="p-4 bg-yellow-50 text-yellow-800 rounded-xl border border-yellow-200">
          Your account is not linked to a teacher profile.
        </div>
      </div>
    );
  }

  // Fetch assigned subjects
  const assignedSubjects = await db
    .select()
    .from(subjects)
    .where(eq(subjects.teacherId, user.teacherId));

  // Pending disputes: pending attendance correction requests for teacher's semesters
  const teacherSemesters = [...new Set(assignedSubjects.map((s) => s.semester))];
  const teacherSemesterVariants = teacherSemesters.flatMap((sem) => getSemesterVariants(sem));

  let pendingDisputes = 0;
  if (teacherSemesterVariants.length > 0 || user.role === "ADMIN") {
    const [disputesRow] = await db
      .select({ value: count() })
      .from(attendanceCorrectionRequests)
      .innerJoin(dailyAttendance, eq(attendanceCorrectionRequests.attendanceId, dailyAttendance.id))
      .innerJoin(dailySessions, eq(dailyAttendance.dailySessionId, dailySessions.id))
      .where(
        and(
          eq(attendanceCorrectionRequests.status, "pending"),
          user.role === "ADMIN" ? undefined : inArray(dailySessions.semester, teacherSemesterVariants)
        )
      );
    pendingDisputes = Number(disputesRow?.value ?? 0);
  }

  // Fetch today's classes
  // Timezone standardization: NPT day of week
  const today = new Date();
  const options = { timeZone: 'Asia/Kathmandu', weekday: 'long' } as const;
  const todayString = new Intl.DateTimeFormat("en-US", options).format(today);
  
  // Convert day string to integer matching our DB (0 = Sunday, 1 = Monday, etc.)
  const daysMap: Record<string, number> = {
    'Sunday': 0, 'Monday': 1, 'Tuesday': 2, 'Wednesday': 3, 'Thursday': 4, 'Friday': 5, 'Saturday': 6
  };
  const dayOfWeek = daysMap[todayString];

  // Get routines for today for the teacher's subjects
  const todayClasses = await db
    .select({
      routine: weeklyRoutine,
      subject: subjects
    })
    .from(weeklyRoutine)
    .innerJoin(subjects, eq(subjects.id, weeklyRoutine.subjectId))
    .where(
      and(
        eq(weeklyRoutine.dayOfWeek, dayOfWeek),
        eq(subjects.teacherId, user.teacherId)
      )
    );

  // Sort classes by start time
  todayClasses.sort((a, b) => a.routine.startTime.localeCompare(b.routine.startTime));

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold tracking-tight">Teacher Dashboard</h1>
      <p className="text-muted-foreground">Welcome to the Teacher Portal, {user.name}.</p>

      {/* Pending Actions Alert Section */}
      {pendingDisputes > 0 && (
        <div className="rounded-2xl border border-amber-500/30 bg-amber-500/5 p-5 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-400" />
              <h2 className="text-base font-bold text-foreground">Pending Actions Required</h2>
            </div>
            <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-500/30">
              {pendingDisputes} dispute{pendingDisputes > 1 ? "s" : ""}
            </span>
          </div>
          <div className="pt-1">
            <Link
              href="/teacher/attendance"
              className="flex items-center justify-between p-3.5 rounded-xl bg-card border border-border/60 hover:border-primary/50 transition-all group"
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center font-bold text-sm border border-amber-500/20">
                  {pendingDisputes}
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground">Attendance Disputes</p>
                  <p className="text-xs text-muted-foreground">Student correction requests awaiting your review</p>
                </div>
              </div>
              <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
            </Link>
          </div>
        </div>
      )}

      {/* Quick Links */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <Link
          href="/teacher/attendance"
          className="flex flex-col items-start gap-2 rounded-2xl border border-border/40 bg-card p-4 hover:border-primary/50 transition-all"
        >
          <div className="flex items-center justify-between w-full">
            <CalendarRange className="w-5 h-5 text-primary" />
            {pendingDisputes > 0 && (
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                {pendingDisputes}
              </span>
            )}
          </div>
          <span className="text-sm font-bold">Attendance</span>
          <span className="text-xs text-muted-foreground">
            {pendingDisputes > 0
              ? `${pendingDisputes} dispute${pendingDisputes > 1 ? "s" : ""} pending`
              : "Record & review"}
          </span>
        </Link>
        <Link
          href="/teacher/lecture-logs"
          className="flex flex-col items-start gap-2 rounded-2xl border border-border/40 bg-card p-4 hover:border-primary/50 transition-all"
        >
          <Clock className="w-5 h-5 text-primary" />
          <span className="text-sm font-bold">Sessions</span>
          <span className="text-xs text-muted-foreground">Lecture logs</span>
        </Link>
        <Link
          href="/teacher/subjects"
          className="flex flex-col items-start gap-2 rounded-2xl border border-border/40 bg-card p-4 hover:border-primary/50 transition-all"
        >
          <BookOpen className="w-5 h-5 text-primary" />
          <span className="text-sm font-bold">My Subjects</span>
          <span className="text-xs text-muted-foreground">{assignedSubjects.length} assigned</span>
        </Link>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-primary" />
              My Subjects
            </CardTitle>
            <CardDescription>Subjects you are currently assigned to teach.</CardDescription>
          </CardHeader>
          <CardContent>
            {assignedSubjects.length === 0 ? (
              <p className="text-sm text-muted-foreground">No subjects assigned.</p>
            ) : (
              <ul className="space-y-3">
                {assignedSubjects.map(sub => (
                  <li key={sub.id} className="flex justify-between items-center p-3 rounded-lg border bg-card">
                    <div>
                      <p className="font-semibold">{sub.name}</p>
                      <p className="text-xs text-muted-foreground">{sub.code}</p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CalendarRange className="w-5 h-5 text-primary" />
              Today&apos;s Schedule
            </CardTitle>
            <CardDescription>Your schedule for today ({todayString}).</CardDescription>
          </CardHeader>
          <CardContent>
            {todayClasses.length === 0 ? (
              <p className="text-sm text-muted-foreground">No classes scheduled for today.</p>
            ) : (
              <div className="space-y-3">
                {(() => {
                  const sorted = [...todayClasses].sort((a, b) => a.routine.startTime.localeCompare(b.routine.startTime));
                  const nptTime = new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Kathmandu", hour: "2-digit", minute: "2-digit", hour12: false }).format(new Date());
                  const nextClass = sorted.find(c => nptTime < c.routine.startTime);

                  return sorted.map(({ routine, subject }) => {
                    const isOngoing = routine.startTime <= nptTime && routine.endTime >= nptTime;
                    const isCompleted = nptTime > routine.endTime;
                    const isNext = routine.id === nextClass?.routine.id;

                    return (
                      <div
                        key={routine.id}
                        className={`flex items-center justify-between p-3.5 rounded-xl border transition-colors ${
                          isOngoing
                            ? 'bg-emerald-500/10 border-emerald-500/30'
                            : isNext
                            ? 'bg-primary/5 border-primary/30'
                            : isCompleted
                            ? 'bg-muted/20 border-transparent opacity-60'
                            : 'bg-card border-border/40'
                        }`}
                      >
                        <div>
                          <div className="font-semibold text-sm text-foreground flex items-center gap-2">
                            {subject.name}
                            {isOngoing && (
                              <span className="text-xs font-bold bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 px-2 py-0.5 rounded-full border border-emerald-500/20 flex items-center gap-1">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" /> Ongoing
                              </span>
                            )}
                            {isNext && (
                              <span className="text-xs font-bold bg-primary/15 text-primary px-2 py-0.5 rounded-full border border-primary/20">
                                Next Up
                              </span>
                            )}
                            {isCompleted && (
                              <span className="text-xs font-semibold bg-muted text-muted-foreground px-2 py-0.5 rounded-full border border-border">
                                Completed
                              </span>
                            )}
                            {!isOngoing && !isNext && !isCompleted && (
                              <span className="text-xs font-semibold bg-muted/60 text-muted-foreground px-2 py-0.5 rounded-full">
                                Upcoming
                              </span>
                            )}
                          </div>
                          <div className="text-xs text-muted-foreground mt-0.5">
                            {routine.room ? (routine.room.startsWith('Room') || routine.room.startsWith('Lab') ? routine.room : `Room ${routine.room}`) : "Room: TBA"}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-xs font-medium tabular-nums text-foreground">{routine.startTime} - {routine.endTime}</div>
                        </div>
                      </div>
                    );
                  });
                })()}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
