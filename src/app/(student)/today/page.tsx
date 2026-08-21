import { db } from "@/db";
import { weeklyRoutine, classSessions } from "@/db/schema";
import { asc, eq, and, gte, lt } from "drizzle-orm";
import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { CheckCircle2, Clock, Play, ArrowLeft, ArrowRight, Calendar, Radio, ListTodo } from "lucide-react";
import { formatTime12h } from "@/lib/time";
import { cn } from "@/lib/utils";
import { DayStripSelector } from "./day-strip-selector";
import { getTodayDeadlines } from "./queries";
import { getCurrentUser, getPermissions } from "@/lib/auth";
import { getNavBadges } from "@/lib/navigation/badges";

export const dynamic = "force-dynamic";

type Props = {
  searchParams: Promise<{
    date?: string;
  }>;
};

export default async function TodayPage({ searchParams }: Props) {
  const { date } = await searchParams;

  // Determine selected date context in Nepal Time (NPT)
  let year = new Date().getFullYear();
  let month = new Date().getMonth();
  let day = new Date().getDate();

  const nptDateParts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Kathmandu",
    year: "numeric",
    month: "numeric",
    day: "numeric",
  }).formatToParts(new Date());

  const currentNptYear = parseInt(nptDateParts.find((p) => p.type === "year")?.value || "", 10);
  const currentNptMonth = parseInt(nptDateParts.find((p) => p.type === "month")?.value || "", 10) - 1;
  const currentNptDay = parseInt(nptDateParts.find((p) => p.type === "day")?.value || "", 10);

  if (date && /^\d{4}-\d{2}-\d{2}$/.test(date)) {
    const parts = date.split("-");
    year = parseInt(parts[0], 10);
    month = parseInt(parts[1], 10) - 1;
    day = parseInt(parts[2], 10);
  } else {
    year = currentNptYear;
    month = currentNptMonth;
    day = currentNptDay;
  }

  const selectedDate = new Date(year, month, day);
  const dayOfWeek = selectedDate.getDay(); // 0 = Sunday, ..., 6 = Saturday

  // Format date helper for YYYY-MM-DD
  const formatDateISO = (d: Date) => {
    const yStr = d.getFullYear();
    const mStr = (d.getMonth() + 1).toString().padStart(2, "0");
    const dStr = d.getDate().toString().padStart(2, "0");
    return `${yStr}-${mStr}-${dStr}`;
  };

  const selectedDateStr = formatDateISO(selectedDate);
  const todayNptStr = formatDateISO(new Date(currentNptYear, currentNptMonth, currentNptDay));

  // Previous and Next day dates
  const prevDate = new Date(selectedDate);
  prevDate.setDate(selectedDate.getDate() - 1);
  const prevDateStr = formatDateISO(prevDate);

  const nextDate = new Date(selectedDate);
  nextDate.setDate(selectedDate.getDate() + 1);
  const nextDateStr = formatDateISO(nextDate);

  // Generate the 7 days of the week containing the selected date (Sunday - Saturday)
  const weekDays = [];
  const sunday = new Date(selectedDate);
  sunday.setDate(selectedDate.getDate() - selectedDate.getDay());
  for (let i = 0; i < 7; i++) {
    const d = new Date(sunday);
    d.setDate(sunday.getDate() + i);
    weekDays.push(d);
  }

  // Date boundaries for database queries
  const dayStart = new Date(`${selectedDateStr}T00:00:00.000Z`);
  const dayEnd = new Date(`${selectedDateStr}T23:59:59.999Z`);

  // Current NPT time (only used if selectedDate is today)
  const currentNptTime = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Kathmandu",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date());

  // Command-center context: session role drives the extra sections.
  const user = await getCurrentUser();
  const role = user?.role ?? "STUDENT";
  const isClassMember = role === "STUDENT" || role === "CR";
  const nptHour = parseInt(currentNptTime.split(":")[0] ?? "0", 10);
  const greeting = nptHour < 12 ? "Good morning" : nptHour < 17 ? "Good afternoon" : "Good evening";
  const firstName = (user?.name ?? "").split(/\s+/)[0];

  const [dayRoutines, loggedSessions, permissions, deadlines, navBadges] = await Promise.all([
    db.query.weeklyRoutine.findMany({
      where: eq(weeklyRoutine.dayOfWeek, dayOfWeek),
      orderBy: [asc(weeklyRoutine.startTime)],
      with: {
        subject: {
          with: { teacher: true },
        },
      },
    }),
    db.query.classSessions.findMany({
      where: and(
        gte(classSessions.sessionDate, dayStart),
        lt(classSessions.sessionDate, dayEnd)
      ),
    }),
    getPermissions(),
    getTodayDeadlines(),
    getNavBadges(),
  ]);

  const routinesWithStatus = dayRoutines.map((routine) => {
    const session = loggedSessions.find((s) => s.routineId === routine.id);
    const hasSession = !!session;
    let status: "upcoming" | "ongoing" | "completed" = "upcoming";

    if (hasSession) {
      status = "completed";
    } else if (selectedDateStr < todayNptStr) {
      status = "completed"; // Past day, not logged
    } else if (selectedDateStr > todayNptStr) {
      status = "upcoming"; // Future day
    } else {
      // Selected day is today NPT
      if (currentNptTime > routine.endTime) {
        status = "completed";
      } else if (currentNptTime >= routine.startTime && currentNptTime <= routine.endTime) {
        status = "ongoing";
      } else {
        status = "upcoming";
      }
    }

    return { ...routine, status, hasSession, sessionId: session?.id };
  });

  // Current-or-next class: only meaningful for the actual current day.
  const currentOrNext =
    selectedDateStr === todayNptStr
      ? (routinesWithStatus.find((r) => r.status === "ongoing") ??
        routinesWithStatus.find((r) => r.status === "upcoming"))
      : undefined;

  // Precompute deadline rows outside JSX (keeps impure time reads out of map).
  const now = new Date();
  const nowMs = now.getTime();
  const deadlineRows = deadlines.map((item) => ({
    ...item,
    dueSoon: item.dueDate.getTime() - nowMs < 2 * 24 * 60 * 60 * 1000,
    dueLabel: new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
      timeZone: "Asia/Kathmandu",
    }).format(item.dueDate),
  }));

  const DAYS_OF_WEEK = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

  return (
    <div className="flex-1 space-y-8 max-w-5xl">
      {/* Command Center Header */}
      <div>
        <h1 className="text-3xl md:text-4xl font-bold font-fira-sans tracking-tight text-foreground">
          Today
        </h1>
        <p data-testid="today-greeting" className="text-lg text-muted-foreground mt-1 font-medium">
          {greeting}, {firstName}!
        </p>
        <p className="text-sm text-muted-foreground mt-0.5">
          {new Intl.DateTimeFormat("en-US", { dateStyle: "full" }).format(selectedDate)}
          {selectedDateStr === todayNptStr && (
            <span className="ml-2 text-primary font-semibold inline-flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-primary animate-pulse" /> Today
            </span>
          )}
        </p>
      </div>

      {/* Current / Next Class Card */}
      {currentOrNext && (
        <div
          data-testid="current-next-class"
          className={cn(
            "relative rounded-2xl border p-5 flex flex-col md:flex-row md:items-center gap-4 transition-all",
            currentOrNext.status === "ongoing"
              ? "bg-primary/5 border-primary/40 shadow-md ring-1 ring-primary/20"
              : "bg-card border-border/40"
          )}
        >
          {currentOrNext.status === "ongoing" && (
            <div className="absolute left-0 top-0 bottom-0 w-1.5 rounded-l-2xl bg-primary" />
          )}
          <div className="flex-1 space-y-1.5">
            <div className="flex items-center gap-2 flex-wrap">
              <span
                data-testid="class-status-chip"
                className={cn(
                  "inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider",
                  currentOrNext.status === "ongoing"
                    ? "bg-primary text-primary-foreground animate-pulse"
                    : "bg-secondary text-secondary-foreground border border-secondary-foreground/10"
                )}
              >
                {currentOrNext.status === "ongoing" && <Radio className="w-3 h-3 animate-spin" />}
                {currentOrNext.status}
              </span>
              <h2 className="font-bold text-lg text-foreground leading-snug">{currentOrNext.subject.name}</h2>
              <span className="text-xs font-bold text-foreground px-2 py-0.5 bg-muted rounded-md tabular-nums border border-border/50">
                {currentOrNext.subject.code}
              </span>
            </div>
            <p className="text-xs text-muted-foreground flex items-center gap-2 font-medium">
              <Clock className="w-3.5 h-3.5 opacity-70" />
              {formatTime12h(currentOrNext.startTime)} – {formatTime12h(currentOrNext.endTime)}
              {currentOrNext.room && <>· Room {currentOrNext.room}</>}
            </p>
          </div>
          {!currentOrNext.hasSession && permissions.canCreateSessions && role !== "STUDENT" && (
            <Link
              href={`/sessions/new?subjectId=${currentOrNext.subjectId}&startTime=${currentOrNext.startTime}&endTime=${currentOrNext.endTime}&routineId=${currentOrNext.id}&sessionDate=${todayNptStr}`}
              className={buttonVariants({ variant: currentOrNext.status === "ongoing" ? "default" : "secondary", size: "sm", className: "shrink-0" })}
            >
              <Play className="mr-1.5 h-3.5 w-3.5" /> Log Session
            </Link>
          )}
        </div>
      )}

      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h2 className="text-2xl md:text-3xl font-bold font-fira-sans tracking-tight text-foreground">
            Today&apos;s Schedule
          </h2>
          <p className="text-muted-foreground mt-1 text-sm">
            {new Intl.DateTimeFormat("en-US", { dateStyle: "full" }).format(selectedDate)}
            {selectedDateStr === todayNptStr && (
              <span className="ml-2 text-primary font-semibold inline-flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-primary animate-pulse" /> Today
              </span>
            )}
          </p>
        </div>

        {/* Previous/Next Day Buttons */}
        <div className="flex items-center gap-2">
          <Link
            href={`/today?date=${prevDateStr}`}
            className={buttonVariants({ variant: "ghost", size: "sm", className: "cursor-pointer" })}
          >
            <ArrowLeft className="h-4 w-4 mr-1" /> Prev
          </Link>
          <Link
            href={`/today?date=${todayNptStr}`}
            className={buttonVariants({ variant: "ghost", size: "sm", className: "cursor-pointer" })}
            title="Go to Today"
          >
            <Calendar className="h-4 w-4" />
          </Link>
          <Link
            href={`/today?date=${nextDateStr}`}
            className={buttonVariants({ variant: "ghost", size: "sm", className: "cursor-pointer" })}
          >
            Next <ArrowRight className="h-4 w-4 ml-1" />
          </Link>
        </div>
      </div>

      {/* Week Tabs Navigation - 7-day Strip */}
      <DayStripSelector
        days={weekDays.map((d) => {
          const dStr = formatDateISO(d);
          return {
            dateStr: dStr,
            dayNum: d.getDate(),
            weekdayName: d.toLocaleDateString("en-US", { weekday: "short" }),
            isActive: dStr === selectedDateStr,
            isToday: dStr === todayNptStr,
          };
        })}
      />

      {/* Class Schedule Timeline Cards */}
      <div className="space-y-3">
        {routinesWithStatus.length === 0 ? (
          <div data-testid="timeline-session-card" className="py-16 text-center text-sm text-muted-foreground rounded-xl border border-dashed bg-muted/5">
            No classes scheduled for {DAYS_OF_WEEK[dayOfWeek]}.
          </div>
        ) : (
          routinesWithStatus.map((r) => {
            const isOngoing = r.status === "ongoing";
            const isCompleted = r.status === "completed";
            const isUpcoming = r.status === "upcoming";

            return (
              <div
                key={r.id}
                data-testid="timeline-session-card"
                className={cn(
                  "group relative flex flex-col md:flex-row md:items-center gap-4 rounded-xl border p-4 transition-all",
                  isOngoing
                    ? "bg-primary/5 border-primary/40 shadow-md ring-1 ring-primary/20"
                    : isCompleted
                    ? "bg-muted/15 border-border/30 opacity-75 hover:opacity-100"
                    : "bg-card border-border/40 hover:border-border"
                )}
              >
                {isOngoing && (
                  <div className="absolute left-0 top-0 bottom-0 w-1.5 rounded-l-xl bg-primary" />
                )}

                {/* Time & Subject Column */}
                <div className="flex-1 space-y-1.5 min-w-[220px]">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-bold text-base text-foreground leading-snug">
                      {r.subject.name}
                    </h3>
                    <span className="text-xs font-bold text-foreground px-2.5 py-0.5 bg-muted rounded-md tabular-nums border border-border/50">
                      {r.subject.code}
                    </span>

                    {/* Explicit Status Badges */}
                    {isOngoing && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-primary text-primary-foreground text-xs font-bold tracking-wider animate-pulse uppercase">
                        <Radio className="w-3 h-3 animate-spin" /> ONGOING
                      </span>
                    )}
                    {isCompleted && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-muted text-muted-foreground text-xs font-bold uppercase border border-border/40">
                        <CheckCircle2 className="w-3 h-3 text-emerald-500" /> COMPLETED
                      </span>
                    )}
                    {isUpcoming && (
                      <span className="inline-flex items-center px-2.5 py-1 rounded-full bg-secondary text-secondary-foreground text-xs font-bold uppercase border border-secondary-foreground/10">
                        UPCOMING
                      </span>
                    )}
                  </div>

                  <div className="text-xs text-muted-foreground flex items-center gap-2 font-medium">
                    <span className="flex items-center gap-1 tabular-nums">
                      <Clock className="w-3.5 h-3.5 text-muted-foreground/70" />
                      {formatTime12h(r.startTime)} - {formatTime12h(r.endTime)}
                    </span>
                    {r.room && (
                      <>
                        <span className="opacity-40">•</span>
                        <span>Room {r.room}</span>
                      </>
                    )}
                  </div>
                </div>

                {/* Faculty & Notes */}
                <div className="flex-1 space-y-1 text-xs text-muted-foreground">
                  {(r.subject.teacher?.name || r.teacherName) && (
                    <div className="flex items-center gap-2 font-medium text-foreground">
                      <div className="w-7 h-7 rounded-full bg-secondary flex items-center justify-center text-xs font-bold text-secondary-foreground border border-secondary-foreground/10 shrink-0">
                        {(r.subject.teacher?.name || r.teacherName || "T").charAt(0)}
                      </div>
                      <span>{r.subject.teacher?.name || r.teacherName}</span>
                    </div>
                  )}
                  {r.notes && (
                    <div className="italic text-muted-foreground opacity-90 line-clamp-1">
                      {r.notes}
                    </div>
                  )}
                </div>

                {/* Action / Logging Column */}
                <div className="shrink-0 flex items-center justify-start md:justify-end w-full md:w-32 pt-2 md:pt-0 border-t md:border-t-0 md:border-l md:pl-4 mt-2 md:mt-0">
                  {!permissions.canTakeAttendance ? (
                    r.hasSession ? (
                      <Link
                        href={`/sessions/${r.sessionId}`}
                        className={buttonVariants({
                          variant: "ghost",
                          size: "sm",
                          className: "w-full text-muted-foreground hover:text-foreground",
                        })}
                      >
                        View Log
                      </Link>
                    ) : (
                      <span className="text-xs text-muted-foreground italic w-full text-center">
                        {isCompleted ? "Completed" : "Scheduled"}
                      </span>
                    )
                  ) : (
                    r.hasSession ? (
                      <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 flex items-center justify-center w-full gap-1.5">
                        <CheckCircle2 className="h-4 w-4" /> Logged
                      </span>
                    ) : (
                      <Link
                        href={`/sessions/new?subjectId=${r.subjectId}&startTime=${r.startTime}&endTime=${r.endTime}&routineId=${r.id}&sessionDate=${selectedDateStr}`}
                        className={buttonVariants({
                          variant: isOngoing ? "default" : "secondary",
                          size: "sm",
                          className: "w-full text-xs font-semibold",
                        })}
                      >
                        <Play className="mr-1.5 h-3.5 w-3.5" /> Log Session
                      </Link>
                    )
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Deadlines (class members only) */}
      {isClassMember && deadlines.length > 0 && (
        <section data-testid="deadlines-card" className="rounded-2xl border border-border/40 bg-card p-5">
          <div className="flex items-center justify-between gap-3">
            <h2 className="font-bold text-base text-foreground inline-flex items-center gap-2">
              <ListTodo className="w-4 h-4 text-primary" /> Deadlines
            </h2>
            <Link href="/homework" className="text-sm font-semibold text-primary hover:underline">
              View All →
            </Link>
          </div>
          <ul className="mt-3 space-y-2">
            {deadlineRows.map((item) => (
              <li
                key={item.id}
                className="flex items-center justify-between gap-3 rounded-xl border border-border/40 px-4 py-2.5 bg-background"
              >
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-foreground truncate">{item.title}</p>
                  <p className="text-xs text-muted-foreground truncate">{item.subjectName}</p>
                </div>
                <span
                  className={cn(
                    "shrink-0 text-xs font-bold px-2.5 py-1 rounded-full",
                    item.dueSoon
                      ? "bg-amber-500/15 text-amber-700 dark:text-amber-400"
                      : "bg-muted text-muted-foreground"
                  )}
                >
                  Due {item.dueLabel}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Needs your attention (teacher) */}
      {role === "TEACHER" && (navBadges.pendingGrading ?? 0) > 0 && (
        <section data-testid="attention-card" className="rounded-2xl border border-primary/30 bg-primary/5 p-5">
          <h2 className="font-bold text-base text-foreground">Needs your attention</h2>
          <Link
            href="/teacher/grading"
            className="mt-3 flex items-center justify-between gap-3 rounded-xl border border-border/40 bg-card px-4 py-3 text-sm font-semibold text-foreground hover:border-primary/40 transition-colors"
          >
            <span>Grade {(navBadges.pendingGrading ?? 0)} pending submission{(navBadges.pendingGrading ?? 0) === 1 ? "" : "s"}</span>
            <span aria-hidden>→</span>
          </Link>
        </section>
      )}
    </div>
  );
}
