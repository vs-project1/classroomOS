import { db } from "@/db";
import { weeklyRoutine, classSessions, enrollments } from "@/db/schema";
import { desc, eq, asc, and, inArray, gte } from "drizzle-orm";
import Link from "next/link";
import { requireAuth, resolveCurrentStudent } from "@/lib/auth";
import { formatTime12h } from "@/lib/timezone";
import { cn } from "@/lib/utils";
import { formatNepaliDate, formatNepaliDateTime } from "@/lib/nepali-date";
import {
  CalendarDays,
  ClipboardList,
  Clock,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  Users,
  BookOpen,
  FileText,
  ClipboardEdit,
} from "lucide-react";
import { RecentResourcesWidget } from "@/features/resources/components/recent-resources-widget";

export default async function CRDashboard() {
  // RBAC Guard: CR or ADMIN only
  await requireAuth(["CR", "ADMIN"]);

  const student = await resolveCurrentStudent();

  if (!student) {
    return (
      <div className="flex flex-col items-center justify-center h-[50vh] space-y-4">
        <AlertCircle className="w-12 h-12 text-muted-foreground" />
        <h2 className="text-xl font-semibold">No Student Profile Found</h2>
        <p className="text-muted-foreground">CR account not linked to a student profile.</p>
      </div>
    );
  }

  // Nepal Time — compute dayOfWeek from the JS Date directly.
  // (formatNepaliDate returns a Bikram Sambat display string like
  // "2083 Bhadra 10" which is NOT ISO-parseable; re-parsing it with
  // `new Date()` gives Invalid Date and .getDay() returns NaN, which
  // then breaks the weekly_routine query at the SQLite layer.)
  const now = new Date();
  const nptWeekday = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Kathmandu",
    weekday: "short",
  }).format(now);
  const dayOfWeek = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(nptWeekday);
  const nptTime = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Kathmandu",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(now);
  const nptHour = parseInt(nptTime.split(":")[0], 10);
  const greeting =
    nptHour < 12 ? "Good morning" : nptHour < 17 ? "Good afternoon" : "Good evening";
  const formattedDate = formatNepaliDate(now);

  // CR's enrolled subject IDs
  const crEnrollments = await db.query.enrollments.findMany({
    where: eq(enrollments.studentId, student.id),
  });
  const enrolledSubjectIds = crEnrollments.map((e) => e.subjectId);

  // Sessions logged this week (Mon=1..Sun=0 in JS, but we use 0-6)
  const startOfWeek = new Date(now);
  const dayOffset = startOfWeek.getDay() === 0 ? 6 : startOfWeek.getDay() - 1; // Monday-based
  startOfWeek.setDate(startOfWeek.getDate() - dayOffset);
  startOfWeek.setHours(0, 0, 0, 0);
  const endOfWeek = new Date(startOfWeek);
  endOfWeek.setDate(endOfWeek.getDate() + 6);
  endOfWeek.setHours(23, 59, 59, 999);

  // Parallel queries
  const [todaysClasses, recentSessionsWithLogs, weekSessions] = await Promise.all([
    enrolledSubjectIds.length > 0
      ? db.query.weeklyRoutine.findMany({
          where: and(
            eq(weeklyRoutine.dayOfWeek, dayOfWeek),
            inArray(weeklyRoutine.subjectId, enrolledSubjectIds)
          ),
          orderBy: [asc(weeklyRoutine.startTime)],
          with: { subject: { with: { teacher: true } } },
        })
      : Promise.resolve([]),
    // Recent sessions with lecture logs (for Recent Activity)
    enrolledSubjectIds.length > 0
      ? db.query.classSessions.findMany({
          orderBy: [desc(classSessions.sessionDate)],
          limit: 5,
          where: inArray(classSessions.subjectId, enrolledSubjectIds),
          with: {
            subject: true,
            lectureLog: true,
          },
        })
      : Promise.resolve([]),
    // This week's sessions only — clamped at the DB level so the query
    // cannot grow unboundedly with academic history.
    enrolledSubjectIds.length > 0
      ? db.query.classSessions.findMany({
          where: and(
            inArray(classSessions.subjectId, enrolledSubjectIds),
            gte(classSessions.sessionDate, startOfWeek)
          ),
          with: { subject: true },
        })
      : Promise.resolve([]),
  ]);

  const allSessions = weekSessions;

  const sessionsThisWeek = allSessions.filter((s) => {
    const d = new Date(s.sessionDate);
    return d >= startOfWeek && d <= endOfWeek;
  });

  // KPI values
  const classesToday = todaysClasses.length;
  const pendingTasks = 0; // CR does not track homework submissions per the spec
  const recentSessionsCount = sessionsThisWeek.length;

  // Today's logging status: how many of today's classes have a session row
  const todayStart = new Date(now);
  todayStart.setHours(0, 0, 0, 0);
  const todayEnd = new Date(now);
  todayEnd.setHours(23, 59, 59, 999);
  const loggedToday = allSessions.filter((s) => {
    const d = new Date(s.sessionDate);
    return d >= todayStart && d <= todayEnd;
  }).length;
  const remainingToday = Math.max(classesToday - loggedToday, 0);

  // Quick actions
  const quickActions = [
    { label: "Log Session", href: "/cr/log-session", icon: ClipboardList },
    { label: "View Attendance", href: "/attendance", icon: Users },
    { label: "View All Subjects", href: "/subjects", icon: BookOpen },
  ];

  // Helpers
  const getRelativeClassTime = (startTime: string, npt: string) => {
    const [sh, sm] = startTime.split(":").map(Number);
    const [nh, nm] = npt.split(":").map(Number);
    const diffMins = sh * 60 + sm - (nh * 60 + nm);
    if (diffMins <= 0) return null;
    if (diffMins < 60) return `Starts in ${diffMins} min`;
    const hrs = Math.floor(diffMins / 60);
    const mins = diffMins % 60;
    return `Starts in ${hrs}h ${mins}m`;
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">

      {/* 1. Hero Gradient Banner */}
      <div className="w-full rounded-2xl p-6 md:p-8 shadow-sm bg-gradient-to-br from-indigo-900 via-primary to-sky-700 text-white">
        <div className="flex flex-col lg:flex-row justify-between gap-6 items-start lg:items-center">
          <div className="space-y-1">
            <h1 className="text-2xl md:text-3xl lg:text-4xl font-bold tracking-tight font-fira-sans">
              {greeting}, {student.name.split(" ")[0]}!
            </h1>
            <p className="text-white/80 font-medium text-sm md:text-base">{formattedDate}</p>
          </div>

          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/15 backdrop-blur-sm border border-white/20 text-xs font-bold tracking-wide uppercase">
            Class Representative
          </span>
        </div>
      </div>

      {/* 1b. Today Summary Strip */}
      <div
        data-testid="cr-today-strip"
        className="rounded-2xl border border-border/40 bg-card p-5 flex flex-col lg:flex-row lg:items-center gap-5 justify-between"
      >
        <div className="flex items-center gap-6 sm:gap-8">
          <div>
            <p data-testid="cr-classes-today" className="text-2xl font-bold tabular-nums text-foreground">
              {classesToday}
            </p>
            <p className="text-xs font-medium text-muted-foreground">Classes today</p>
          </div>
          <div className="w-px h-10 bg-border" aria-hidden />
          <div>
            <p data-testid="cr-logged-today" className="text-2xl font-bold tabular-nums text-emerald-600 dark:text-emerald-400">
              {loggedToday}
            </p>
            <p className="text-xs font-medium text-muted-foreground">Logged</p>
          </div>
          <div className="w-px h-10 bg-border" aria-hidden />
          <div>
            <p
              data-testid="cr-remaining"
              className={cn(
                "text-2xl font-bold tabular-nums",
                remainingToday > 0 ? "text-amber-600 dark:text-amber-400" : "text-muted-foreground"
              )}
            >
              {remainingToday}
            </p>
            <p className="text-xs font-medium text-muted-foreground">Remaining</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <Link
            href="/cr/take-attendance"
            className={cn(
              "inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all",
              "bg-primary text-primary-foreground shadow-sm shadow-primary/30 hover:opacity-90"
            )}
          >
            <Users className="w-4 h-4" /> Morning Roll Call
          </Link>
          <Link
            href="/cr/log-session"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold border border-border/60 bg-background hover:bg-muted transition-all"
          >
            <ClipboardEdit className="w-4 h-4" /> Log Session
          </Link>
          <Link
            href="/attendance"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold border border-border/60 bg-background hover:bg-muted transition-all"
          >
            <CheckCircle2 className="w-4 h-4" /> My Attendance
          </Link>
          <Link
            href="/lecture-logs"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold border border-border/60 bg-background hover:bg-muted transition-all"
          >
            <FileText className="w-4 h-4" /> View Sessions
          </Link>
        </div>
      </div>

      {/* 2. KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="rounded-xl border border-border/40 shadow-sm p-5 bg-card flex items-center gap-4">
          <div className="w-10 h-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
            <CalendarDays className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs font-medium text-muted-foreground">Classes Today</p>
            <p className="text-2xl font-bold tabular-nums">{classesToday}</p>
          </div>
        </div>

        <div className="rounded-xl border border-border/40 shadow-sm p-5 bg-card flex items-center gap-4">
          <div className="w-10 h-10 rounded-lg bg-amber-500/10 text-amber-600 flex items-center justify-center shrink-0">
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs font-medium text-muted-foreground">Pending Tasks</p>
            <p className="text-2xl font-bold tabular-nums">{pendingTasks}</p>
          </div>
        </div>

        <div className="rounded-xl border border-border/40 shadow-sm p-5 bg-card flex items-center gap-4">
          <div className="w-10 h-10 rounded-lg bg-emerald-500/10 text-emerald-600 flex items-center justify-center shrink-0">
            <FileText className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs font-medium text-muted-foreground">Sessions This Week</p>
            <p className="text-2xl font-bold tabular-nums">{recentSessionsCount}</p>
          </div>
        </div>
      </div>

      {/* 3. Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Left Column */}
        <div className="lg:col-span-2 space-y-6">

          {/* Today's Schedule */}
          <div className="rounded-xl border border-border/40 shadow-sm p-6 bg-card">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-2">
                <CalendarDays className="w-5 h-5 text-primary" />
                <h2 className="text-lg font-semibold tracking-tight text-foreground font-fira-sans">
                  Today&apos;s Schedule
                </h2>
              </div>
              <Link
                href="/routine"
                className="text-xs font-medium text-primary hover:underline flex items-center gap-1"
              >
                Full Routine <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            {todaysClasses.length > 0 ? (
              <div className="space-y-3">
                {todaysClasses.map((cls) => {
                  const isPast = cls.endTime < nptTime;
                  const isCurrent =
                    cls.startTime <= nptTime && cls.endTime >= nptTime;
                  const relativeTime = getRelativeClassTime(
                    cls.startTime,
                    nptTime
                  );

                  return (
                    <div
                      key={cls.id}
                      className={cn(
                        "relative flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-lg transition-colors border",
                        isCurrent
                          ? "bg-primary/5 border-primary/30 shadow-sm"
                          : isPast
                          ? "opacity-60 grayscale-[40%] bg-muted/20 border-transparent hover:bg-muted/40"
                          : "bg-muted/10 border-border/30 hover:bg-muted/30"
                      )}
                    >
                      <div className="flex items-start gap-4">
                        <div className="flex flex-col items-center justify-center sm:w-28 shrink-0 text-center">
                          <span
                            className={cn(
                              "text-xs font-semibold tabular-nums",
                              isPast
                                ? "line-through text-muted-foreground"
                                : "text-foreground"
                            )}
                          >
                            {formatTime12h(cls.startTime)}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            to {formatTime12h(cls.endTime)}
                          </span>
                        </div>
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <h3
                              className={cn(
                                "font-bold text-base leading-tight",
                                isPast
                                  ? "text-muted-foreground line-through"
                                  : "text-foreground"
                              )}
                            >
                              {cls.subject.name}
                            </h3>
                            {isCurrent && (
                              <span className="px-2.5 py-0.5 rounded-full bg-primary text-primary-foreground text-xs font-bold tracking-wider animate-pulse">
                                NOW
                              </span>
                            )}
                          </div>
                          <p className="text-xs font-medium text-muted-foreground flex items-center gap-2">
                            {cls.subject.teacher?.name || "TBA"}
                            {cls.room && (
                              <>
                                <span className="opacity-40">&bull;</span>
                                <span>{cls.room.startsWith('Room') || cls.room.startsWith('Lab') ? cls.room : `Room ${cls.room}`}</span>
                              </>
                            )}
                          </p>
                        </div>
                      </div>

                      <div className="mt-3 sm:mt-0 sm:ml-4 flex items-center gap-2">
                        {!isPast && !isCurrent && relativeTime && (
                          <span className="text-xs font-medium text-primary tabular-nums bg-primary/10 px-2 py-0.5 rounded">
                            {relativeTime}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-10 text-center text-muted-foreground">
                <CheckCircle2 className="w-10 h-10 mb-2 text-muted-foreground/60" />
                <p className="font-medium text-sm">
                  No enrolled classes scheduled today.
                </p>
              </div>
            )}
          </div>

          {/* Recent Activity — last logged sessions */}
          <div className="rounded-xl border border-border/40 shadow-sm p-6 bg-card">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-primary" />
                <h2 className="text-lg font-semibold tracking-tight text-foreground font-fira-sans">
                  Recent Activity
                </h2>
              </div>
            </div>

            {recentSessionsWithLogs.length > 0 ? (
              <div className="space-y-3">
                {recentSessionsWithLogs.map((session) => {
                  const log = session.lectureLog;
                  const dateStr = formatNepaliDate(new Date(session.sessionDate));

                  return (
                    <div
                      key={session.id}
                      className="flex items-start gap-4 p-4 rounded-lg bg-muted/10 border border-border/30 hover:bg-muted/20 transition-colors"
                    >
                      <div className="w-10 h-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0 mt-0.5">
                        <BookOpen className="w-5 h-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2 mb-1">
                          <h3 className="font-semibold text-sm text-foreground truncate">
                            {session.subject.name}
                          </h3>
                          <span className="text-xs font-medium text-muted-foreground shrink-0">
                            {dateStr}
                          </span>
                        </div>
                        {log ? (
                          <p className="text-xs text-muted-foreground line-clamp-2">
                            {log.topicsCovered}
                          </p>
                        ) : (
                          <p className="text-xs text-muted-foreground italic">
                            Session logged
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-8 text-center text-muted-foreground">
                <CheckCircle2 className="w-8 h-8 mb-2 text-muted-foreground/60" />
                <p className="font-medium text-sm">No sessions logged yet.</p>
              </div>
            )}
          </div>

          {/* Recent Study Materials Widget */}
          <RecentResourcesWidget href="/cr/resources" />
        </div>

        {/* Right Column */}
        <div className="lg:col-span-1 space-y-6">

          {/* Quick Actions */}
          <div className="rounded-xl border border-border/40 shadow-sm p-6 bg-card">
            <h2 className="text-base font-semibold mb-4 font-fira-sans">
              Quick Actions
            </h2>
            <div className="space-y-3">
              {quickActions.map((action) => (
                <Link
                  key={action.href}
                  href={action.href}
                  className="flex items-center gap-3 p-3 rounded-lg bg-muted/10 border border-border/30 hover:bg-muted/30 transition-colors group"
                >
                  <div className="w-9 h-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0 group-hover:bg-primary/20 transition-colors">
                    <action.icon className="w-4.5 h-4.5" />
                  </div>
                  <span className="font-medium text-sm text-foreground flex-1">
                    {action.label}
                  </span>
                  <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
                </Link>
              ))}
            </div>
          </div>

          {/* Enrolled Subjects Summary */}
          <div className="rounded-xl border border-border/40 shadow-sm p-6 bg-card">
            <h2 className="text-base font-semibold mb-4 font-fira-sans">
              Enrolled Subjects
            </h2>
            {enrolledSubjectIds.length > 0 ? (
              <div className="space-y-2">
                {enrolledSubjectIds.length} subject{enrolledSubjectIds.length !== 1 && "s"} linked to your profile
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">
                No enrollments found.
              </p>
            )}
            <Link
              href="/subjects"
              className="text-xs font-semibold text-primary hover:underline mt-3 inline-block"
            >
              View All →
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
