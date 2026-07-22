import { db } from "@/db";
import { weeklyRoutine, classSessions } from "@/db/schema";
import { asc, eq, and, gte, lt } from "drizzle-orm";
import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { CheckCircle2, Circle, Clock, Play, ArrowLeft, ArrowRight, Calendar, FileText } from "lucide-react";
import { formatTime12h } from "@/lib/time";

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

  const nptDateParts = new Intl.DateTimeFormat('en-US', { 
    timeZone: 'Asia/Kathmandu',
    year: 'numeric',
    month: 'numeric',
    day: 'numeric'
  }).formatToParts(new Date());
  
  const currentNptYear = parseInt(nptDateParts.find(p => p.type === 'year')?.value || "", 10);
  const currentNptMonth = parseInt(nptDateParts.find(p => p.type === 'month')?.value || "", 10) - 1;
  const currentNptDay = parseInt(nptDateParts.find(p => p.type === 'day')?.value || "", 10);

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
    const mStr = (d.getMonth() + 1).toString().padStart(2, '0');
    const dStr = d.getDate().toString().padStart(2, '0');
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

  // Generate the 7 days of the week containing the selected date
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
  const currentNptTime = new Intl.DateTimeFormat('en-GB', { 
    timeZone: 'Asia/Kathmandu', 
    hour: '2-digit', 
    minute: '2-digit', 
    hour12: false 
  }).format(new Date());

  // Fetch routine for the day of week
  const dayRoutines = await db.query.weeklyRoutine.findMany({
    where: eq(weeklyRoutine.dayOfWeek, dayOfWeek),
    orderBy: [asc(weeklyRoutine.startTime)],
    with: {
      subject: {
        with: {
          teacher: true
        }
      }
    }
  });

  // Fetch logged sessions for selected date
  const loggedSessions = await db.query.classSessions.findMany({
    where: and(
      gte(classSessions.sessionDate, dayStart),
      lt(classSessions.sessionDate, dayEnd)
    )
  });

  const routinesWithStatus = dayRoutines.map(routine => {
    const session = loggedSessions.find(s => s.routineId === routine.id);
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
      }
    }

    return { ...routine, status, hasSession, sessionId: session?.id };
  });

  const DAYS_OF_WEEK = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  const { getPermissions } = await import("@/lib/auth");
  const permissions = await getPermissions();

  return (
    <div className="flex-1 space-y-6">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Today's Routine</h2>
          <p className="text-muted-foreground mt-1">
            {new Intl.DateTimeFormat('en-US', { dateStyle: 'full' }).format(selectedDate)}
            {selectedDateStr === todayNptStr && <span className="ml-2 bg-primary/10 text-primary text-xs px-2.5 py-0.5 rounded-full font-medium">Today</span>}
          </p>
        </div>

        {/* Previous/Next Day Buttons */}
        <div className="flex items-center gap-2">
          <Link href={`/today?date=${prevDateStr}`} className={buttonVariants({ variant: "outline", size: "sm" })}>
            <ArrowLeft className="h-4 w-4 mr-1" /> Prev
          </Link>
          <Link href={`/today?date=${todayNptStr}`} className={buttonVariants({ variant: "ghost", size: "sm" })} title="Go to Today">
            <Calendar className="h-4 w-4" />
          </Link>
          <Link href={`/today?date=${nextDateStr}`} className={buttonVariants({ variant: "outline", size: "sm" })}>
            Next <ArrowRight className="h-4 w-4 ml-1" />
          </Link>
        </div>
      </div>

      {/* Week Tabs Navigation */}
      <div className="bg-card border rounded-xl p-2 shadow-sm">
        <div className="grid grid-cols-7 gap-1 text-center">
          {weekDays.map((d) => {
            const dStr = formatDateISO(d);
            const isActive = dStr === selectedDateStr;
            const isToday = dStr === todayNptStr;
            const weekdayName = d.toLocaleDateString('en-US', { weekday: 'short' });
            const dayNum = d.getDate();

            return (
              <Link
                key={dStr}
                href={`/today?date=${dStr}`}
                className={`py-2 px-1 rounded-lg flex flex-col items-center transition-colors ${
                  isActive
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "hover:bg-muted text-muted-foreground"
                }`}
              >
                <span className="text-xs uppercase font-semibold">{weekdayName}</span>
                <span className="text-lg font-bold mt-0.5">{dayNum}</span>
                {isToday && !isActive && <span className="w-1.5 h-1.5 bg-primary rounded-full mt-1"></span>}
              </Link>
            );
          })}
        </div>
      </div>

      {/* Class Schedule Cards */}
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {routinesWithStatus.length === 0 ? (
          <div className="col-span-full p-12 text-center text-muted-foreground border rounded-xl bg-card">
            No classes scheduled in the routine for {DAYS_OF_WEEK[dayOfWeek]}.
          </div>
        ) : (
          routinesWithStatus.map(r => (
            <Card key={r.id} className={`flex flex-col rounded-xl overflow-hidden ${r.status === 'ongoing' ? 'border-primary shadow-sm ring-1 ring-primary/20' : ''}`}>
              <CardHeader className="pb-3 bg-muted/20 border-b">
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <div className={`w-2 h-8 rounded-full ${r.status === 'ongoing' ? 'bg-primary animate-pulse' : r.status === 'completed' ? 'bg-emerald-500' : 'bg-muted-foreground/30'}`} />
                      {r.subject.name}
                    </CardTitle>
                    <div className="text-xs font-semibold text-primary mt-1">{r.subject.code}</div>
                  </div>
                </div>
                <div className="text-sm font-medium text-muted-foreground mt-2 flex items-center gap-1.5">
                  <Clock className="w-4 h-4" />
                  {formatTime12h(r.startTime)} - {formatTime12h(r.endTime)} {r.room ? `| Room: ${r.room}` : ""}
                </div>
              </CardHeader>
              <CardContent className="flex-1 pt-4">
                <div className="text-sm space-y-3 text-muted-foreground">
                  {(r.subject.teacher?.name || r.teacherName) && (
                    <div className="flex items-center gap-2 bg-muted/30 px-3 py-2 rounded-md">
                      <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-primary text-xs font-bold">
                        {(r.subject.teacher?.name || r.teacherName || "T").charAt(0)}
                      </div>
                      <span className="font-medium text-foreground">{r.subject.teacher?.name || r.teacherName}</span>
                    </div>
                  )}
                  {r.notes && (
                    <div className="mt-2 bg-muted/50 p-3 rounded-md text-sm italic">
                      "{r.notes}"
                    </div>
                  )}
                </div>
              </CardContent>
              <CardFooter className="pt-0 pb-4 px-4 flex-col gap-2">
                {!permissions.canTakeAttendance ? (
                  r.hasSession ? (
                    <Link href={`/sessions/${r.sessionId}`} className={buttonVariants({ variant: "default", className: "w-full rounded-lg" })}>
                      <FileText className="mr-2 h-4 w-4" /> View Lecture Log
                    </Link>
                  ) : (
                    <div className="w-full text-center text-xs text-muted-foreground font-medium bg-muted/30 py-2.5 rounded-lg border border-dashed">Session not logged yet</div>
                  )
                ) : (
                  r.hasSession ? (
                    <div className="w-full text-center text-sm text-emerald-600 font-semibold flex items-center justify-center gap-1 bg-emerald-50 py-2 rounded-lg border border-emerald-100">
                      <CheckCircle2 className="h-4 w-4" /> Session Logged
                    </div>
                  ) : (
                    <Link 
                      href={`/sessions/new?subjectId=${r.subjectId}&startTime=${r.startTime}&endTime=${r.endTime}&routineId=${r.id}&sessionDate=${selectedDateStr}`}
                      className={buttonVariants({ variant: r.status === 'ongoing' ? 'default' : 'outline', className: "w-full rounded-lg" })}
                    >
                      <Play className="mr-2 h-4 w-4" /> Log Session
                    </Link>
                  )
                )}
              </CardFooter>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}

